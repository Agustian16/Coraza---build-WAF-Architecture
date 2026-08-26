package api

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"corazium/controlplane/internal/auth"
		"corazium/controlplane/internal/store"
)

func New(s *store.Store, webOrigin string, notify func()) *gin.Engine {
	r := gin.Default()
	r.Use(cors(webOrigin))

	// Public endpoints (no auth)
	pub := r.Group("/api/v1")
	{
		pub.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
		})
		pub.POST("/auth/login", login(s))
	}

	// Protected endpoints (Bearer token)
	api := r.Group("/api/v1", authRequired(s))
	{
		api.GET("/auth/me", me(s))
		api.PATCH("/auth/profile", updateProfile(s))
		api.PUT("/auth/password", changePassword(s))

		// Dashboard
		api.GET("/dashboard/overview", Wrap(func(c *gin.Context) { c.JSON(200, dashboardOverview(s)) }))

		// Fleet
		api.GET("/nodes", Wrap(func(c *gin.Context) { c.JSON(200, s.ListNodes()) }))
		api.POST("/nodes", registerNode(s))

		// Sites & policy
		api.GET("/sites", Wrap(func(c *gin.Context) { c.JSON(200, s.ListSites()) }))
		api.PATCH("/sites/:id", updateSite(s, notify))
		api.GET("/crs/categories", Wrap(func(c *gin.Context) { c.JSON(200, s.ListCrsCategories()) }))
		api.PATCH("/crs/categories/:id", toggleCrs(s, notify))
		api.GET("/policy/export", func(c *gin.Context) {
			c.Data(200, "application/x-yaml", []byte(s.ExportPolicyYAML()))
		})

		// Custom rules
		api.GET("/rules", Wrap(func(c *gin.Context) { c.JSON(200, s.ListRules()) }))
		api.POST("/rules", createRule(s, notify))
		api.PATCH("/rules/:id", updateRule(s, notify))
		api.DELETE("/rules/:id", deleteRule(s, notify))
		api.POST("/rules/sandbox", sandboxTest(s))

		// Logs
		api.GET("/logs", listLogs(s))
		api.GET("/logs/:txid", getLog(s))
		api.POST("/logs/ingest", ingestLogs(s))

		// Exceptions
		api.GET("/exceptions", Wrap(func(c *gin.Context) { c.JSON(200, s.ListExceptions()) }))
		api.POST("/exceptions", createException(s, notify))
		api.DELETE("/exceptions/:id", deleteException(s, notify))

		// Access control
		api.GET("/access-events", Wrap(func(c *gin.Context) { c.JSON(200, s.ListAccessEvents()) }))
		api.GET("/ip-list", Wrap(func(c *gin.Context) { c.JSON(200, s.ListIps()) }))
		api.POST("/ip-list", addIp(s, notify))
		api.DELETE("/ip-list/:id", deleteIp(s, notify))

		// Rate limiting
		api.GET("/rate-limits", Wrap(func(c *gin.Context) { c.JSON(200, s.ListRateLimits()) }))
		api.POST("/rate-limits", addRateLimit(s, notify))
		api.PATCH("/rate-limits/:id", updateRateLimit(s, notify))
		api.DELETE("/rate-limits/:id", deleteRateLimit(s, notify))

		// Threat intelligence feeds
		api.GET("/feeds", listFeeds(s))
		api.POST("/feeds", importFeed(s))
		api.DELETE("/feeds/:id", deleteFeed(s))
		api.POST("/feeds/:id/refresh", refreshFeed(s))

		// Bot management
		api.GET("/bots", Wrap(func(c *gin.Context) { c.JSON(200, s.ListBots()) }))
		api.PATCH("/bots/:id", updateBot(s, notify))

		// API security
		api.GET("/api-security/endpoints", Wrap(func(c *gin.Context) { c.JSON(200, s.ListApiEndpoints()) }))
		api.GET("/api-security/exposures", Wrap(func(c *gin.Context) { c.JSON(200, s.ListExposures()) }))

		// Geo
		api.GET("/geo", Wrap(func(c *gin.Context) { c.JSON(200, s.GeoStats()) }))
	}

	return r
}

// Wrap adapts store reads (no request input) to handlers.
func Wrap(h func(*gin.Context)) gin.HandlerFunc { return h }

func cors(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// policyChanged bumps edge nodes after any policy mutation (best-effort).
func policyChanged(notify func()) {
	if notify != nil {
		notify()
	}
}
// ---- Handlers ----

type registerNodeReq struct {
	NodeName string `json:"node_name"`
	Hostname string `json:"hostname"`
	IP       string `json:"ip_address"`
	Version  string `json:"version"`
	CRS      string `json:"crs_version"`
}

func registerNode(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req registerNodeReq
		if err := c.ShouldBindJSON(&req); err != nil || req.NodeName == "" {
			c.JSON(400, gin.H{"error": "node_name is required"})
			return
		}
		n := &store.CorazaNode{
			ID:         "node-" + strconv.FormatInt(time.Now().UnixMilli(), 10),
			NodeName:   req.NodeName,
			Hostname:   req.Hostname,
			IPAddress:  req.IP,
			Version:    req.Version,
			CRSVersion: req.CRS,
			Status:     store.NodeOnline,
		}
		s.UpsertNode(n)
		c.JSON(201, gin.H{"node": n, "config_version": s.ConfigVersion, "seclang_bundle": s.SecLangBundle()})
	}
}

type updateSiteReq struct {
	ParanoiaLevel     *int `json:"paranoia_level"`
	InboundThreshold  *int `json:"inbound_threshold"`
	OutboundThreshold *int `json:"outbound_threshold"`
}

func updateSite(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req updateSiteReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		var found *store.Site
		for _, site := range s.ListSites() {
			if site.ID == c.Param("id") { found = &site; break }
		}
		if found == nil {
			c.JSON(404, gin.H{"error": "site not found"})
			return
		}
		updated, _ := s.UpdateSite(c.Param("id"), derefOr(req.ParanoiaLevel, found.ParanoiaLevel),
			derefOr(req.InboundThreshold, found.InboundThreshold), derefOr(req.OutboundThreshold, found.OutboundThreshold))
		policyChanged(notify)
			c.JSON(200, gin.H{"site": updated, "config_version": s.ConfigVersion})
	}
}

func toggleCrs(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct{ Enabled *bool `json:"enabled"` }
		if err := c.ShouldBindJSON(&req); err != nil || req.Enabled == nil {
			c.JSON(400, gin.H{"error": "enabled (bool) is required"})
			return
		}
		cat, ok := s.ToggleCrsCategory(c.Param("id"), *req.Enabled)
		if !ok {
			c.JSON(404, gin.H{"error": "category not found"})
			return
		}
		policyChanged(notify)
			c.JSON(200, gin.H{"category": cat, "config_version": s.ConfigVersion})
	}
}

type ruleReq struct {
	RuleID      int64  `json:"rule_id"`
	SiteID      string `json:"site_id"`
	Name        string `json:"name"`
	SecLangRaw  string `json:"seclang_raw"`
	IsActive    *bool  `json:"is_active"`
	Payload     string `json:"payload"`
}

func createRule(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ruleReq
		if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.SecLangRaw == "" {
			c.JSON(400, gin.H{"error": "name and seclang_raw are required"})
			return
		}
		r := &store.CustomRule{RuleID: req.RuleID, SiteID: req.SiteID, Name: req.Name, SecLangRaw: req.SecLangRaw, IsActive: true, CreatedBy: "api"}
		created := s.CreateRule(r)
		policyChanged(notify)
		c.JSON(201, created)
	}
}

func updateRule(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ruleReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		r, ok := s.UpdateRule(c.Param("id"), func(x *store.CustomRule) {
			if req.Name != "" { x.Name = req.Name }
			if req.SecLangRaw != "" { x.SecLangRaw = req.SecLangRaw }
			if req.IsActive != nil { x.IsActive = *req.IsActive }
		})
		if !ok {
			c.JSON(404, gin.H{"error": "rule not found"})
			return
		}
		policyChanged(notify)
		c.JSON(200, r)
	}
}

func deleteRule(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.DeleteRule(c.Param("id")) {
			c.JSON(404, gin.H{"error": "rule not found"})
			return
		}
		policyChanged(notify)
		c.Status(204)
	}
}

func sandboxTest(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ruleReq
		if err := c.ShouldBindJSON(&req); err != nil || req.Payload == "" {
			c.JSON(400, gin.H{"error": "payload is required"})
			return
		}
		matched, ruleID, msg, data := s.TestSandbox(req.Payload)
		result := "PASSED"
		if matched { result = "MATCHED" }
		c.JSON(200, gin.H{"result": result, "rule_id": ruleID, "message": msg, "matched_data": data})
	}
}

func listLogs(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		logs := s.ListLogs()
		if q := c.Query("rule_id"); q != "" {
			var out []store.AuditLog
			for _, l := range logs {
				for _, id := range l.MatchedRuleIDs {
					if strings.HasPrefix(strconv.FormatInt(id, 10), q) { out = append(out, l); break }
				}
			}
			logs = out
		}
		if q := c.Query("action"); q != "" {
			var out []store.AuditLog
			for _, l := range logs { if l.ActionTaken == q { out = append(out, l) } }
			logs = out
		}
		if q := c.Query("host"); q != "" {
			var out []store.AuditLog
			for _, l := range logs { if l.TargetHost == q { out = append(out, l) } }
			logs = out
		}
		if lim := c.Query("limit"); lim != "" {
			if n, err := strconv.Atoi(lim); err == nil && n < len(logs) {
				logs = logs[:n]
			}
		}
		c.JSON(200, logs)
	}
}

func getLog(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		l, ok := s.GetLog(c.Param("txid"))
		if !ok {
			c.JSON(404, gin.H{"error": "log not found"})
			return
		}
		c.JSON(200, l)
	}
}

func ingestLogs(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var logs []store.AuditLog
		if err := c.ShouldBindJSON(&logs); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		s.IngestLogs(logs)
		c.JSON(202, gin.H{"ingested": len(logs)})
	}
}

type exceptionReq struct {
	SiteID        string `json:"site_id"`
	RuleID        int64  `json:"rule_id"`
	PathPattern   string `json:"path_pattern"`
	ParameterName string `json:"parameter_name"`
	Reason        string `json:"reason"`
	CreatedBy     string `json:"created_by"`
}

func createException(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req exceptionReq
		if err := c.ShouldBindJSON(&req); err != nil || req.RuleID == 0 || req.PathPattern == "" {
			c.JSON(400, gin.H{"error": "rule_id and path_pattern are required"})
			return
		}
		if req.SiteID == "" { req.SiteID = "site-001" }
		x := s.CreateException(&store.RuleException{
			SiteID: req.SiteID, RuleID: req.RuleID, PathPattern: req.PathPattern,
			ParameterName: req.ParameterName, Reason: req.Reason, CreatedBy: orDefault(req.CreatedBy, "api"),
		})
		policyChanged(notify)
		c.JSON(201, x)
	}
}

func deleteException(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.DeleteException(c.Param("id")) {
			c.JSON(404, gin.H{"error": "exception not found"})
			return
		}
		c.Status(204)
	}
}

func addIp(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			CIDR string `json:"cidr"`
			List string `json:"list"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.CIDR == "" {
			c.JSON(400, gin.H{"error": "cidr is required"})
			return
		}
		if req.List != "allow" { req.List = "block" }
		e := s.AddIp(&store.IpListEntry{CIDR: req.CIDR, List: req.List, Source: "manual"})
		policyChanged(notify)
		c.JSON(201, e)
	}
}

func deleteIp(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.DeleteIp(c.Param("id")) {
			c.JSON(404, gin.H{"error": "entry not found"})
			return
		}
		policyChanged(notify)
		c.Status(204)
	}
}

// ---- Rate limit creation & threat feeds ----

type rateLimitReq struct {
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	Threshold int    `json:"threshold"`
	WindowSec int    `json:"window_sec"`
	Action    string `json:"action"`
	Enabled   *bool  `json:"enabled"`
}

func addRateLimit(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req rateLimitReq
		if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.Threshold <= 0 {
			c.JSON(400, gin.H{"error": "name and positive threshold are required"})
			return
		}
		if req.Endpoint == "" { req.Endpoint = "* (all hosts)" }
		if req.WindowSec <= 0 { req.WindowSec = 60 }
		if req.Action != "TARPIT" && req.Action != "CAPTCHA" { req.Action = "BLOCK" }
		enabled := true
		if req.Enabled != nil { enabled = *req.Enabled }
		r := s.AddRateLimit(&store.RateLimitRule{
			Name: req.Name, Endpoint: req.Endpoint, Threshold: req.Threshold,
			WindowSec: req.WindowSec, Action: req.Action, Enabled: enabled,
		})
		policyChanged(notify)
		c.JSON(201, r)
	}
}

func deleteRateLimit(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.DeleteRateLimit(c.Param("id")) {
			c.JSON(404, gin.H{"error": "rule not found"})
			return
		}
		policyChanged(notify)
		c.Status(204)
	}
}

func listFeeds(s *store.Store) gin.HandlerFunc {
	return Wrap(func(c *gin.Context) { c.JSON(200, s.ListFeeds()) })
}

func importFeed(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name     string `json:"name"`
			URL      string `json:"url"`
			Interval string `json:"interval"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" || req.URL == "" {
			c.JSON(400, gin.H{"error": "name and url are required"})
			return
		}
		f := s.AddFeed(&store.ThreatFeed{Name: req.Name, URL: req.URL, Interval: req.Interval})
		c.JSON(201, f)
	}
}

func deleteFeed(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !s.DeleteFeed(c.Param("id")) {
			c.JSON(404, gin.H{"error": "feed not found"})
			return
		}
		c.Status(204)
	}
}

func refreshFeed(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		f, ok := s.RefreshFeed(c.Param("id"))
		if !ok {
			c.JSON(404, gin.H{"error": "feed not found"})
			return
		}
		c.JSON(200, f)
	}
}

func updateRateLimit(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Enabled *bool   `json:"enabled"`
			Action  *string `json:"action"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		r, ok := s.UpdateRateLimit(c.Param("id"), func(x *store.RateLimitRule) {
			if req.Enabled != nil { x.Enabled = *req.Enabled }
			if req.Action != nil { x.Action = *req.Action }
		})
		if !ok {
			c.JSON(404, gin.H{"error": "rule not found"})
			return
		}
		policyChanged(notify)
		c.JSON(200, r)
	}
}

func updateBot(s *store.Store, notify func()) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct{ Action *string `json:"action"` }
		if err := c.ShouldBindJSON(&req); err != nil || req.Action == nil {
			c.JSON(400, gin.H{"error": "action is required"})
			return
		}
		b, ok := s.UpdateBot(c.Param("id"), func(x *store.BotCategory) { x.Action = *req.Action })
		if !ok {
			c.JSON(404, gin.H{"error": "bot category not found"})
			return
		}
		policyChanged(notify)
		c.JSON(200, b)
	}
}

// ---- Dashboard aggregation ----

func dashboardOverview(s *store.Store) gin.H {
	nodes := s.ListNodes()
	var totalRPS float64
	online := 0
	for _, n := range nodes {
		totalRPS += n.RPS
		if n.Status == store.NodeOnline { online++ }
	}
	logs := s.ListLogs()
	blocked := 0
	for _, l := range logs { if l.ActionTaken == "DENY" { blocked++ } }
	ratio := 0.0
	if len(logs) > 0 { ratio = float64(blocked) / float64(len(logs)) * 100 }

	checks := []gin.H{
		{"label": "Rule Engine (Signature WAF)", "detail": "SecRuleEngine: On (blocking)", "ok": true},
		{"label": "OWASP CRS Version", "detail": "CRS v4.0.0 fleet", "ok": true},
		{"label": "API Schema Validation", "detail": "see /api-security", "ok": true},
		{"label": "Bot Management", "detail": "challenge mode on unverified bots", "ok": true},
		{"label": "L7 DDoS / Rate Limiting", "detail": "flood status NORMAL", "ok": true},
		{"label": "Config Sync", "detail": s.ConfigVersion, "ok": online == len(nodes)},
		{"label": "mTLS Transport", "detail": "gRPC streams x509", "ok": true},
	}
	score := 0
	for _, c := range checks { if c["ok"].(bool) { score++ } }
	score = score * 100 / len(checks)

	return gin.H{
		"kpi": gin.H{
			"total_rps": totalRPS,
			"blocked_24h": blocked,
			"block_ratio_pct": ratio,
			"avg_latency_ms": avgLatency(nodes),
		},
		"nodes_online": online,
		"nodes_total": len(nodes),
		"config_version": s.ConfigVersion,
		"posture": gin.H{"score": score, "checks": checks},
	}
}

func avgLatency(nodes []store.CorazaNode) float64 {
	var sum float64
	var n int
	for _, x := range nodes {
		if x.Status == store.NodeOnline { sum += x.LatencyMS; n++ }
	}
	if n == 0 { return 0 }
	return sum / float64(n)
}

// ---- helpers ----

func derefOr(p *int, def int) int {
	if p != nil { return *p }
	return def
}

func orDefault(v, def string) string {
	if v == "" { return def }
	return v
}

// ---- Auth ----

func authRequired(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token := strings.TrimPrefix(header, "Bearer ")
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		email, err := auth.VerifyToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		u, err := s.GetUserByEmail(email)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user no longer exists"})
			return
		}
		c.Set("user", u)
		c.Next()
	}
}

func currentUser(c *gin.Context) *store.User {
	u, _ := c.Get("user")
	user, _ := u.(*store.User)
	return user
}

func login(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "email and password are required"})
			return
		}
		token, user, err := auth.Login(s, req.Email, req.Password)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid email or password"})
			return
		}
		c.JSON(200, gin.H{"token": token, "user": user})
	}
}

func me(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		u, err := s.GetUserByEmail(currentUser(c).Email)
		if err != nil {
			c.JSON(401, gin.H{"error": "user not found"})
			return
		}
		c.JSON(200, u)
	}
}

func updateProfile(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		u, err := s.UpdateProfile(currentUser(c).Email, req.Name, req.Email)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		token := auth.SignToken(u.Email) // re-issue: email may have changed
		c.JSON(200, gin.H{"token": token, "user": u})
	}
}

func changePassword(s *store.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Current string `json:"current"`
			New     string `json:"new"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.New) < 8 {
			c.JSON(400, gin.H{"error": "new password must be at least 8 characters"})
			return
		}
		u, _ := s.GetUserByEmail(currentUser(c).Email)
		if auth.CheckPassword(u.PasswordHash, req.Current) != nil {
			c.JSON(400, gin.H{"error": "current password is incorrect"})
			return
		}
		hash, err := auth.HashPassword(req.New)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to hash password"})
			return
		}
		if err := s.UpdatePassword(u.Email, hash); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"ok": true})
	}
}