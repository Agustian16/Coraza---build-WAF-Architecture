package main

import (
	"context"
	"log"
	"net"
	"time"

	"corazium/controlplane/gen/v1"
	"corazium/controlplane/internal/api"
	"corazium/controlplane/internal/config"
	"corazium/controlplane/internal/grpcsrv"
	"corazium/controlplane/internal/jobs"
	"corazium/controlplane/internal/store"

	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
)

func main() {
	cfg := config.FromEnv()
	ctx := context.Background()

	st := store.New()
	if cfg.SeedDemo {
		store.SeedDemo(st)
	}

	// Optional infra — all degrade gracefully to in-memory.
	st.Pool = store.ConnectPostgres(ctx, cfg.DatabaseURL, "migrations")
	st.ClickHouse = store.ConnectClickHouse(ctx, cfg.ClickHouseAddr)
	st.Redis = store.ConnectRedis(ctx, cfg.RedisAddr)
	st.LoadFromPostgres(ctx)

	// REST API for the web UI. `notify` wakes gRPC config streams after
	// policy mutations so edge nodes hot-reload within the 1s target.
	grpcSrv := grpcsrv.New(st)
	go func() {
		r := api.New(st, cfg.WebOrigin, grpcSrv.NotifyConfigUpdate)
		log.Printf("[http] REST API listening on %s", cfg.HTTPAddr)
		if err := r.Run(cfg.HTTPAddr); err != nil {
			log.Fatalf("[http] %v", err)
		}
	}()

	// gRPC control stream for edge nodes
	lis, err := net.Listen("tcp", cfg.GRPCAddr)
	if err != nil {
		log.Fatalf("[grpc] %v", err)
	}
	gs := grpc.NewServer(
		grpc.KeepaliveParams(keepalive.ServerParameters{
			Time:    15 * time.Second,
			Timeout: 5 * time.Second,
		}),
	)
	v1.RegisterNodeControlServer(gs, grpcSrv)
	reflection.Register(gs)
	log.Printf("[grpc] NodeControl listening on %s", cfg.GRPCAddr)

	// Background jobs (Asynq when Redis present, in-process timers otherwise)
	jobs.EnqueuePeriodic(ctx, jobs.NewClient(cfg.RedisAddr), cfg.RedisAddr)

	if err := gs.Serve(lis); err != nil {
		log.Fatalf("[grpc] %v", err)
	}
}
