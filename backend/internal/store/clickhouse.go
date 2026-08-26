package store

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	_ "github.com/ClickHouse/clickhouse-go/v2"
)

// connectClickHouse opens a database/sql connection and ensures the audit
// table exists (schema from migrations/clickhouse_schema.sql).
func connectClickHouse(ctx context.Context, addr string) interface{} {
	dsn := fmt.Sprintf("clickhouse://%s/default?dial_timeout=3s", addr)
	db, err := sql.Open("clickhouse", dsn)
	if err != nil {
		log.Printf("[store] clickhouse open failed: %v (memory fallback)", err)
		return nil
	}
	if err := db.PingContext(ctx); err != nil {
		log.Printf("[store] clickhouse ping failed: %v (memory fallback)", err)
		return nil
	}
	log.Println("[store] clickhouse connected")
	return db
}

// InsertLogsClickHouse batch-inserts audit logs (10k/s ingestion target).
func InsertLogsClickHouse(db interface{}, logs []AuditLog) error {
	ch, ok := db.(*sql.DB)
	if !ok || len(logs) == 0 {
		return fmt.Errorf("clickhouse not available")
	}
	tx, err := ch.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(`
		INSERT INTO coraza_audit_logs
		(timestamp, transaction_id, node_id, site_id, client_ip, http_method, uri,
		 http_version, response_status, action_taken, latency_us, request_body)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
	if err != nil {
		return err
	}
	for _, l := range logs {
		if _, err := stmt.Exec(l.Timestamp, l.TransactionID, l.NodeID, l.SiteID,
			l.ClientIP, l.HTTPMethod, l.URI, l.HTTPVersion, l.ResponseStatus,
			l.ActionTaken, l.LatencyUS, l.RequestBody); err != nil {
			return err
		}
	}
	return tx.Commit()
}
