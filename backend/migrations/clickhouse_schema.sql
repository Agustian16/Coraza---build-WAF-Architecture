-- Corazium audit logs — ClickHouse (PRD §6.2)
CREATE TABLE IF NOT EXISTS coraza_audit_logs
(
    timestamp        DateTime64(3, 'UTC'),
    transaction_id   String,
    node_id          String,
    site_id          String,
    client_ip        String,
    http_method      LowCardinality(String),
    uri              String,
    http_version     String,
    response_status  UInt16,
    action_taken     LowCardinality(String),
    latency_us       UInt64,
    request_body     String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, site_id, action_taken, client_ip);
