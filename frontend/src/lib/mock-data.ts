import type {
  AccessEvent,
  ApiEndpoint,
  AuditLog,
  BotCategory,
  CorazaNode,
  CrsCategory,
  CustomRule,
  DataExposure,
  GeoStat,
  IpListEntry,
  RateLimitRule,
  RuleException,
  Site,
} from "./types";

export const mockNodes: CorazaNode[] = [
  {
    id: "b1a2c3d4-0001",
    node_name: "edge-sg-caddy-01",
    hostname: "10.10.1.15",
    ip_address: "10.10.1.15",
    version: "coraza/v3.3.2",
    status: "ONLINE",
    crs_version: "CRS v4.0.0",
    cpu_pct: 34,
    mem_pct: 51,
    rps: 4820,
    latency_ms: 1.2,
    sync_status: "IN_SYNC",
    config_version: "v104",
    last_heartbeat: "2026-08-24T19:41:02Z",
  },
  {
    id: "b1a2c3d4-0002",
    node_name: "edge-sg-envoy-02",
    hostname: "10.10.1.16",
    ip_address: "10.10.1.16",
    version: "coraza/v3.3.2",
    status: "ONLINE",
    crs_version: "CRS v4.0.0",
    cpu_pct: 28,
    mem_pct: 47,
    rps: 3910,
    latency_ms: 1.8,
    sync_status: "IN_SYNC",
    config_version: "v104",
    last_heartbeat: "2026-08-24T19:41:01Z",
  },
  {
    id: "b1a2c3d4-0003",
    node_name: "edge-id-spoa-01",
    hostname: "10.10.2.10",
    ip_address: "10.10.2.10",
    version: "coraza/v3.2.1",
    status: "WARN",
    crs_version: "CRS v3.3.4",
    cpu_pct: 78,
    mem_pct: 84,
    rps: 2140,
    latency_ms: 8.5,
    sync_status: "PENDING_UPDATE",
    config_version: "v097",
    last_heartbeat: "2026-08-24T19:40:44Z",
  },
  {
    id: "b1a2c3d4-0004",
    node_name: "edge-id-nginx-03",
    hostname: "10.10.2.11",
    ip_address: "10.10.2.11",
    version: "coraza/v3.3.2",
    status: "OFFLINE",
    crs_version: "CRS v4.0.0",
    cpu_pct: 0,
    mem_pct: 0,
    rps: 0,
    latency_ms: 0,
    sync_status: "PENDING_UPDATE",
    config_version: "v101",
    last_heartbeat: "2026-08-24T17:12:30Z",
  },
];

export const mockSites: Site[] = [
  {
    id: "site-001",
    name: "API Gateway (Prod)",
    domain_name: "api.domain.com",
    paranoia_level: 2,
    inbound_threshold: 5,
    outbound_threshold: 4,
  },
  {
    id: "site-002",
    name: "Web Storefront",
    domain_name: "shop.domain.com",
    paranoia_level: 1,
    inbound_threshold: 5,
    outbound_threshold: 4,
  },
];

export const mockCrsCategories: CrsCategory[] = [
  {
    id: "crs-920",
    name: "Protocol Attacks",
    rule_prefix: "920xxx",
    description: "HTTP protocol validation, request smuggling, malformed headers",
    enabled: true,
    rule_count: 42,
  },
  {
    id: "crs-921",
    name: "HTTP Request Smuggling",
    rule_prefix: "921xxx",
    description: "CL.TE / TE.CL smuggling and hop-by-hop abuse",
    enabled: true,
    rule_count: 18,
  },
  {
    id: "crs-930",
    name: "Local File Inclusion",
    rule_prefix: "930xxx",
    description: "LFI path traversal, /etc/passwd, wrapper protocols",
    enabled: true,
    rule_count: 24,
  },
  {
    id: "crs-932",
    name: "Remote Code Execution",
    rule_prefix: "932xxx",
    description: "RCE via command injection, shellshock, unix shells",
    enabled: true,
    rule_count: 68,
  },
  {
    id: "crs-941",
    name: "Cross-Site Scripting (XSS)",
    rule_prefix: "941xxx",
    description: "XSS vectors via libinjection and regex patterns",
    enabled: true,
    rule_count: 61,
  },
  {
    id: "crs-942",
    name: "SQL Injection (SQLi)",
    rule_prefix: "942xxx",
    description: "SQLi detection via libinjection and keyword heuristics",
    enabled: true,
    rule_count: 74,
  },
  {
    id: "crs-943",
    name: "Session Fixation",
    rule_prefix: "943xxx",
    description: "Session ID manipulation attempts",
    enabled: false,
    rule_count: 12,
  },
  {
    id: "crs-944",
    name: "Java Deserialization",
    rule_prefix: "944xxx",
    description: "Java serialization attack detection",
    enabled: false,
    rule_count: 15,
  },
];

export const sampleSecLang = `SecRule ARGS:user_id "@rx (?i)(union\\s+select|select\\s+@@version)" \\
    "id:900001,\\
    phase:2,\\
    deny,\\
    status:403,\\
    msg:'Custom SQL Injection Pattern Detected',\\
    logdata:'Matched Data: %{TX.0} found within %{MATCHED_VAR_NAME}',\\
    tag:'application-multi',\\
    severity:'CRITICAL'"`;

export const mockCustomRules: CustomRule[] = [
  {
    id: "rule-900001",
    rule_id: 900001,
    site_id: "site-001",
    name: "CUSTOM_SQLI_BYPASS_900001",
    seclang_raw: sampleSecLang,
    is_active: true,
    created_by: "budi@security.corp",
    created_at: "2026-08-20T09:14:00Z",
  },
  {
    id: "rule-900002",
    rule_id: 900002,
    site_id: "site-002",
    name: "BLOCK_SCANNER_UA_900002",
    seclang_raw: `SecRule REQUEST_HEADERS:User-Agent "@rx (?i)(sqlmap|nikto|nuclei|masscan)" \\
    "id:900002,\\
    phase:1,\\
    deny,\\
    status:403,\\
    msg:'Known Scanner User-Agent Blocked',\\
    tag:'recon',\\
    severity:'WARNING'"`,
    is_active: true,
    created_by: "ahmad@secops.corp",
    created_at: "2026-08-18T14:32:00Z",
  },
];

const H = (h: number, m: number) =>
  `2026-08-24T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:12Z`;

export const mockLogs: AuditLog[] = [
  {
    transaction_id: "log_908123491",
    timestamp: H(19, 40),
    node_id: "b1a2c3d4-0001",
    site_id: "site-001",
    client_ip: "185.220.101.5",
    country: "RU",
    asn: "AS13335",
    http_method: "POST",
    uri: "/api/v1/login",
    http_version: "HTTP/2",
    response_status: 403,
    action_taken: "DENY",
    matched_rule_ids: [942100],
    matched_messages: ["SQL Injection Attack Detected via libinjection"],
    matched_data: ["' OR '1'='1"],
    matched_var_name: "ARGS:username",
    request_headers: {
      "user-agent": "sqlmap/1.8",
      "content-type": "application/x-www-form-urlencoded",
      accept: "*/*",
    },
    request_body: "username=' OR '1'='1&password=x",
    target_host: "api.domain.com",
    latency_us: 1420,
  },
  {
    transaction_id: "log_908123472",
    timestamp: H(19, 39),
    node_id: "b1a2c3d4-0002",
    site_id: "site-002",
    client_ip: "103.21.244.12",
    country: "ID",
    asn: "AS45731",
    http_method: "GET",
    uri: "/products/search?q=<script>alert(1)</script>",
    http_version: "HTTP/2",
    response_status: 403,
    action_taken: "DENY",
    matched_rule_ids: [941100],
    matched_messages: ["XSS Attack Detected via libinjection"],
    matched_data: ["<script>alert(1)</script>"],
    matched_var_name: "ARGS:q",
    request_headers: { "user-agent": "Mozilla/5.0", referer: "https://shop.domain.com/" },
    request_body: "",
    target_host: "shop.domain.com",
    latency_us: 1180,
  },
  {
    transaction_id: "log_908123450",
    timestamp: H(19, 38),
    node_id: "b1a2c3d4-0001",
    site_id: "site-001",
    client_ip: "45.155.205.233",
    country: "NL",
    asn: "AS56694",
    http_method: "GET",
    uri: "/../../etc/passwd",
    http_version: "HTTP/1.1",
    response_status: 403,
    action_taken: "DENY",
    matched_rule_ids: [930100],
    matched_messages: ["Path Traversal Attack (/../) or Local File Inclusion"],
    matched_data: ["/../../etc/passwd"],
    matched_var_name: "REQUEST_URI",
    request_headers: { "user-agent": "Nuclei - Open-source project" },
    request_body: "",
    target_host: "api.domain.com",
    latency_us: 980,
  },
  {
    transaction_id: "log_908123441",
    timestamp: H(19, 37),
    node_id: "b1a2c3d4-0003",
    site_id: "site-001",
    client_ip: "192.168.4.77",
    country: "ID",
    asn: "AS7713",
    http_method: "POST",
    uri: "/api/v1/upload/description",
    http_version: "HTTP/2",
    response_status: 200,
    action_taken: "LOG",
    matched_rule_ids: [942430],
    matched_messages: [
      "Restricted SQL Character Anomaly Detection (args): Disallowed character",
    ],
    matched_data: ["'"],
    matched_var_name: "ARGS:file_description",
    request_headers: { "content-type": "application/json", authorization: "Bearer ey…" },
    request_body: '{"description":"item\'s metadata"}',
    target_host: "api.domain.com",
    latency_us: 2100,
  },
  {
    transaction_id: "log_908123420",
    timestamp: H(19, 35),
    node_id: "b1a2c3d4-0001",
    site_id: "site-002",
    client_ip: "203.0.113.88",
    country: "SG",
    asn: "AS16509",
    http_method: "GET",
    uri: "/checkout?coupon=UNION%20SELECT%20*%20FROM%20users",
    http_version: "HTTP/2",
    response_status: 403,
    action_taken: "DENY",
    matched_rule_ids: [942100, 900001],
    matched_messages: [
      "SQL Injection Attack Detected via libinjection",
      "Custom SQL Injection Pattern Detected",
    ],
    matched_data: ["UNION SELECT * FROM users"],
    matched_var_name: "ARGS:coupon",
    request_headers: { "user-agent": "curl/8.6.0" },
    request_body: "",
    target_host: "shop.domain.com",
    latency_us: 1310,
  },
];

export const mockExceptions: RuleException[] = [
  {
    id: "exc-0001",
    site_id: "site-001",
    rule_id: 942430,
    path_pattern: "/api/v1/upload/*",
    parameter_name: "ARGS:file_description",
    reason: "Apostrophes are valid in product descriptions; FP reported by merch team.",
    created_at: "2026-08-22T11:05:00Z",
    created_by: "ahmad@secops.corp",
  },
  {
    id: "exc-0002",
    site_id: "site-002",
    rule_id: 920280,
    path_pattern: "/legacy/*",
    parameter_name: null,
    reason: "Legacy CMS sends missing Host header on internal health checks.",
    created_at: "2026-08-15T08:22:00Z",
    created_by: "deni@infra.corp",
  },
];

export const mockIpList: IpListEntry[] = [
  { id: "ip-1", cidr: "192.168.1.0/24", list: "allow", source: "manual", added_at: "2026-08-01T00:00:00Z" },
  { id: "ip-2", cidr: "10.10.0.0/16", list: "allow", source: "threat-feed:internal", added_at: "2026-08-01T00:00:00Z" },
  { id: "ip-3", cidr: "185.220.101.0/24", list: "block", source: "manual", added_at: "2026-08-19T19:50:00Z" },
  { id: "ip-4", cidr: "45.155.205.0/24", list: "block", source: "feed:firehol_level1", added_at: "2026-08-20T06:00:00Z" },
];

// Traffic vs attack trend, last 24 points (hourly)
export const trafficTrend = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String((i + 20) % 24).padStart(2, "0")}:00`,
  requests: Math.round(3800 + 2600 * Math.abs(Math.sin(i / 3.5)) + i * 60),
  attacks: Math.round(120 + 340 * Math.abs(Math.sin(i / 2.2)) + (i % 5) * 40),
}));

export const topRules = [
  { rule_id: "942100", name: "SQLi - libinjection", hits: 1284 },
  { rule_id: "941100", name: "XSS - libinjection", hits: 967 },
  { rule_id: "932100", name: "RCE - Command Injection", hits: 743 },
  { rule_id: "930100", name: "LFI - Path Traversal", hits: 512 },
  { rule_id: "920280", name: "Missing Host Header", hits: 388 },
  { rule_id: "942430", name: "SQL Char Anomaly", hits: 291 },
  { rule_id: "913100", name: "Scanner Detection", hits: 204 },
  { rule_id: "934100", name: "Node.js RCE", hits: 156 },
  { rule_id: "949110", name: "Inbound Anomaly Score", hits: 121 },
  { rule_id: "911100", name: "Method Not Allowed", hits: 89 },
];

export const topAttackers = [
  { ip: "185.220.101.5", country: "RU", asn: "AS13335", hits: 1842, blocked_pct: 100 },
  { ip: "103.21.244.12", country: "ID", asn: "AS45731", hits: 1320, blocked_pct: 92 },
  { ip: "45.155.205.233", country: "NL", asn: "AS56694", hits: 987, blocked_pct: 100 },
  { ip: "203.0.113.88", country: "SG", asn: "AS16509", hits: 654, blocked_pct: 71 },
  { ip: "91.240.118.222", country: "UA", asn: "AS200000", hits: 512, blocked_pct: 98 },
];

// --- Traffic Analysis / Geolocation (last 24h) ---

export const mockGeoStats: GeoStat[] = [
  { country: "China", code: "CN", lat: 35.0, lng: 105.0, requests: 412300, blocked: 38210 },
  { country: "Russia", code: "RU", lat: 61.5, lng: 90.0, requests: 298400, blocked: 41500 },
  { country: "United States", code: "US", lat: 39.8, lng: -98.5, requests: 892100, blocked: 12340 },
  { country: "Indonesia", code: "ID", lat: -2.5, lng: 118.0, requests: 654800, blocked: 18920 },
  { country: "Singapore", code: "SG", lat: 1.35, lng: 103.8, requests: 341500, blocked: 5610 },
  { country: "Netherlands", code: "NL", lat: 52.1, lng: 5.3, requests: 187600, blocked: 22840 },
  { country: "Germany", code: "DE", lat: 51.2, lng: 10.4, requests: 224900, blocked: 4310 },
  { country: "Brazil", code: "BR", lat: -14.2, lng: -51.9, requests: 156700, blocked: 8720 },
  { country: "India", code: "IN", lat: 21.0, lng: 78.0, requests: 287300, blocked: 15460 },
  { country: "Vietnam", code: "VN", lat: 14.1, lng: 108.3, requests: 132800, blocked: 19730 },
  { country: "South Korea", code: "KR", lat: 36.5, lng: 127.8, requests: 178200, blocked: 2150 },
  { country: "Ukraine", code: "UA", lat: 48.4, lng: 31.2, requests: 94500, blocked: 26890 },
];

// --- Access Control events ---

export const mockAccessEvents: AccessEvent[] = [
  {
    id: "acc-1001",
    action: "DENY",
    address: "185.220.101.0/24",
    type: "IP Blocklist",
    rule_name: "BLOCK_KNOWN_ABUSE_NET",
    attack_ip: "185.220.101.5",
    time: "2026-08-24T19:40:12Z",
    log_ids: ["log_908123491"],
  },
  {
    id: "acc-1002",
    action: "ALLOW",
    address: "api.domain.com/api/v1/health",
    type: "Endpoint Allowlist",
    rule_name: "ALLOW_INTERNAL_HEALTHCHECK",
    attack_ip: "10.10.2.11",
    time: "2026-08-24T19:39:58Z",
    log_ids: [],
  },
  {
    id: "acc-1003",
    action: "DENY",
    address: "/products/search",
    type: "WAF Rule (XSS)",
    rule_name: "XSS Attack Detected via libinjection",
    attack_ip: "103.21.244.12",
    time: "2026-08-24T19:39:55Z",
    log_ids: ["log_908123472"],
  },
  {
    id: "acc-1004",
    action: "DENY",
    address: "/* (any URI)",
    type: "Rate Limiting",
    rule_name: "RL_GLOBAL_PER_IP_3000PM",
    attack_ip: "91.240.118.222",
    time: "2026-08-24T19:38:41Z",
    log_ids: [],
  },
  {
    id: "acc-1005",
    action: "DENY",
    address: "/../../etc/passwd",
    type: "Bot Rule",
    rule_name: "BLOCK_SCANNER_UA_900002",
    attack_ip: "45.155.205.233",
    time: "2026-08-24T19:38:02Z",
    log_ids: ["log_908123450"],
  },
  {
    id: "acc-1006",
    action: "ALLOW",
    address: "192.168.1.0/24",
    type: "IP Allowlist",
    rule_name: "CORP_OFFICE_RANGES",
    attack_ip: "192.168.1.44",
    time: "2026-08-24T19:37:30Z",
    log_ids: [],
  },
  {
    id: "acc-1007",
    action: "DENY",
    address: "/checkout",
    type: "Geo Rule",
    rule_name: "GEO_DENY_SANCTIONED_COUNTRIES",
    attack_ip: "45.155.205.233",
    time: "2026-08-24T19:36:17Z",
    log_ids: [],
  },
  {
    id: "acc-1008",
    action: "LOG",
    address: "/api/v1/upload/description",
    type: "Rule Exception",
    rule_name: "EXC-0001 (ARGS:file_description)",
    attack_ip: "192.168.4.77",
    time: "2026-08-24T19:37:12Z",
    log_ids: ["log_908123441"],
  },
];

// --- Rate Limiting rules ---

export const mockRateLimitRules: RateLimitRule[] = [
  {
    id: "rl-001",
    name: "RL_GLOBAL_PER_IP_3000PM",
    endpoint: "* (all hosts)",
    threshold: 3000,
    window_sec: 60,
    action: "TARPIT",
    enabled: true,
  },
  {
    id: "rl-002",
    name: "RL_LOGIN_BRUTEFORCE",
    endpoint: "api.domain.com/api/v1/login",
    threshold: 30,
    window_sec: 60,
    action: "CAPTCHA",
    enabled: true,
  },
  {
    id: "rl-003",
    name: "RL_SEARCH_BURST",
    endpoint: "shop.domain.com/products/search",
    threshold: 120,
    window_sec: 60,
    action: "BLOCK",
    enabled: true,
  },
  {
    id: "rl-004",
    name: "RL_API_TOKEN_TIER_FREE",
    endpoint: "api.domain.com/api/v1/*",
    threshold: 600,
    window_sec: 60,
    action: "BLOCK",
    enabled: false,
  },
];

export const rateLimitStats = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String((i + 20) % 24).padStart(2, "0")}:00`,
  limited: Math.round(80 + 260 * Math.abs(Math.sin(i / 2.6)) + (i % 4) * 30),
}));

// --- Anti-Bot ---

export const botTrafficSplit = [
  { name: "Human", value: 78, color: "#22d3ee" },
  { name: "Verified Bots", value: 9, color: "#a78bfa" },
  { name: "Unverified Bots", value: 13, color: "#f43f5e" },
];

export const mockBotCategories: BotCategory[] = [
  {
    id: "bot-001",
    name: "Known Vulnerability Scanner",
    ua_pattern: "(sqlmap|nikto|nuclei|masscan)",
    verified: false,
    action: "BLOCK",
    hits_24h: 1842,
  },
  {
    id: "bot-002",
    name: "Headless Browser",
    ua_pattern: "(HeadlessChrome|puppeteer|playwright)",
    verified: false,
    action: "CHALLENGE",
    hits_24h: 967,
  },
  {
    id: "bot-003",
    name: "HTTP Libraries",
    ua_pattern: "^(curl|wget|python-requests|Go-http-client)",
    verified: false,
    action: "LOG",
    hits_24h: 2310,
  },
  {
    id: "bot-004",
    name: "Search Engine Crawlers",
    ua_pattern: "(Googlebot|bingbot|DuckDuckBot)",
    verified: true,
    action: "ALLOW",
    hits_24h: 41200,
  },
  {
    id: "bot-005",
    name: "AI Training Crawlers",
    ua_pattern: "(GPTBot|ClaudeBot|CCBot)",
    verified: false,
    action: "BLOCK",
    hits_24h: 5340,
  },
  {
    id: "bot-006",
    name: "SEO & Aggregator Bots",
    ua_pattern: "(AhrefsBot|SemrushBot|MJ12bot)",
    verified: false,
    action: "CHALLENGE",
    hits_24h: 1287,
  },
];

// --- API Security (WAAP) ---

export const mockApiEndpoints: ApiEndpoint[] = [
  { id: "ep-001", method: "POST", path: "/api/v1/login", host: "api.domain.com", spec_status: "VALIDATED", violations_24h: 0, auth: "JWT" },
  { id: "ep-002", method: "GET", path: "/api/v1/orders/{id}", host: "api.domain.com", spec_status: "VALIDATED", violations_24h: 3, auth: "JWT" },
  { id: "ep-003", method: "POST", path: "/api/v1/upload", host: "api.domain.com", spec_status: "DRIFTED", violations_24h: 47, auth: "JWT" },
  { id: "ep-004", method: "GET", path: "/products/search", host: "shop.domain.com", spec_status: "UNSPECIFIED", violations_24h: 12, auth: "NONE" },
  { id: "ep-005", method: "POST", path: "/api/v2/payments", host: "api.domain.com", spec_status: "VALIDATED", violations_24h: 0, auth: "API_KEY" },
  { id: "ep-006", method: "GET", path: "/api/internal/debug", host: "api.domain.com", spec_status: "UNSPECIFIED", violations_24h: 8, auth: "NONE" },
  { id: "ep-007", method: "PUT", path: "/api/v1/users/{id}", host: "api.domain.com", spec_status: "VALIDATED", violations_24h: 1, auth: "JWT" },
];

export const apiSecurityStats = {
  endpoints_monitored: 7,
  schema_violations_24h: 71,
  jwt_failures_24h: 342,
  sensitive_blocked_24h: 19,
};

export const jwtStats = Array.from({ length: 12 }, (_, i) => ({
  hour: `${String((i + 8) % 24).padStart(2, "0")}:00`,
  valid: Math.round(4200 + 1800 * Math.abs(Math.sin(i / 3))),
  invalid_sig: Math.round(40 + 120 * Math.abs(Math.sin(i / 2.4)) + (i % 3) * 25),
  expired: Math.round(15 + 60 * Math.abs(Math.sin(i / 1.8))),
}));

export const mockDataExposures: DataExposure[] = [
  { id: "dx-001", data_type: "CREDIT_CARD", endpoint: "/api/v2/payments", location: "RESPONSE_BODY", occurrences_24h: 4, action_taken: "MASKED" },
  { id: "dx-002", data_type: "EMAIL", endpoint: "/api/v1/users/{id}", location: "RESPONSE_BODY", occurrences_24h: 11, action_taken: "LOGGED" },
  { id: "dx-003", data_type: "AUTH_TOKEN", endpoint: "/api/internal/debug", location: "RESPONSE_HEADER", occurrences_24h: 8, action_taken: "BLOCKED" },
  { id: "dx-004", data_type: "PRIVATE_KEY", endpoint: "/api/v1/upload", location: "RESPONSE_BODY", occurrences_24h: 1, action_taken: "BLOCKED" },
];
