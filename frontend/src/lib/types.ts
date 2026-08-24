// Types mirror the PRD §6 schemas (PostgreSQL + ClickHouse) so the mock
// layer can later be swapped for the real Go Control Plane REST API 1:1.

export type NodeStatus = "ONLINE" | "WARN" | "OFFLINE";
export type SyncStatus = "IN_SYNC" | "PENDING_UPDATE";

export interface CorazaNode {
  id: string;
  node_name: string;
  ip_address: string;
  hostname: string;
  version: string;
  status: NodeStatus;
  crs_version: string;
  cpu_pct: number;
  mem_pct: number;
  rps: number;
  latency_ms: number;
  sync_status: SyncStatus;
  config_version: string;
  last_heartbeat: string;
}

export interface CrsCategory {
  id: string;
  name: string;
  rule_prefix: string;
  description: string;
  enabled: boolean;
  rule_count: number;
}

export interface CustomRule {
  id: string;
  rule_id: number;
  site_id: string | null;
  name: string;
  seclang_raw: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface Site {
  id: string;
  name: string;
  domain_name: string;
  paranoia_level: number;
  inbound_threshold: number;
  outbound_threshold: number;
}

export type ActionTaken = "DENY" | "LOG" | "ALLOW";

export interface AuditLog {
  transaction_id: string;
  timestamp: string;
  node_id: string;
  site_id: string;
  client_ip: string;
  country: string;
  asn: string;
  http_method: string;
  uri: string;
  http_version: string;
  response_status: number;
  action_taken: ActionTaken;
  matched_rule_ids: number[];
  matched_messages: string[];
  matched_data: string[];
  matched_var_name: string;
  request_headers: Record<string, string>;
  request_body: string;
  target_host: string;
  latency_us: number;
}

export interface RuleException {
  id: string;
  site_id: string;
  rule_id: number;
  path_pattern: string;
  parameter_name: string | null;
  reason: string;
  created_at: string;
  created_by: string;
}

export interface IpListEntry {
  id: string;
  cidr: string;
  list: "allow" | "block";
  source: string;
  added_at: string;
}

// --- Traffic Analysis / Geolocation ---

export interface GeoStat {
  country: string;
  code: string;
  lat: number;
  lng: number;
  requests: number;
  blocked: number;
}

// --- Access Control (Allow & Deny) events ---

export type AccessAction = "ALLOW" | "DENY" | "LOG";

export interface AccessEvent {
  id: string;
  action: AccessAction;
  address: string; // matched host/path or CIDR
  type: string; // source list: IP Allowlist, Geo Rule, Rate Limit, Bot Rule, ...
  rule_name: string;
  attack_ip: string;
  time: string;
  log_ids: string[]; // related transaction ids in the audit log store
}

// --- Rate Limiting ---

export type RateLimitAction = "BLOCK" | "TARPIT" | "CAPTCHA";

export interface RateLimitRule {
  id: string;
  name: string;
  endpoint: string;
  threshold: number; // requests
  window_sec: number;
  action: RateLimitAction;
  enabled: boolean;
}

// --- Anti-Bot ---

export type BotAction = "ALLOW" | "LOG" | "CHALLENGE" | "BLOCK";

export interface BotCategory {
  id: string;
  name: string;
  ua_pattern: string;
  verified: boolean; // e.g. verified search engine crawlers
  action: BotAction;
  hits_24h: number;
}

// --- API Security (WAAP pillar) ---

export type SchemaStatus = "VALIDATED" | "DRIFTED" | "UNSPECIFIED";

export interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  host: string;
  spec_status: SchemaStatus;
  violations_24h: number;
  auth: "JWT" | "API_KEY" | "NONE";
}

export type DataType =
  | "CREDIT_CARD"
  | "EMAIL"
  | "PHONE"
  | "PRIVATE_KEY"
  | "AUTH_TOKEN"
  | "SSN";

export interface DataExposure {
  id: string;
  data_type: DataType;
  endpoint: string;
  location: "RESPONSE_BODY" | "RESPONSE_HEADER" | "LOG_BODY";
  occurrences_24h: number;
  action_taken: "MASKED" | "BLOCKED" | "LOGGED";
}
