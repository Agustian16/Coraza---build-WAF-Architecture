-- Corazium policy extensions (feeds + CRS category state)
CREATE TABLE IF NOT EXISTS threat_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    url TEXT NOT NULL,
    interval VARCHAR(10) DEFAULT '6h',
    status VARCHAR(10) DEFAULT 'PENDING' CHECK (status IN ('SYNCED', 'PENDING', 'ERROR')),
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crs_categories (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rule_prefix VARCHAR(10) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    rule_count INT DEFAULT 0
);
