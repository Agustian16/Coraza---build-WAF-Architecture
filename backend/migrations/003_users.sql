-- Corazium users & RBAC (FR-5.1)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL DEFAULT '',
    role VARCHAR(30) NOT NULL DEFAULT 'SecOps Analyst'
        CHECK (role IN ('Admin', 'SecOps Analyst', 'Auditor')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
