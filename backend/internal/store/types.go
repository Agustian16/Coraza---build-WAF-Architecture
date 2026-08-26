// Package store holds control-plane state. It runs on an in-memory seed by
// default and transparently persists to PostgreSQL / ClickHouse when those
// services are configured (docker-compose / k8s).
package store

// Types mirror the frontend's src/lib/types.ts 1:1 (snake_case JSON).

type NodeStatus string
type SyncStatus string

const (
	NodeOnline    NodeStatus = "ONLINE"
	NodeWarn      NodeStatus = "WARN"
	NodeOffline   NodeStatus = "OFFLINE"
	SyncInSync    SyncStatus = "IN_SYNC"
	SyncPending   SyncStatus = "PENDING_UPDATE"
)

type CorazaNode struct {
	ID             string     `json:"id"`
	NodeName       string     `json:"node_name"`
	Hostname       string     `json:"hostname"`
	IPAddress      string     `json:"ip_address"`
	Version        string     `json:"version"`
	Status         NodeStatus `json:"status"`
	CRSVersion     string     `json:"crs_version"`
	CPUPct         float64    `json:"cpu_pct"`
	MemPct         float64    `json:"mem_pct"`
	RPS            float64    `json:"rps"`
	LatencyMS      float64    `json:"latency_ms"`
	SyncStatus     SyncStatus `json:"sync_status"`
	ConfigVersion  string     `json:"config_version"`
	LastHeartbeat  string     `json:"last_heartbeat"`
}

type Site struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	DomainName        string `json:"domain_name"`
	ParanoiaLevel     int    `json:"paranoia_level"`
	InboundThreshold  int    `json:"inbound_threshold"`
	OutboundThreshold int    `json:"outbound_threshold"`
}

type CrsCategory struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	RulePrefix  string `json:"rule_prefix"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	RuleCount   int    `json:"rule_count"`
}

type CustomRule struct {
	ID         string `json:"id"`
	RuleID     int64  `json:"rule_id"`
	SiteID     string `json:"site_id"`
	Name       string `json:"name"`
	SecLangRaw string `json:"seclang_raw"`
	IsActive   bool   `json:"is_active"`
	CreatedBy  string `json:"created_by"`
	CreatedAt  string `json:"created_at"`
}

type AuditLog struct {
	TransactionID   string            `json:"transaction_id"`
	Timestamp       string            `json:"timestamp"`
	NodeID          string            `json:"node_id"`
	SiteID          string            `json:"site_id"`
	ClientIP        string            `json:"client_ip"`
	Country         string            `json:"country"`
	ASN             string            `json:"asn"`
	HTTPMethod      string            `json:"http_method"`
	URI             string            `json:"uri"`
	HTTPVersion     string            `json:"http_version"`
	ResponseStatus  int               `json:"response_status"`
	ActionTaken     string            `json:"action_taken"`
	MatchedRuleIDs  []int64           `json:"matched_rule_ids"`
	MatchedMessages []string          `json:"matched_messages"`
	MatchedData     []string          `json:"matched_data"`
	MatchedVarName  string            `json:"matched_var_name"`
	RequestHeaders  map[string]string `json:"request_headers"`
	RequestBody     string            `json:"request_body"`
	TargetHost      string            `json:"target_host"`
	LatencyUS       uint64            `json:"latency_us"`
}

type RuleException struct {
	ID            string `json:"id"`
	SiteID        string `json:"site_id"`
	RuleID        int64  `json:"rule_id"`
	PathPattern   string `json:"path_pattern"`
	ParameterName string `json:"parameter_name"`
	Reason        string `json:"reason"`
	CreatedAt     string `json:"created_at"`
	CreatedBy     string `json:"created_by"`
}

type IpListEntry struct {
	ID      string `json:"id"`
	CIDR    string `json:"cidr"`
	List    string `json:"list"` // allow | block
	Source  string `json:"source"`
	AddedAt string `json:"added_at"`
}

type AccessEvent struct {
	ID        string   `json:"id"`
	Action    string   `json:"action"` // ALLOW | DENY | LOG
	Address   string   `json:"address"`
	Type      string   `json:"type"`
	RuleName  string   `json:"rule_name"`
	AttackIP  string   `json:"attack_ip"`
	Time      string   `json:"time"`
	LogIDs    []string `json:"log_ids"`
}

type RateLimitRule struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Endpoint   string `json:"endpoint"`
	Threshold  int    `json:"threshold"`
	WindowSec  int    `json:"window_sec"`
	Action     string `json:"action"` // BLOCK | TARPIT | CAPTCHA
	Enabled    bool   `json:"enabled"`
}

type BotCategory struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	UAPattern string `json:"ua_pattern"`
	Verified  bool   `json:"verified"`
	Action    string `json:"action"` // ALLOW | LOG | CHALLENGE | BLOCK
	Hits24h   int64  `json:"hits_24h"`
}

type ApiEndpoint struct {
	ID            string `json:"id"`
	Method        string `json:"method"`
	Path          string `json:"path"`
	Host          string `json:"host"`
	SpecStatus    string `json:"spec_status"` // VALIDATED | DRIFTED | UNSPECIFIED
	Violations24h int    `json:"violations_24h"`
	Auth          string `json:"auth"` // JWT | API_KEY | NONE
}

type DataExposure struct {
	ID            string `json:"id"`
	DataType      string `json:"data_type"`
	Endpoint      string `json:"endpoint"`
	Location      string `json:"location"`
	Occurrences24h int   `json:"occurrences_24h"`
	ActionTaken   string `json:"action_taken"`
}

type GeoStat struct {
	Country  string  `json:"country"`
	Code     string  `json:"code"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Requests int64   `json:"requests"`
	Blocked  int64   `json:"blocked"`
}

type ThreatFeed struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Interval string `json:"interval"` // e.g. "6h"
	Status   string `json:"status"`   // SYNCED | PENDING | ERROR
	LastSync string `json:"last_sync"`
}

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	PasswordHash string `json:"-"`
}