package store

// SeedDemo populates the store with the same dataset the frontend ships as
// mocks, so UI and API show identical data out of the box.

func SeedDemo(s *Store) {
	s.VersionSeq = 104
	s.ConfigVersion = "v104"

	nodes := []*CorazaNode{
		{ID: "b1a2c3d4-0001", NodeName: "edge-sg-caddy-01", Hostname: "10.10.1.15", IPAddress: "10.10.1.15", Version: "coraza/v3.3.2", Status: NodeOnline, CRSVersion: "CRS v4.0.0", CPUPct: 34, MemPct: 51, RPS: 4820, LatencyMS: 1.2, SyncStatus: SyncInSync, ConfigVersion: "v104", LastHeartbeat: "2026-08-24T19:41:02Z"},
		{ID: "b1a2c3d4-0002", NodeName: "edge-sg-envoy-02", Hostname: "10.10.1.16", IPAddress: "10.10.1.16", Version: "coraza/v3.3.2", Status: NodeOnline, CRSVersion: "CRS v4.0.0", CPUPct: 28, MemPct: 47, RPS: 3910, LatencyMS: 1.8, SyncStatus: SyncInSync, ConfigVersion: "v104", LastHeartbeat: "2026-08-24T19:41:01Z"},
		{ID: "b1a2c3d4-0003", NodeName: "edge-id-spoa-01", Hostname: "10.10.2.10", IPAddress: "10.10.2.10", Version: "coraza/v3.2.1", Status: NodeWarn, CRSVersion: "CRS v3.3.4", CPUPct: 78, MemPct: 84, RPS: 2140, LatencyMS: 8.5, SyncStatus: SyncPending, ConfigVersion: "v097", LastHeartbeat: "2026-08-24T19:40:44Z"},
		{ID: "b1a2c3d4-0004", NodeName: "edge-id-nginx-03", Hostname: "10.10.2.11", IPAddress: "10.10.2.11", Version: "coraza/v3.3.2", Status: NodeOffline, CRSVersion: "CRS v4.0.0", SyncStatus: SyncPending, ConfigVersion: "v101", LastHeartbeat: "2026-08-24T17:12:30Z"},
	}
	for _, n := range nodes { s.Nodes[n.ID] = n }

	sites := []*Site{
		{ID: "site-001", Name: "API Gateway (Prod)", DomainName: "api.domain.com", ParanoiaLevel: 2, InboundThreshold: 5, OutboundThreshold: 4},
		{ID: "site-002", Name: "Web Storefront", DomainName: "shop.domain.com", ParanoiaLevel: 1, InboundThreshold: 5, OutboundThreshold: 4},
	}
	for _, x := range sites { s.Sites[x.ID] = x }

	cats := []*CrsCategory{
		{ID: "crs-920", Name: "Protocol Attacks", RulePrefix: "920xxx", Description: "HTTP protocol validation, request smuggling, malformed headers", Enabled: true, RuleCount: 42},
		{ID: "crs-921", Name: "HTTP Request Smuggling", RulePrefix: "921xxx", Description: "CL.TE / TE.CL smuggling and hop-by-hop abuse", Enabled: true, RuleCount: 18},
		{ID: "crs-930", Name: "Local File Inclusion", RulePrefix: "930xxx", Description: "LFI path traversal, /etc/passwd, wrapper protocols", Enabled: true, RuleCount: 24},
		{ID: "crs-932", Name: "Remote Code Execution", RulePrefix: "932xxx", Description: "RCE via command injection, shellshock, unix shells", Enabled: true, RuleCount: 68},
		{ID: "crs-941", Name: "Cross-Site Scripting (XSS)", RulePrefix: "941xxx", Description: "XSS vectors via libinjection and regex patterns", Enabled: true, RuleCount: 61},
		{ID: "crs-942", Name: "SQL Injection (SQLi)", RulePrefix: "942xxx", Description: "SQLi detection via libinjection and keyword heuristics", Enabled: true, RuleCount: 74},
		{ID: "crs-943", Name: "Session Fixation", RulePrefix: "943xxx", Description: "Session ID manipulation attempts", Enabled: false, RuleCount: 12},
		{ID: "crs-944", Name: "Java Deserialization", RulePrefix: "944xxx", Description: "Java serialization attack detection", Enabled: false, RuleCount: 15},
	}
	for _, c := range cats { s.CrsCats[c.ID] = c }

	sample := `SecRule ARGS:user_id "@rx (?i)(union\s+select|select\s+@@version)" \
    "id:900001,\
    phase:2,\
    deny,\
    status:403,\
    msg:'Custom SQL Injection Pattern Detected',\
    logdata:'Matched Data: %{TX.0} found within %{MATCHED_VAR_NAME}',\
    tag:'application-multi',\
    severity:'CRITICAL'"`
	scanner := `SecRule REQUEST_HEADERS:User-Agent "@rx (?i)(sqlmap|nikto|nuclei|masscan)" \
    "id:900002,\
    phase:1,\
    deny,\
    status:403,\
    msg:'Known Scanner User-Agent Blocked',\
    tag:'recon',\
    severity:'WARNING'"`
	s.Rules["rule-900001"] = &CustomRule{ID: "rule-900001", RuleID: 900001, SiteID: "site-001", Name: "CUSTOM_SQLI_BYPASS_900001", SecLangRaw: sample, IsActive: true, CreatedBy: "budi@security.corp", CreatedAt: "2026-08-20T09:14:00Z"}
	s.Rules["rule-900002"] = &CustomRule{ID: "rule-900002", RuleID: 900002, SiteID: "site-002", Name: "BLOCK_SCANNER_UA_900002", SecLangRaw: scanner, IsActive: true, CreatedBy: "ahmad@secops.corp", CreatedAt: "2026-08-18T14:32:00Z"}

	s.Exceptions["exc-0001"] = &RuleException{ID: "exc-0001", SiteID: "site-001", RuleID: 942430, PathPattern: "/api/v1/upload/*", ParameterName: "ARGS:file_description", Reason: "Apostrophes are valid in product descriptions; FP reported by merch team.", CreatedAt: "2026-08-22T11:05:00Z", CreatedBy: "ahmad@secops.corp"}
	s.Exceptions["exc-0002"] = &RuleException{ID: "exc-0002", SiteID: "site-002", RuleID: 920280, PathPattern: "/legacy/*", ParameterName: "", Reason: "Legacy CMS sends missing Host header on internal health checks.", CreatedAt: "2026-08-15T08:22:00Z", CreatedBy: "deni@infra.corp"}

	ips := []*IpListEntry{
		{ID: "ip-1", CIDR: "192.168.1.0/24", List: "allow", Source: "manual", AddedAt: "2026-08-01T00:00:00Z"},
		{ID: "ip-2", CIDR: "10.10.0.0/16", List: "allow", Source: "threat-feed:internal", AddedAt: "2026-08-01T00:00:00Z"},
		{ID: "ip-3", CIDR: "185.220.101.0/24", List: "block", Source: "manual", AddedAt: "2026-08-19T19:50:00Z"},
		{ID: "ip-4", CIDR: "45.155.205.0/24", List: "block", Source: "feed:firehol_level1", AddedAt: "2026-08-20T06:00:00Z"},
	}
	for _, ip := range ips { s.IpList[ip.ID] = ip }

	events := []*AccessEvent{
		{ID: "acc-1001", Action: "DENY", Address: "185.220.101.0/24", Type: "IP Blocklist", RuleName: "BLOCK_KNOWN_ABUSE_NET", AttackIP: "185.220.101.5", Time: "2026-08-24T19:40:12Z", LogIDs: []string{"log_908123491"}},
		{ID: "acc-1002", Action: "ALLOW", Address: "api.domain.com/api/v1/health", Type: "Endpoint Allowlist", RuleName: "ALLOW_INTERNAL_HEALTHCHECK", AttackIP: "10.10.2.11", Time: "2026-08-24T19:39:58Z", LogIDs: []string{}},
		{ID: "acc-1003", Action: "DENY", Address: "/products/search", Type: "WAF Rule (XSS)", RuleName: "XSS Attack Detected via libinjection", AttackIP: "103.21.244.12", Time: "2026-08-24T19:39:55Z", LogIDs: []string{"log_908123472"}},
		{ID: "acc-1004", Action: "DENY", Address: "/* (any URI)", Type: "Rate Limiting", RuleName: "RL_GLOBAL_PER_IP_3000PM", AttackIP: "91.240.118.222", Time: "2026-08-24T19:38:41Z", LogIDs: []string{}},
		{ID: "acc-1005", Action: "DENY", Address: "/../../etc/passwd", Type: "Bot Rule", RuleName: "BLOCK_SCANNER_UA_900002", AttackIP: "45.155.205.233", Time: "2026-08-24T19:38:02Z", LogIDs: []string{"log_908123450"}},
		{ID: "acc-1006", Action: "ALLOW", Address: "192.168.1.0/24", Type: "IP Allowlist", RuleName: "CORP_OFFICE_RANGES", AttackIP: "192.168.1.44", Time: "2026-08-24T19:37:30Z", LogIDs: []string{}},
		{ID: "acc-1007", Action: "DENY", Address: "/checkout", Type: "Geo Rule", RuleName: "GEO_DENY_SANCTIONED_COUNTRIES", AttackIP: "45.155.205.233", Time: "2026-08-24T19:36:17Z", LogIDs: []string{}},
		{ID: "acc-1008", Action: "LOG", Address: "/api/v1/upload/description", Type: "Rule Exception", RuleName: "EXC-0001 (ARGS:file_description)", AttackIP: "192.168.4.77", Time: "2026-08-24T19:37:12Z", LogIDs: []string{"log_908123441"}},
	}
	for _, e := range events { s.AccessEvts[e.ID] = e }

	rls := []*RateLimitRule{
		{ID: "rl-001", Name: "RL_GLOBAL_PER_IP_3000PM", Endpoint: "* (all hosts)", Threshold: 3000, WindowSec: 60, Action: "TARPIT", Enabled: true},
		{ID: "rl-002", Name: "RL_LOGIN_BRUTEFORCE", Endpoint: "api.domain.com/api/v1/login", Threshold: 30, WindowSec: 60, Action: "CAPTCHA", Enabled: true},
		{ID: "rl-003", Name: "RL_SEARCH_BURST", Endpoint: "shop.domain.com/products/search", Threshold: 120, WindowSec: 60, Action: "BLOCK", Enabled: true},
		{ID: "rl-004", Name: "RL_API_TOKEN_TIER_FREE", Endpoint: "api.domain.com/api/v1/*", Threshold: 600, WindowSec: 60, Action: "BLOCK", Enabled: false},
	}
	for _, r := range rls { s.RateLimits[r.ID] = r }

	bots := []*BotCategory{
		{ID: "bot-001", Name: "Known Vulnerability Scanner", UAPattern: "(sqlmap|nikto|nuclei|masscan)", Verified: false, Action: "BLOCK", Hits24h: 1842},
		{ID: "bot-002", Name: "Headless Browser", UAPattern: "(HeadlessChrome|puppeteer|playwright)", Verified: false, Action: "CHALLENGE", Hits24h: 967},
		{ID: "bot-003", Name: "HTTP Libraries", UAPattern: "^(curl|wget|python-requests|Go-http-client)", Verified: false, Action: "LOG", Hits24h: 2310},
		{ID: "bot-004", Name: "Search Engine Crawlers", UAPattern: "(Googlebot|bingbot|DuckDuckBot)", Verified: true, Action: "ALLOW", Hits24h: 41200},
		{ID: "bot-005", Name: "AI Training Crawlers", UAPattern: "(GPTBot|ClaudeBot|CCBot)", Verified: false, Action: "BLOCK", Hits24h: 5340},
		{ID: "bot-006", Name: "SEO & Aggregator Bots", UAPattern: "(AhrefsBot|SemrushBot|MJ12bot)", Verified: false, Action: "CHALLENGE", Hits24h: 1287},
	}
	for _, b := range bots { s.Bots[b.ID] = b }

	eps := []*ApiEndpoint{
		{ID: "ep-001", Method: "POST", Path: "/api/v1/login", Host: "api.domain.com", SpecStatus: "VALIDATED", Auth: "JWT"},
		{ID: "ep-002", Method: "GET", Path: "/api/v1/orders/{id}", Host: "api.domain.com", SpecStatus: "VALIDATED", Violations24h: 3, Auth: "JWT"},
		{ID: "ep-003", Method: "POST", Path: "/api/v1/upload", Host: "api.domain.com", SpecStatus: "DRIFTED", Violations24h: 47, Auth: "JWT"},
		{ID: "ep-004", Method: "GET", Path: "/products/search", Host: "shop.domain.com", SpecStatus: "UNSPECIFIED", Violations24h: 12, Auth: "NONE"},
		{ID: "ep-005", Method: "POST", Path: "/api/v2/payments", Host: "api.domain.com", SpecStatus: "VALIDATED", Auth: "API_KEY"},
		{ID: "ep-006", Method: "GET", Path: "/api/internal/debug", Host: "api.domain.com", SpecStatus: "UNSPECIFIED", Violations24h: 8, Auth: "NONE"},
		{ID: "ep-007", Method: "PUT", Path: "/api/v1/users/{id}", Host: "api.domain.com", SpecStatus: "VALIDATED", Violations24h: 1, Auth: "JWT"},
	}
	for _, ep := range eps { s.ApiEps[ep.ID] = ep }

	exps := []*DataExposure{
		{ID: "dx-001", DataType: "CREDIT_CARD", Endpoint: "/api/v2/payments", Location: "RESPONSE_BODY", Occurrences24h: 4, ActionTaken: "MASKED"},
		{ID: "dx-002", DataType: "EMAIL", Endpoint: "/api/v1/users/{id}", Location: "RESPONSE_BODY", Occurrences24h: 11, ActionTaken: "LOGGED"},
		{ID: "dx-003", DataType: "AUTH_TOKEN", Endpoint: "/api/internal/debug", Location: "RESPONSE_HEADER", Occurrences24h: 8, ActionTaken: "BLOCKED"},
		{ID: "dx-004", DataType: "PRIVATE_KEY", Endpoint: "/api/v1/upload", Location: "RESPONSE_BODY", Occurrences24h: 1, ActionTaken: "BLOCKED"},
	}
	for _, d := range exps { s.Exposures[d.ID] = d }

	s.Geo = []GeoStat{
		{Country: "China", Code: "CN", Lat: 35.0, Lng: 105.0, Requests: 412300, Blocked: 38210},
		{Country: "Russia", Code: "RU", Lat: 61.5, Lng: 90.0, Requests: 298400, Blocked: 41500},
		{Country: "United States", Code: "US", Lat: 39.8, Lng: -98.5, Requests: 892100, Blocked: 12340},
		{Country: "Indonesia", Code: "ID", Lat: -2.5, Lng: 118.0, Requests: 654800, Blocked: 18920},
		{Country: "Singapore", Code: "SG", Lat: 1.35, Lng: 103.8, Requests: 341500, Blocked: 5610},
		{Country: "Netherlands", Code: "NL", Lat: 52.1, Lng: 5.3, Requests: 187600, Blocked: 22840},
		{Country: "Germany", Code: "DE", Lat: 51.2, Lng: 10.4, Requests: 224900, Blocked: 4310},
		{Country: "Brazil", Code: "BR", Lat: -14.2, Lng: -51.9, Requests: 156700, Blocked: 8720},
		{Country: "India", Code: "IN", Lat: 21.0, Lng: 78.0, Requests: 287300, Blocked: 15460},
		{Country: "Vietnam", Code: "VN", Lat: 14.1, Lng: 108.3, Requests: 132800, Blocked: 19730},
		{Country: "South Korea", Code: "KR", Lat: 36.5, Lng: 127.8, Requests: 178200, Blocked: 2150},
		{Country: "Ukraine", Code: "UA", Lat: 48.4, Lng: 31.2, Requests: 94500, Blocked: 26890},
	}

	s.Feeds["feed-001"] = &ThreatFeed{ID: "feed-001", Name: "firehol_level1", URL: "https://iplists.firehol.org/files/firehol_level1.netset", Interval: "6h", Status: "SYNCED", LastSync: "2026-08-24T06:00:00Z"}
	s.Feeds["feed-002"] = &ThreatFeed{ID: "feed-002", Name: "abuseipdb_high_confidence", URL: "https://api.abuseipdb.com/blacklist", Interval: "12h", Status: "SYNCED", LastSync: "2026-08-24T06:00:00Z"}

	s.Logs = []AuditLog{
		{TransactionID: "log_908123491", Timestamp: "2026-08-24T19:40:12Z", NodeID: "b1a2c3d4-0001", SiteID: "site-001", ClientIP: "185.220.101.5", Country: "RU", ASN: "AS13335", HTTPMethod: "POST", URI: "/api/v1/login", HTTPVersion: "HTTP/2", ResponseStatus: 403, ActionTaken: "DENY", MatchedRuleIDs: []int64{942100}, MatchedMessages: []string{"SQL Injection Attack Detected via libinjection"}, MatchedData: []string{"' OR '1'='1"}, MatchedVarName: "ARGS:username", RequestHeaders: map[string]string{"user-agent": "sqlmap/1.8", "content-type": "application/x-www-form-urlencoded", "accept": "*/*"}, RequestBody: "username=' OR '1'='1&password=x", TargetHost: "api.domain.com", LatencyUS: 1420},
		{TransactionID: "log_908123472", Timestamp: "2026-08-24T19:39:55Z", NodeID: "b1a2c3d4-0002", SiteID: "site-002", ClientIP: "103.21.244.12", Country: "ID", ASN: "AS45731", HTTPMethod: "GET", URI: "/products/search?q=<script>alert(1)</script>", HTTPVersion: "HTTP/2", ResponseStatus: 403, ActionTaken: "DENY", MatchedRuleIDs: []int64{941100}, MatchedMessages: []string{"XSS Attack Detected via libinjection"}, MatchedData: []string{"<script>alert(1)</script>"}, MatchedVarName: "ARGS:q", RequestHeaders: map[string]string{"user-agent": "Mozilla/5.0", "referer": "https://shop.domain.com/"}, TargetHost: "shop.domain.com", LatencyUS: 1180},
		{TransactionID: "log_908123450", Timestamp: "2026-08-24T19:38:12Z", NodeID: "b1a2c3d4-0001", SiteID: "site-001", ClientIP: "45.155.205.233", Country: "NL", ASN: "AS56694", HTTPMethod: "GET", URI: "/../../etc/passwd", HTTPVersion: "HTTP/1.1", ResponseStatus: 403, ActionTaken: "DENY", MatchedRuleIDs: []int64{930100}, MatchedMessages: []string{"Path Traversal Attack (/../) or Local File Inclusion"}, MatchedData: []string{"/../../etc/passwd"}, MatchedVarName: "REQUEST_URI", RequestHeaders: map[string]string{"user-agent": "Nuclei - Open-source project"}, TargetHost: "api.domain.com", LatencyUS: 980},
		{TransactionID: "log_908123441", Timestamp: "2026-08-24T19:37:12Z", NodeID: "b1a2c3d4-0003", SiteID: "site-001", ClientIP: "192.168.4.77", Country: "ID", ASN: "AS7713", HTTPMethod: "POST", URI: "/api/v1/upload/description", HTTPVersion: "HTTP/2", ResponseStatus: 200, ActionTaken: "LOG", MatchedRuleIDs: []int64{942430}, MatchedMessages: []string{"Restricted SQL Character Anomaly Detection (args): Disallowed character"}, MatchedData: []string{"'"}, MatchedVarName: "ARGS:file_description", RequestHeaders: map[string]string{"content-type": "application/json", "authorization": "Bearer ey…"}, RequestBody: "{\"description\":\"item's metadata\"}", TargetHost: "api.domain.com", LatencyUS: 2100},
		{TransactionID: "log_908123420", Timestamp: "2026-08-24T19:35:12Z", NodeID: "b1a2c3d4-0001", SiteID: "site-002", ClientIP: "203.0.113.88", Country: "SG", ASN: "AS16509", HTTPMethod: "GET", URI: "/checkout?coupon=UNION%20SELECT%20*%20FROM%20users", HTTPVersion: "HTTP/2", ResponseStatus: 403, ActionTaken: "DENY", MatchedRuleIDs: []int64{942100, 900001}, MatchedMessages: []string{"SQL Injection Attack Detected via libinjection", "Custom SQL Injection Pattern Detected"}, MatchedData: []string{"UNION SELECT * FROM users"}, MatchedVarName: "ARGS:coupon", RequestHeaders: map[string]string{"user-agent": "curl/8.6.0"}, TargetHost: "shop.domain.com", LatencyUS: 1310},
	}
}
