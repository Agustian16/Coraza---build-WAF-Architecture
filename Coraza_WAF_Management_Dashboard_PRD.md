# Product Requirement Document (PRD)
## Project: Coraza Management Dashboard & Control Plane (Coraza Console)

---

| Metadata | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Draft / Proposed |
| **Author** | Security Engineering & SecOps Team |
| **Target Audience** | Core Developers, SecOps Team, Infrastructure/DevOps Engineers |
| **Core Engine** | OWASP Coraza WAF Engine (v3.x+) |

---

### 1. Executive Summary & Vision

#### 1.1 Problem Statement
OWASP Coraza adalah *enterprise-grade*, *open-source Web Application Firewall* (WAF) engine berbasis Go yang sangat fleksibel dan dapat diintegrasikan dengan berbagai reverse proxy (Caddy, Envoy, NGINX via Coraza-SPOA). Namun, Coraza tidak memiliki *out-of-the-box* Central Management Console / UI. Mengelola aturan SecLang, *false positive exclusions*, dan *audit logs* di banyak node Coraza secara manual melalui *config files* sangat rentan kesalahan, lambat, dan tidak memiliki visibilitas terpusat.

#### 1.2 Product Vision
Membangun **Coraza Console** — platform *Control Plane* dan *Observability Hub* terpusat, modern, dan scalable berbasis web. Coraza Console memungkinkan tim SecOps dan DevOps untuk:
- Mengelola kebijakan keamanan (*security policies*) dan *OWASP Core Rule Set* (CRS v4) secara terpusat.
- Melakukan pembaruan aturan secara *real-time* ke ribuan *edge node* tanpa *downtime* (*zero-downtime hot-reload* via gRPC).
- Mendapatkan visibilitas *real-time attack monitoring* dan *forensic logging* dengan *high-throughput time-series analytics* berbasis ClickHouse.
- Menyediakan alur *False Positive Resolution* dalam satu klik (*one-click exclusion*).

---

### 2. High-Level Architecture

```
                                +---------------------------+
                                |  Next.js / Shadcn UI      |
                                |  (Coraza Console Web UI)  |
                                +-------------+-------------+
                                              | REST / WebSockets
                                              v
                                +---------------------------+
                                |  Go Control Plane API     |
                                |  (Core Backend Engine)    |
                                +-----+---------------+-----+
                                      |               |
               +----------------------+               +-----------------------+
               | gRPC Config Stream                           | Audit Stream (gRPC/HTTP)
               v                                              v
  +--------------------------+                   +--------------------------+
  |  Coraza Edge Node 1      |                   |  ClickHouse Cluster      |
  |  (Caddy / Envoy / SPOA)  |                   |  (High-Performance Logs) |
  +--------------------------+                   +--------------------------+
               |                                              ^
               | gRPC Config Stream                           | Audit Stream
               v                                              |
  +--------------------------+                                |
  |  Coraza Edge Node N      |--------------------------------+
  |  (Caddy / Envoy / SPOA)  |
  +--------------------------+
```

#### 2.1 Component Description
1. **Frontend (Coraza UI):** Single Page Application berbasis Next.js 14, React, Tailwind CSS, dan Shadcn UI.
2. **Backend Control Plane:** Microservice berbasis Go (Fiber/Gin) yang menyediakan REST API untuk UI, mengelola state database, serta menyediakan gRPC Server untuk sinkronisasi agen/node.
3. **Database Stack:**
   - **PostgreSQL 16:** Menyimpan data terstruktur (User management, Roles/RBAC, Site/VHost configurations, SecLang Rules, Exception lists, Audit Trails).
   - **ClickHouse:** Menyimpan high-volume WAF Audit Logs (HTTP request headers, response codes, triggered Rule IDs, URI parameters, client IPs).
4. **Agent Integration (Coraza Enforcer Node):** Runtime Agent (Go plugin/sidecar) yang ditempatkan bersama Coraza Engine di Caddy/Envoy/SPOA untuk menerima pembaruan aturan via gRPC secara stream.

---

### 3. User Personas & Target Roles

| Persona | Role | Primary Goals | Key Pain Points |
| :--- | :--- | :--- | :--- |
| **Ahmad (SecOps Analyst)** | Security Operations | Monitoring serangan real-time, triage incident, tuning *false positive*, mematikan rule ID spesifik per endpoint. | Sulit membaca *raw logs* di server log lokal, mematikan rule butuh edit file manual dan restart proxy. |
| **Budi (Cyber Security Engineer)** | Security Architecture | Membuat custom rule (SecLang), mengonfigurasi Paranoia Level OWASP CRS, integrasi SIEM/Alerting. | Sintaks SecLang rumit tanpa syntax validation, takut *rule update* merusak trafik produksi. |
| **Deni (DevOps / Infrastructure)** | Infra Engine | Management node health, deployment cluster WAF, memastikan *overhead latency* WAF < 2ms. | Tidak ada visibilitas resource usage WAF node secara terpusat. |

---

### 4. Detailed Feature Specifications

#### 4.1 Module 1: Fleet Management & Node Control Plane

##### Functional Requirements
- **FR-1.1 (Node Discovery & Heartbeat):** Node Coraza secara otomatis melakukan registrasi ke Control Plane via gRPC dengan `node_id`, `hostname`, `version`, dan `ip_address`.
- **FR-1.2 (Health & Performance Monitoring):** Menampilkan status node (*Healthy, Degraded, Unreachable*), CPU usage, Memory usage, Request Per Second (RPS), dan Average WAF Latency (ms).
- **FR-1.3 (Config Synchronization Status):** Menampilkan versi konfigurasi aktif pada setiap node (`sync_status: IN_SYNC` atau `PENDING_UPDATE`).

```
+------------------------------------------------------------------------------------------+
| FLEET MANAGEMENT                                                     [ + Register Node ] |
+------------------------------------------------------------------------------------------+
| NODE NAME         | HOSTNAME       | STATUS   | LATENCY | CRS VERSION | SYNC STATUS      |
+-------------------+----------------+----------+---------+-------------+------------------+
| edge-sg-caddy-01  | 10.10.1.15     | [ONLINE] | 1.2 ms  | CRS v4.0.0  | IN_SYNC (v104)   |
| edge-sg-envoy-02  | 10.10.1.16     | [ONLINE] | 1.8 ms  | CRS v4.0.0  | IN_SYNC (v104)   |
| edge-id-spoa-01   | 10.10.2.10     | [WARN]   | 8.5 ms  | CRS v3.3.4  | PENDING_UPDATE   |
+------------------------------------------------------------------------------------------+
```

---

#### 4.2 Module 2: OWASP CRS & SecLang Rule Management Engine

##### Functional Requirements
- **FR-2.1 (OWASP CRS v4 Visual Switch):** Mengaktifkan/nonaktifkan kategori CRS (misal: SQLi `942xxx`, XSS `941xxx`, RCE `932xxx`, Protocol Attack `920xxx`) dengan sakelar (*toggle switch*).
- **FR-2.2 (Paranoia Level & Anomaly Threshold Tuning):**
  - Slider visual untuk memilih **Paranoia Level (PL 1 - PL 4)** per site.
  - Form input **Inbound Anomaly Score Threshold** (default: 5) dan **Outbound Anomaly Score Threshold** (default: 4).
- **FR-2.3 (Visual Custom Rule Builder & Monaco Code Editor):**
  - **GUI Mode:** Form berbasis UI untuk membuat rule sederhana (Match Target, Operator, Action, Phase, Severity).
  - **Code Mode:** Embedded Monaco Editor (VS Code core) dengan *SecLang Syntax Highlighting*, auto-completion, dan *real-time linter* untuk mendeteksi kesalahan sintaks SecLang sebelum disimpan.
- **FR-2.4 (Testing Sandbox / Dry-Run Engine):**
  - Fitur pengujian payload terhadap aturan yang baru ditulis menggunakan engine Go FTW (Framework for Testing WAF).
  - Mengembalikan status: `MATCHED` / `PASSED` beserta Rule ID yang terpicu.

```
+------------------------------------------------------------------------------------------+
| RULE EDITOR: CUSTOM_SQLI_BYPASS_900001                                                  |
+------------------------------------------------------------------------------------------+
| Mode: [ Visual Builder | (X) Monaco SecLang Code Editor ]                                |
+------------------------------------------------------------------------------------------+
| 1 | SecRule ARGS:user_id "@rx (?i)(union\s+select|select\s+@@version)" \               |
| 2 |     "id:900001,\                                                                     |
| 3 |     phase:2,\                                                                        |
| 4 |     deny,\                                                                           |
| 5 |     status:403,\                                                                     |
| 6 |     msg:'Custom SQL Injection Pattern Detected',\                                    |
| 7 |     logdata:'Matched Data: %{TX.0} found within %{MATCHED_VAR_NAME}',\               |
| 8 |     tag:'application-multi',\                                                        |
| 9 |     severity:'CRITICAL'"                                                             |
+------------------------------------------------------------------------------------------+
| Status: Syntax Validated (0 Errors, 0 Warnings)                 [ Test Sandbox ] [ Save ]|
+------------------------------------------------------------------------------------------+
```

---

#### 4.3 Module 3: Incident Forensic Explorer & False Positive Tuning

##### Functional Requirements
- **FR-3.1 (High-Speed Log Explorer):** Integrasi langsung ke ClickHouse. Mampu memfilter millions of log dalam hitungan milidetik berdasarkan:
  - Time Range, Client IP, Target Host, URI Path, Matched Rule ID, Action Taken (`DENY`, `LOG`, `ALLOW`), HTTP Status Code.
- **FR-3.2 (Transaction Detail Inspector):** Menampilkan detail lengkap transaksi HTTP:
  - Header Request & Body Payload.
  - Matched Variable Name & Matched Data String.
  - Matched Rule Metadatas (Rule ID, Message, Severity, Tag).
- **FR-3.3 (One-Click Exception / Rule Suppression):**
  - Tombol **"Disable Rule for this Endpoint"** pada log detail.
  - Sistem otomatis menyusun rule `SecRuleUpdateTargetById` atau `ctl:ruleRemoveById` tanpa menulis manual.

```
+------------------------------------------------------------------------------------------+
| LOG EXPLORER                                                          [ Live Stream: ON ]|
+------------------------------------------------------------------------------------------+
| Filter: [ Rule ID: 942100  x ] [ Action: DENY  x ] [ Target: api.domain.com  x ]        |
+------------------------------------------------------------------------------------------+
| TIMESTAMP           | CLIENT IP       | METHOD | URI PATH         | RULE ID | ACTION     |
+---------------------+-----------------+--------+------------------+---------+------------+
| 2026-08-24 19:40:12 | 185.220.101.5   | POST   | /api/v1/login    | 942100  | DENY (403) |
| 2026-08-24 19:39:55 | 103.21.244.12   | GET    | /products/search | 941100  | DENY (403) |
+------------------------------------------------------------------------------------------+

DETAIL VIEW (Log ID: log_908123491)
--------------------------------------------------------------------------------------------
Client IP    : 185.220.101.5 (Country: RU / AS13335)
Matched Rule : 942100 (SQL Injection Attack Detected via libinjection)
Matched Var  : ARGS:username = ' OR '1'='1
Action Taken : Blocked (HTTP 403)

[ Create Exception / Allow Rule for /api/v1/login ]  [ Add IP to Blacklist ]
```

---

#### 4.4 Module 4: Analytics, Dashboarding & Threat Intelligence

##### Functional Requirements
- **FR-4.1 (Real-Time Attack Dashboard):**
  - KPI Cards: Total Traffic (Req/s), Total Blocked Requests, Block Ratio (%), Average Latency Overhead.
  - Chart 1: Traffic vs Attack Trend (Line Chart Time-series).
  - Chart 2: Top 10 Triggered OWASP Rules (Bar Chart).
  - Chart 3: Top Targeted Endpoints & Top Attacking IPs (Table/Geo Map).
- **FR-4.2 (IP Reputation & Threat Feeds):**
  - Fitur **IP Allowlist & Blocklist** terpusat dengan dukungan CIDR (`192.168.1.0/24`).
  - Impor *Threat Intelligence Feed* otomatis via URL (format plain text/CSV).

---

#### 4.5 Module 5: RBAC, Auditability & GitOps Integration

##### Functional Requirements
- **FR-5.1 (Role-Based Access Control):**
  - `Admin`: Full access (System settings, User management, Policy creation/push).
  - `SecOps Analyst`: View logs, triage incidents, create exception requests, write draft rules.
  - `Auditor`: Read-only access ke dashboard analytics dan audit logs.
- **FR-5.2 (Audit Logging System):**
  - Semua aksi perubahan konfigurasi (*Rule added, Rule disabled, Policy deployed*) dicatat di PostgreSQL secara immutable (Siapa, Kapan, Aksi, IP Asal, IP Node Target).
- **FR-5.3 (GitOps / Config Export-Import):**
  - Ekspor seluruh WAF Policy ke format deklaratif `coraza-policy.yaml`.
  - Dukungan integrasi CI/CD pipeline (GitHub Actions/GitLab CI) untuk validasi rule via CLI.

---

### 5. Technical Requirements & Non-Functional Requirements (NFR)

#### 5.1 Performance Requirements
- **NFR-1.1 (Latency Overhead):** Control Plane tidak boleh membebani data plane Coraza node. Proses evaluasi rule di WAF node harus tetap `< 2ms` per request.
- **NFR-1.2 (Config Push Speed):** Distribusi konfigurasi baru dari Control Plane ke 100+ node Coraza via gRPC stream harus selesai dalam waktu `< 1 detik`.
- **NFR-1.3 (Log Ingestion Throughput):** ClickHouse cluster backend harus mampu menangani *ingestion rate* minimal **10.000 log/detik** tanpa data loss.

#### 5.2 Security Requirements
- **NFR-2.1 (Transport Security):** Komunikasi gRPC antara Control Plane dan Coraza Node WAJIB menggunakan **mTLS (Mutual TLS)** dengan Sertifikat x509.
- **NFR-2.2 (Authentication & Session):** Web Dashboard menggunakan OAuth2 / OpenID Connect (OIDC) dengan SSO (Keycloak, Okta, Google Workspace) & mandatory MFA.
- **NFR-2.3 (Data Retention & Privacy):**
  - Fitur *Masking Payload* sensitif (misal: header `Authorization`, cookie `session_id`, field `password`) sebelum disimpan ke ClickHouse log database.

#### 5.3 Reliability & High Availability
- **NFR-3.1 (Fail-Safe Node Operation):** Jika Control Plane down/unreachable, Coraza Edge Node harus tetap berjalan menggunakan *cached configuration* terakhir tanpa menghentikan inspeksi trafik.
- **NFR-3.2 (Stateless Control Plane):** API Control Plane dikembangkan secara stateless dalam Docker Container / Kubernetes Pod sehingga mudah di-scale horizontally.

---

### 6. Data Schema Specifications

#### 6.1 Relational Schema (PostgreSQL Core)

```sql
-- Sites / Virtual Hosts
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    paranoia_level INT DEFAULT 1 CHECK (paranoia_level BETWEEN 1 AND 4),
    inbound_threshold INT DEFAULT 5,
    outbound_threshold INT DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Coraza Nodes Fleet
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status VARCHAR(20) DEFAULT 'OFFLINE',
    current_config_version VARCHAR(64),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom SecLang Rules
CREATE TABLE custom_rules (
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

-- Exceptions / Suppressions
CREATE TABLE rule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    rule_id INT NOT NULL,
    path_pattern VARCHAR(255) NOT NULL, -- e.g. /api/v1/upload
    parameter_name VARCHAR(100),       -- e.g. ARGS:file_description
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 6.2 Analytics Schema (ClickHouse Audit Log)

```sql
CREATE TABLE coraza_audit_logs (
    timestamp DateTime64(3, 'UTC'),
    transaction_id String,
    node_id UUID,
    site_id UUID,
    client_ip String,
    client_port UInt16,
    http_method LowCardinality(String),
    uri String,
    http_version String,
    response_status UInt16,
    action_taken LowCardinality(String), -- 'DENY', 'LOG', 'ALLOW'
    matched_rule_ids Array(UInt32),
    matched_messages Array(String),
    matched_data Array(String),
    request_headers Map(String, String),
    request_body String,
    latency_us UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, site_id, action_taken, client_ip);
```

---

### 7. Success Metrics & Roadmap

#### 7.1 Key Performance Indicators (KPIs)
1. **MTTR (Mean Time to Resolution) for False Positives:** Berkurang dari 45 menit (manual edit & redeploy) menjadi `< 2 menit` (via Dashboard GUI Exception).
2. **Configuration Sync Latency:** `< 1 detik` untuk penyebaran rule baru ke seluruh infrastruktur.
3. **Dashboard Load Time:** Log Explorer mampu menampilkan query 1 juta data log dalam `< 500 ms`.

#### 7.2 Release Roadmap
- **Phase 1 (MVP - Month 1-2):**
  - Centralized Rule Editor (Monaco Editor) & Custom SecLang Builder.
  - Basic gRPC Agent Stream untuk dynamic config push ke Coraza-Caddy.
  - PostgreSQL schema implementation & Auth OIDC.
- **Phase 2 (Observability - Month 3-4):**
  - ClickHouse integration & High-performance Log Explorer.
  - Real-time Attack Analytics & OWASP Top 10 Metrics Dashboard.
  - One-Click Exception Generator.
- **Phase 3 (Enterprise Readiness - Month 5-6):**
  - GitOps Synchronization (GitHub/GitLab runner integration).
  - Automated Testing Sandbox via Go FTW.
  - Threat Intelligence Feed auto-pulling & RBAC fine-tuning.

---
