# Corazium — WAAP Control Plane

> **Web Application and API Protection** platform built on the OWASP Coraza WAF engine.
> Corazium evolves the traditional WAF into a full WAAP stack — centralized management,
> real-time attack monitoring, and zero-downtime config push to edge fleets.

---

## Overview

Corazium covers the four WAAP pillars (per Gartner's WAAP definition) in a single platform:

| Pillar | What it does | Where |
|---|---|---|
| **Signature WAF** | Payload inspection via SecLang rules & OWASP CRS v4 — SQLi, XSS, LFI, RCE, protocol attacks | `/rules`, `/logs`, `/exceptions` |
| **API Security** | OpenAPI schema validation (positive security model), JWT inspection, sensitive-data exposure detection & masking | `/api-security` |
| **Advanced Bot Management** | Credential stuffing & scraping defense, TLS/JA3 fingerprinting, JS challenge & CAPTCHA, per-category enforcement | `/anti-bot` |
| **L7 DDoS Protection** | HTTP/HTTPS flood defense via rate limiting thresholds, anomaly scoring, auto mitigation modes (BLOCK / TARPIT / CAPTCHA) | `/rate-limiting` |

Console capabilities: real-time attack dashboard, fleet management & node health, geolocation
traffic analysis (2D world map), security posture scoring, Allow & Deny event explorer with
one-click exception generation, immutable audit trail, and declarative GitOps policy export
(`coraza-policy.yaml`).

---

## Architecture

```
                              +---------------------------+
                              |   Corazium Web UI         |
                              |   Next.js 16 / Tailwind   |
                              +-------------+-------------+
                                            | REST /api/v1
                                            v
                              +---------------------------+
                              |   Go Control Plane (Gin)  |
                              +-----+---------------+-----+
                                    |               |
                 gRPC NodeControl   |               |  SQL / batch
        (bidirectional stream,      |               +---------------+----------------+
         mTLS in production)        v                               v                v
                  +---------------------------+        +-------------+   +-------------+   +---------+
                  |  Edge Nodes (Caddy /      |        | PostgreSQL  |   | ClickHouse |   |  Redis  |
                  |  Envoy / SPOA + Coraza)   |        |     16      |   | (audit     |   | cache + |
                  |  - Coraza WAF engine      |        | app state   |   |  logs)     |   | Asynq   |
                  |  - OpenAPI validator      |        +-------------+   +-------------+   +---------+
                  |  - Bot / JA3 fingerprint  |
                  +---------------------------+
```

**Components**

| Component | Tech | Responsibility |
|---|---|---|
| `frontend/` | Next.js 16, React 19, Tailwind v4, Recharts, d3-geo | Corazium Console (dark/light WAAP dashboard) |
| `backend/` | Go 1.24, Gin, gRPC, pgx, clickhouse-go, go-redis, Asynq | Control plane: REST API, node config streaming, policy engine |
| PostgreSQL 16 | Relational | Sites, nodes, custom rules, exceptions, IP lists, rate-limit rules, audit trail |
| ClickHouse | Column-oriented TSDB | High-volume WAF audit logs (10k logs/s ingestion target) |
| Redis 7 | Cache / broker | Rate-limit counters, sessions, Asynq task queue |
| Edge Node | Caddy / Envoy / SPOA + Coraza agent | Data plane: traffic inspection & forwarding, hot-reload of SecLang bundles |

---

## Communication Flow

```
[ Edge Node (Caddy/Envoy + Coraza Agent) ]
        │
        ├── (1) mTLS gRPC Stream ──► [ Go Control Plane (Gin/Fiber) ] ──► [ PostgreSQL ]
        │   Register → StreamConfigs (push <1s + ack) → Heartbeat (health metrics)
        │
        └── (2) Batch Log Push ────► [ ClickHouse Cluster ] ◄── (3) Query Analytics from UI
```

1. **Config sync (NFR-1.2):** nodes register over mTLS gRPC, keep a bidirectional stream
   open, and receive new SecLang bundles + policy (CRS toggles, paranoia level, thresholds)
   in under a second. Nodes ack applied versions; the fleet view shows `IN_SYNC` /
   `PENDING_UPDATE` per node. If the control plane is unreachable, nodes keep running on
   their last cached config (fail-safe, NFR-3.1).
2. **Audit ingestion (NFR-1.3):** nodes batch-push WAF transaction logs to ClickHouse
   (partitioned monthly, ordered for fast filtering by site/action/IP).
3. **Analytics:** the console queries the control plane, which reads ClickHouse for log
   exploration and aggregates KPIs (RPS, block ratio, latency overhead <2 ms target).

---

## Repository Structure

```
├── docker-compose.yml          # Full stack — every component as its own image
├── frontend/                   # Corazium Console (Next.js)
│   ├── Dockerfile              # standalone output, non-root runtime image
│   └── src/
│       ├── app/(console)/      # dashboard, fleet, rules, api-security,
│       │                       # access-control, rate-limiting, anti-bot,
│       │                       # logs, exceptions, settings
│       └── lib/                # api client (REST) + typed mock fallback
└── backend/                    # Corazium Control Plane (Go)
    ├── Dockerfile
    ├── cmd/controlplane/       # main: REST + gRPC + jobs wiring
    ├── cmd/nodetest/           # edge-node simulator (verifies the gRPC flow)
    ├── internal/
    │   ├── api/                # Gin REST handlers (/api/v1/*)
    │   ├── grpcsrv/            # NodeControl service (Register/StreamConfigs/Heartbeat)
    │   ├── store/              # state: in-memory seed + Postgres/ClickHouse/Redis
    │   ├── config/             # env configuration
    │   └── jobs/               # Asynq periodic tasks (feeds, log flush, health)
    ├── proto/v1/node.proto     # gRPC contract
    ├── gen/v1/                 # generated pb.go / grpc.pb.go
    └── migrations/             # 001_init.sql (Postgres), clickhouse_schema.sql
```

---

## Deployment

### Full stack (Docker)

```bash
docker compose up --build
```

Every component ships as its own image and can be scaled independently:

| Service | Port | Description |
|---|---|---|
| `frontend` | 3000 | Corazium Console UI |
| `controlplane` | 8080 / 9090 | REST API / gRPC NodeControl |
| `postgres` | 5432 | App state (auto-migrated on boot) |
| `clickhouse` | 8123 / 9000 | Audit logs (schema auto-initialized) |
| `redis` | 6379 | Cache, rate-limit counters, task queue |

The UI is wired to the control plane via `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`
(set automatically in compose). Open **http://localhost:3000**.

### Development mode (per component)

```bash
# Frontend (falls back to seeded demo data when the API is unreachable)
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 npm run dev

# Control plane (works standalone with in-memory state; DBs optional)
cd backend
go run ./cmd/controlplane
```

| Env var | Default | Purpose |
|---|---|---|
| `HTTP_ADDR` | `:8080` | REST API listen address |
| `GRPC_ADDR` | `:9090` | gRPC NodeControl listen address |
| `DATABASE_URL` | — | Postgres DSN; empty ⇒ in-memory state |
| `CLICKHOUSE_ADDR` | — | ClickHouse addr; empty ⇒ in-memory logs |
| `REDIS_ADDR` | — | Redis addr; empty ⇒ queue disabled |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS origin for the UI |
| `SEED_DEMO` | `true` | Seed demo dataset on boot |

### Verify the gRPC node flow

```bash
cd backend
go run ./cmd/nodetest
# REGISTER → CONFIG push → ACK → HEARTBEAT (stale version ⇒ re-sync signal)
```

### Production notes

- **mTLS:** terminate gRPC with x509 mutual TLS; automate issuance with cert-manager or
  Smallstep (`step ca`). The compose default runs plaintext inside the private network.
- **Observability:** ship metrics/traces from nodes and the control plane via an
  OpenTelemetry Collector.
- **Threat intel:** periodic IP reputation feed imports (FireHOL, Abuse.ch, Spamhaus)
  run through the Asynq scheduler when Redis is configured.

---

## REST API Summary (`/api/v1`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/dashboard/overview` | GET | KPIs, posture score & checks |
| `/nodes` | GET/POST | Fleet list, node registration |
| `/sites`, `/sites/:id` | GET/PATCH | Site policy (paranoia level, thresholds) |
| `/crs/categories`, `/:id` | GET/PATCH | OWASP CRS category toggles |
| `/rules`, `/rules/:id`, `/rules/sandbox` | CRUD/POST | Custom SecLang rules + FTW-style payload testing |
| `/logs`, `/logs/:txid`, `/logs/ingest` | GET/POST | Audit log explorer & node ingestion |
| `/exceptions` | CRUD | False-positive suppressions (`SecRuleUpdateTargetById`) |
| `/access-events`, `/ip-list` | GET/POST/DELETE | Allow & Deny events, central IP lists |
| `/rate-limits/:id` | PATCH | L7 DDoS rule toggles/actions |
| `/bots/:id` | PATCH | Bot category enforcement (ALLOW/LOG/CHALLENGE/BLOCK) |
| `/api-security/*` | GET | OpenAPI conformance, JWT stats, data exposure |
| `/geo` | GET | Per-country traffic/blocked stats |
| `/policy/export` | GET | Declarative `coraza-policy.yaml` (GitOps) |

**Verified:** all REST endpoints return 200/201 in smoke tests; the gRPC flow
(Register → ConfigStream → Ack → Heartbeat) is exercised by `cmd/nodetest`.

---

## License

Open source — built on [OWASP Coraza](https://coraza.io).
