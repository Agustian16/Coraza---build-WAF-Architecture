package config

import (
	"os"
	"strconv"
)

type Config struct {
	// HTTP REST API (served to the Corazium web UI)
	HTTPAddr string
	// gRPC (mTLS in prod; plaintext behind the docker network by default)
	GRPCAddr string
	// PostgreSQL (structured state). Empty => in-memory seeded state.
	DatabaseURL string
	// ClickHouse (audit logs). Empty => seeded sample logs.
	ClickHouseAddr string
	// Redis (cache, rate-limit counters, Asynq broker). Empty => disabled.
	RedisAddr string
	// CORS origin of the web UI
	WebOrigin string
	// Demo mode keeps everything in memory (docker-compose default off)
	SeedDemo bool
}

func FromEnv() Config {
	return Config{
		HTTPAddr:       env("HTTP_ADDR", ":8080"),
		GRPCAddr:       env("GRPC_ADDR", ":9090"),
		DatabaseURL:    env("DATABASE_URL", ""),
		ClickHouseAddr: env("CLICKHOUSE_ADDR", ""),
		RedisAddr:      env("REDIS_ADDR", ""),
		WebOrigin:      env("WEB_ORIGIN", "http://localhost:3000"),
		SeedDemo:       envBool("SEED_DEMO", true),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envBool(k string, def bool) bool {
	if v := os.Getenv(k); v != "" {
		b, _ := strconv.ParseBool(v)
		return b
	}
	return def
}
