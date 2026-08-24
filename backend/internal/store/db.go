package store

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ConnectPostgres opens the pool and applies migrations. Returns nil when
// DATABASE_URL is not set (in-memory mode).
func ConnectPostgres(ctx context.Context, url, migrationsDir string) *pgxpool.Pool {
	if url == "" {
		log.Println("[store] DATABASE_URL not set — running with in-memory state")
		return nil
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		log.Printf("[store] postgres connect failed: %v (falling back to memory)", err)
		return nil
	}
	if err := pool.Ping(ctx); err != nil {
		log.Printf("[store] postgres ping failed: %v (falling back to memory)", err)
		pool.Close()
		return nil
	}
	if err := runMigrations(ctx, pool, migrationsDir); err != nil {
		log.Printf("[store] migrations failed: %v", err)
	}
	log.Println("[store] postgres connected")
	return pool
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	sql, err := migrationSQL(dir)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, sql)
	return err
}

// ConnectClickHouse opens the audit-log connection. Returns nil when unset.
// Uses database/sql + clickhouse-go driver.
func ConnectClickHouse(ctx context.Context, addr string) interface{} {
	if addr == "" {
		log.Println("[store] CLICKHOUSE_ADDR not set — audit logs served from memory")
		return nil
	}
	// Wired in clickhouse.go via database/sql; kept loose here so the binary
	// runs without ClickHouse reachable.
	return connectClickHouse(ctx, addr)
}

// ConnectRedis opens the Redis client (cache, rate-limit counters, Asynq).
func ConnectRedis(ctx context.Context, addr string) *redis.Client {
	if addr == "" {
		log.Println("[store] REDIS_ADDR not set — cache/queue disabled")
		return nil
	}
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[store] redis ping failed: %v (disabled)", err)
		return nil
	}
	log.Println("[store] redis connected")
	return rdb
}
