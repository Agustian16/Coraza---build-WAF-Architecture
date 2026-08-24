-- Corazium Control Plane — PostgreSQL 16 schema (PRD §6.1)
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    paranoia_level INT DEFAULT 1 CHECK (paranoia_level BETWEEN 1 AND 4),
    inbound_threshold INT DEFAULT 5,
    outbound_threshold INT DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status VARCHAR(20) DEFAULT 'OFFLINE',
    current_config_version VARCHAR(64),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id INT NOT NULL UNIQUE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    seclang_raw TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    rule_id INT NOT NULL,
    path_pattern VARCHAR(255) NOT NULL,
    parameter_name VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidr VARCHAR(64) NOT NULL,
    list VARCHAR(10) NOT NULL CHECK (list IN ('allow', 'block')),
    source VARCHAR(100) DEFAULT 'manual',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    endpoint VARCHAR(255) NOT NULL,
    threshold INT NOT NULL,
    window_sec INT NOT NULL DEFAULT 60,
    action VARCHAR(10) NOT NULL DEFAULT 'BLOCK' CHECK (action IN ('BLOCK', 'TARPIT', 'CAPTCHA')),
    enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bot_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    ua_pattern TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    action VARCHAR(10) NOT NULL DEFAULT 'LOG' CHECK (action IN ('ALLOW', 'LOG', 'CHALLENGE', 'BLOCK')),
    hits_24h BIGINT DEFAULT 0
);

-- Immutable audit trail of control-plane mutations (FR-5.2)
CREATE TABLE IF NOT EXISTS audit_trail (
    id BIGSERIAL PRIMARY KEY,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(255),
    source_ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
