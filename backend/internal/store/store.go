package store

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store is the in-memory state of the control plane. It is seeded with demo
// data (SEED_DEMO=true) and is the source of truth pushed to edge nodes over
// gRPC. When PostgreSQL/ClickHouse are configured the same structs are
// persisted/loaded through db.go.
type Store struct {
	mu sync.RWMutex

	Nodes      map[string]*CorazaNode
	Sites      map[string]*Site
	CrsCats    map[string]*CrsCategory
	Rules      map[string]*CustomRule
	Exceptions map[string]*RuleException
	IpList     map[string]*IpListEntry
	AccessEvts map[string]*AccessEvent
	RateLimits map[string]*RateLimitRule
	Bots       map[string]*BotCategory
	ApiEps     map[string]*ApiEndpoint
	Exposures  map[string]*DataExposure
	Feeds      map[string]*ThreatFeed
	Geo        []GeoStat
	Logs       []AuditLog

	// ConfigVersion is bumped on every policy mutation and pushed to nodes.
	ConfigVersion string
	VersionSeq    int

	// Optional backends (nil when not configured)
	Pool      *pgxpool.Pool // nil => in-memory mode
	ClickHouse interface{}
	Redis     interface{}
}

func New() *Store {
	return &Store{
		Nodes:      map[string]*CorazaNode{},
		Sites:      map[string]*Site{},
		CrsCats:    map[string]*CrsCategory{},
		Rules:      map[string]*CustomRule{},
		Exceptions: map[string]*RuleException{},
		IpList:     map[string]*IpListEntry{},
		AccessEvts: map[string]*AccessEvent{},
		RateLimits: map[string]*RateLimitRule{},
		Bots:       map[string]*BotCategory{},
		ApiEps:     map[string]*ApiEndpoint{},
		Exposures:  map[string]*DataExposure{},
		Feeds:      map[string]*ThreatFeed{},

		ConfigVersion: "v104",
		VersionSeq:    104,
	}
}

func (s *Store) nextVersion() string {
	s.VersionSeq++
	s.ConfigVersion = fmt.Sprintf("v%03d", s.VersionSeq)
	return s.ConfigVersion
}

// MarkSynced flags a node as IN_SYNC once it acks a config version.
func (s *Store) MarkSynced(nodeID, version string) {
	s.mu.Lock(); defer s.mu.Unlock()
	if n, ok := s.Nodes[nodeID]; ok && version == s.ConfigVersion {
		n.SyncStatus = SyncInSync
		n.ConfigVersion = version
	}
}

// DefaultPolicy returns the first site's tuning (or sane defaults) for gRPC pushes.
func (s *Store) DefaultPolicy() (paranoia, inbound, outbound int) {
	paranoia, inbound, outbound = 1, 5, 4
	for _, site := range s.Sites {
		return site.ParanoiaLevel, site.InboundThreshold, site.OutboundThreshold
	}
	return
}

func now() string { return time.Now().UTC().Format(time.RFC3339) }

// ---- Nodes ----

func (s *Store) ListNodes() []CorazaNode {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]CorazaNode, 0, len(s.Nodes))
	for _, n := range s.Nodes { out = append(out, *n) }
	return out
}

func (s *Store) UpsertNode(n *CorazaNode) {
	s.mu.Lock(); defer s.mu.Unlock()
	if old, ok := s.Nodes[n.ID]; ok {
		n.ConfigVersion = old.ConfigVersion
		n.SyncStatus = old.SyncStatus
	} else {
		n.ConfigVersion = s.ConfigVersion
		n.SyncStatus = SyncInSync
	}
	n.LastHeartbeat = now()
	s.Nodes[n.ID] = n
}

func (s *Store) Heartbeat(nodeID string, cpu, mem, rps, latency float64, cfgVer string) (desired string, ok bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	n, exists := s.Nodes[nodeID]
	if !exists { return "", false }
	n.CPUPct, n.MemPct, n.RPS, n.LatencyMS = cpu, mem, rps, latency
	n.LastHeartbeat = now()
	n.Status = NodeOnline
	if cfgVer != "" && cfgVer != s.ConfigVersion {
		n.SyncStatus = SyncPending
		return s.ConfigVersion, true
	}
	n.SyncStatus = SyncInSync
	return "", true
}

// ---- Sites / policy ----

func (s *Store) ListSites() []Site {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]Site, 0, len(s.Sites))
	for _, x := range s.Sites { out = append(out, *x) }
	return out
}

func (s *Store) UpdateSite(id string, paranoia, in, out int) (*Site, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	site, ok := s.Sites[id]
	if !ok { return nil, false }
	site.ParanoiaLevel, site.InboundThreshold, site.OutboundThreshold = paranoia, in, out
	s.nextVersion()
	s.saveSiteRow(context.Background(), site)
	cp := *site
	return &cp, true
}

func (s *Store) ListCrsCategories() []CrsCategory {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]CrsCategory, 0, len(s.CrsCats))
	for _, x := range s.CrsCats { out = append(out, *x) }
	return out
}

func (s *Store) ToggleCrsCategory(id string, enabled bool) (*CrsCategory, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	c, ok := s.CrsCats[id]
	if !ok { return nil, false }
	c.Enabled = enabled
	s.nextVersion()
	s.saveCrsRow(context.Background(), c)
	cp := *c
	return &cp, true
}

// SecLangBundle renders the full config pushed to nodes on enroll/sync.
func (s *Store) SecLangBundle() string {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := "# Corazium managed SecLang bundle\n"
	out += fmt.Sprintf("# config %s generated %s\n\n", s.ConfigVersion, now())
	out += "SecRuleEngine On\n\n"
	for _, c := range s.CrsCats {
		state := "On"
		if !c.Enabled { state = "Off" }
		out += fmt.Sprintf("# CRS category %s (%s): %s\n", c.Name, c.RulePrefix, state)
	}
	out += "\n"
	for _, r := range s.Rules {
		if r.IsActive { out += r.SecLangRaw + "\n\n" }
	}
	for _, x := range s.Exceptions {
		out += fmt.Sprintf("# exception: disable rule %d for %s (%s)\n",
			x.RuleID, x.PathPattern, x.ParameterName)
		out += fmt.Sprintf("SecRuleUpdateTargetById %d \"!%s\"\n\n", x.RuleID, x.ParameterName)
	}
	return out
}

// ---- Custom rules ----

func (s *Store) ListRules() []CustomRule {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]CustomRule, 0, len(s.Rules))
	for _, x := range s.Rules { out = append(out, *x) }
	return out
}

func (s *Store) CreateRule(r *CustomRule) *CustomRule {
	s.mu.Lock(); defer s.mu.Unlock()
	if r.ID == "" { r.ID = fmt.Sprintf("rule-%d", r.RuleID) }
	r.CreatedAt = now()
	s.Rules[r.ID] = r
	s.nextVersion()
	s.saveRuleRow(context.Background(), r)
	cp := *r
	return &cp
}

func (s *Store) UpdateRule(id string, mutate func(*CustomRule)) (*CustomRule, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	r, ok := s.Rules[id]
	if !ok { return nil, false }
	mutate(r)
	s.nextVersion()
	s.saveRuleRow(context.Background(), r)
	cp := *r
	return &cp, true
}

func (s *Store) DeleteRule(id string) bool {
	s.mu.Lock(); defer s.mu.Unlock()
	r, ok := s.Rules[id]
	if !ok { return false }
	delete(s.Rules, id)
	s.nextVersion()
	s.deleteRuleRow(context.Background(), r.RuleID)
	return true
}

// TestSandbox evaluates a payload against the current rule set. The real
// engine runs Coraza inline (go get github.com/corazawaf/coraza/v3); this
// build ships a deterministic matcher over the seeded rules so the API
// contract is stable without embedding the WAF in the control plane.
func (s *Store) TestSandbox(payload string) (matched bool, ruleID int64, msg, data string) {
	s.mu.RLock(); defer s.mu.RUnlock()
	signatures := []struct {
		ruleID int64
		msg    string
		re     string
	}{
		{942100, "SQL Injection Attack Detected via libinjection", "' or '1'='1"},
		{941100, "XSS Attack Detected via libinjection", "<script"},
		{930100, "Path Traversal Attack (/../)", "../"},
		{932100, "RCE - Command Injection", "; cat "},
	}
	for _, sig := range signatures {
		if containsFold(payload, sig.re) {
			for _, r := range s.Rules {
				if r.IsActive && containsFold(r.SecLangRaw, fmt.Sprintf("id:%d", sig.ruleID)) {
					return true, sig.ruleID, r.Name, sig.re
				}
			}
			return true, sig.ruleID, sig.msg, sig.re
		}
	}
	return false, 0, "", ""
}

func containsFold(haystack, needle string) bool {
	h, n := []rune(haystack), []rune(needle)
	for i := 0; i+len(n) <= len(h); i++ {
		match := true
		for j := range n {
			a, b := lower(h[i+j]), lower(n[j])
			if a != b { match = false; break }
		}
		if match { return true }
	}
	return false
}

func lower(r rune) rune {
	if r >= 'A' && r <= 'Z' { return r + 32 }
	return r
}

// ---- Exceptions ----

func (s *Store) ListExceptions() []RuleException {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]RuleException, 0, len(s.Exceptions))
	for _, x := range s.Exceptions { out = append(out, *x) }
	return out
}

func (s *Store) CreateException(x *RuleException) *RuleException {
	s.mu.Lock(); defer s.mu.Unlock()
	x.ID = fmt.Sprintf("exc-%06d", len(s.Exceptions)+1)
	x.CreatedAt = now()
	s.Exceptions[x.ID] = x
	s.nextVersion()
	s.saveExceptionRow(context.Background(), x)
	cp := *x
	return &cp
}

func (s *Store) DeleteException(id string) bool {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.Exceptions[id]; !ok { return false }
	delete(s.Exceptions, id)
	s.nextVersion()
	s.deleteExceptionRow(context.Background(), id)
	return true
}

// ---- IP list ----

func (s *Store) ListIps() []IpListEntry {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]IpListEntry, 0, len(s.IpList))
	for _, x := range s.IpList { out = append(out, *x) }
	return out
}

func (s *Store) AddIp(e *IpListEntry) *IpListEntry {
	s.mu.Lock(); defer s.mu.Unlock()
	e.ID = fmt.Sprintf("ip-%d", len(s.IpList)+1)
	e.AddedAt = now()
	s.IpList[e.ID] = e
	s.nextVersion()
	s.saveIpRow(context.Background(), e)
	cp := *e
	return &cp
}

func (s *Store) DeleteIp(id string) bool {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.IpList[id]; !ok { return false }
	delete(s.IpList, id)
	s.nextVersion()
	s.deleteIpRow(context.Background(), id)
	return true
}

// ---- Threat feeds ----

func (s *Store) ListFeeds() []ThreatFeed {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]ThreatFeed, 0, len(s.Feeds))
	for _, x := range s.Feeds { out = append(out, *x) }
	return out
}

func (s *Store) AddFeed(f *ThreatFeed) *ThreatFeed {
	s.mu.Lock(); defer s.mu.Unlock()
	f.ID = fmt.Sprintf("feed-%03d", len(s.Feeds)+1)
	if f.Interval == "" { f.Interval = "6h" }
	f.Status = "PENDING"
	s.Feeds[f.ID] = f
	s.saveFeedRow(context.Background(), f)
	cp := *f
	return &cp
}

func (s *Store) DeleteFeed(id string) bool {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.Feeds[id]; !ok { return false }
	delete(s.Feeds, id)
	s.deleteFeedRow(context.Background(), id)
	return true
}

// RefreshFeed simulates a feed pull: in production the Asynq task fetches the
// URL, parses CIDRs and merges them into the blocklist.
func (s *Store) RefreshFeed(id string) (*ThreatFeed, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	f, ok := s.Feeds[id]
	if !ok { return nil, false }
	f.Status = "SYNCED"
	f.LastSync = now()
	s.saveFeedRow(context.Background(), f)
	cp := *f
	return &cp, true
}

// ---- Access events / rate limits / bots / api security ----

func (s *Store) ListAccessEvents() []AccessEvent {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]AccessEvent, 0, len(s.AccessEvts))
	for _, x := range s.AccessEvts { out = append(out, *x) }
	return out
}

func (s *Store) ListRateLimits() []RateLimitRule {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]RateLimitRule, 0, len(s.RateLimits))
	for _, x := range s.RateLimits { out = append(out, *x) }
	return out
}

func (s *Store) AddRateLimit(r *RateLimitRule) *RateLimitRule {
	s.mu.Lock(); defer s.mu.Unlock()
	r.ID = fmt.Sprintf("rl-%03d", len(s.RateLimits)+1)
	s.RateLimits[r.ID] = r
	s.nextVersion()
	s.saveRateLimitRow(context.Background(), r)
	cp := *r
	return &cp
}

func (s *Store) DeleteRateLimit(id string) bool {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.RateLimits[id]; !ok { return false }
	delete(s.RateLimits, id)
	s.nextVersion()
	s.deleteRateLimitRow(context.Background(), id)
	return true
}

func (s *Store) UpdateRateLimit(id string, mutate func(*RateLimitRule)) (*RateLimitRule, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	r, ok := s.RateLimits[id]
	if !ok { return nil, false }
	mutate(r)
	cp := *r
	s.saveRateLimitRow(context.Background(), r)
	return &cp, true
}

func (s *Store) ListBots() []BotCategory {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]BotCategory, 0, len(s.Bots))
	for _, x := range s.Bots { out = append(out, *x) }
	return out
}

func (s *Store) UpdateBot(id string, mutate func(*BotCategory)) (*BotCategory, bool) {
	s.mu.Lock(); defer s.mu.Unlock()
	b, ok := s.Bots[id]
	if !ok { return nil, false }
	mutate(b)
	cp := *b
	return &cp, true
}

func (s *Store) ListApiEndpoints() []ApiEndpoint {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]ApiEndpoint, 0, len(s.ApiEps))
	for _, x := range s.ApiEps { out = append(out, *x) }
	return out
}

func (s *Store) ListExposures() []DataExposure {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]DataExposure, 0, len(s.Exposures))
	for _, x := range s.Exposures { out = append(out, *x) }
	return out
}

// ---- Logs / geo ----

func (s *Store) ListLogs() []AuditLog {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]AuditLog, len(s.Logs))
	copy(out, s.Logs)
	return out
}

func (s *Store) IngestLogs(logs []AuditLog) {
	s.mu.Lock(); defer s.mu.Unlock()
	s.Logs = append(logs, s.Logs...)
	if len(s.Logs) > 100_000 { s.Logs = s.Logs[:100_000] }
}

func (s *Store) GetLog(txID string) (AuditLog, bool) {
	s.mu.RLock(); defer s.mu.RUnlock()
	for _, l := range s.Logs {
		if l.TransactionID == txID { return l, true }
	}
	return AuditLog{}, false
}

func (s *Store) GeoStats() []GeoStat {
	s.mu.RLock(); defer s.mu.RUnlock()
	out := make([]GeoStat, len(s.Geo))
	copy(out, s.Geo)
	return out
}

// ExportPolicyYAML renders the declarative GitOps policy (FR-5.3).
func (s *Store) ExportPolicyYAML() string {
	s.mu.RLock(); defer s.mu.RUnlock()
	y := "apiVersion: corazium.io/v1\nkind: WafPolicy\nmetadata:\n  name: coraza-policy\n  configVersion: " + s.ConfigVersion + "\nsites:\n"
	for _, site := range s.Sites {
		y += fmt.Sprintf("  - domain: %s\n    paranoiaLevel: %d\n    inboundThreshold: %d\n    outboundThreshold: %d\n",
			site.DomainName, site.ParanoiaLevel, site.InboundThreshold, site.OutboundThreshold)
	}
	y += "crsCategories:\n"
	for _, c := range s.CrsCats {
		y += fmt.Sprintf("  - prefix: \"%s\"\n    enabled: %t\n", c.RulePrefix, c.Enabled)
	}
	y += "customRules:\n"
	for _, r := range s.Rules {
		y += fmt.Sprintf("  - id: %d\n    name: %s\n    active: %t\n", r.RuleID, r.Name, r.IsActive)
	}
	y += "exceptions:\n"
	for _, x := range s.Exceptions {
		y += fmt.Sprintf("  - ruleId: %d\n    path: \"%s\"\n    parameter: %q\n", x.RuleID, x.PathPattern, x.ParameterName)
	}
	y += "ipLists:\n"
	for _, ip := range s.IpList {
		y += fmt.Sprintf("  - cidr: %s\n    list: %s\n", ip.CIDR, ip.List)
	}
	y += "rateLimits:\n"
	for _, rl := range s.RateLimits {
		y += fmt.Sprintf("  - name: %s\n    endpoint: %s\n    threshold: %d\n    windowSec: %d\n    action: %s\n    enabled: %t\n",
			rl.Name, rl.Endpoint, rl.Threshold, rl.WindowSec, rl.Action, rl.Enabled)
	}
	return y
}
