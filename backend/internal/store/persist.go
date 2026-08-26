package store

// Write-through persistence to PostgreSQL. Every policy mutation is mirrored
// to the database when Pool != nil, and state is reloaded on boot so policy
// survives container restarts.

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
)

// LoadFromPostgres replaces in-memory policy state with DB rows. Empty tables
// are seeded from the current (demo) state once, then loaded — so the first
// boot keeps demo data and every later boot restores persisted mutations.
func (s *Store) LoadFromPostgres(ctx context.Context) {
	if s.Pool == nil {
		return
	}
	s.seedIfEmpty(ctx)
	s.loadRules(ctx)
	s.loadExceptions(ctx)
	s.loadIps(ctx)
	s.loadRateLimits(ctx)
	s.loadFeeds(ctx)
	s.loadSites(ctx)
	s.loadCrsCategories(ctx)
	log.Println("[store] policy state loaded from postgres")
}

func (s *Store) seedIfEmpty(ctx context.Context) {
	var n int
	_ = s.Pool.QueryRow(ctx, `SELECT count(*) FROM custom_rules`).Scan(&n)
	if n == 0 {
		for _, r := range s.Rules {
			s.saveRuleRow(ctx, r)
		}
	}
	_ = s.Pool.QueryRow(ctx, `SELECT count(*) FROM rule_exceptions`).Scan(&n)
	if n == 0 {
		for _, x := range s.Exceptions {
			s.saveExceptionRow(ctx, x)
		}
	}
	_ = s.Pool.QueryRow(ctx, `SELECT count(*) FROM ip_list`).Scan(&n)
	if n == 0 {
		for _, ip := range s.IpList {
			s.saveIpRow(ctx, ip)
		}
	}
	_ = s.Pool.QueryRow(ctx, `SELECT count(*) FROM rate_limit_rules`).Scan(&n)
	if n == 0 {
		for _, r := range s.RateLimits {
			s.saveRateLimitRow(ctx, r)
		}
	}
	_ = s.Pool.QueryRow(ctx, `SELECT count(*) FROM sites`).Scan(&n)
	if n == 0 {
		for _, site := range s.Sites {
			_, _ = s.Pool.Exec(ctx, `INSERT INTO sites (id, name, domain_name, paranoia_level, inbound_threshold, outbound_threshold)
				VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (domain_name) DO NOTHING`,
				site.ID, site.Name, site.DomainName, site.ParanoiaLevel, site.InboundThreshold, site.OutboundThreshold)
		}
	}
}

func (s *Store) loadRules(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT coalesce(id::text,''), rule_id, coalesce(site_id::text,''), name, seclang_raw, is_active, coalesce(created_by,''), coalesce(created_at::text, '') FROM custom_rules`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var r CustomRule
		var createdAt pgxText
		if err := rows.Scan(&r.ID, &r.RuleID, &r.SiteID, &r.Name, &r.SecLangRaw, &r.IsActive, &r.CreatedBy, &createdAt); err == nil {
			r.CreatedAt = string(createdAt)
			s.Rules[r.ID] = &r
		}
	}
}

func (s *Store) loadExceptions(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, coalesce(site_id::text,'site-001'), rule_id, path_pattern, coalesce(parameter_name,''), coalesce(reason,''), created_at::text, coalesce(created_by,'api') FROM rule_exceptions`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var x RuleException
		if err := rows.Scan(&x.ID, &x.SiteID, &x.RuleID, &x.PathPattern, &x.ParameterName, &x.Reason, &x.CreatedAt, &x.CreatedBy); err == nil {
			s.Exceptions[x.ID] = &x
		}
	}
}

func (s *Store) loadIps(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, cidr, list, coalesce(source,'manual'), added_at::text FROM ip_list`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var e IpListEntry
		if err := rows.Scan(&e.ID, &e.CIDR, &e.List, &e.Source, &e.AddedAt); err == nil {
			s.IpList[e.ID] = &e
		}
	}
}

func (s *Store) loadRateLimits(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, name, endpoint, threshold, window_sec, action, enabled FROM rate_limit_rules`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var r RateLimitRule
		if err := rows.Scan(&r.ID, &r.Name, &r.Endpoint, &r.Threshold, &r.WindowSec, &r.Action, &r.Enabled); err == nil {
			s.RateLimits[r.ID] = &r
		}
	}
}

func (s *Store) loadFeeds(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, name, url, coalesce(interval,'6h'), coalesce(status,'PENDING'), coalesce(last_sync::text,'') FROM threat_feeds`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var f ThreatFeed
		if err := rows.Scan(&f.ID, &f.Name, &f.URL, &f.Interval, &f.Status, &f.LastSync); err == nil {
			s.Feeds[f.ID] = &f
		}
	}
}

func (s *Store) loadSites(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id::text, name, domain_name, paranoia_level, inbound_threshold, outbound_threshold FROM sites`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var site Site
		if err := rows.Scan(&site.ID, &site.Name, &site.DomainName, &site.ParanoiaLevel, &site.InboundThreshold, &site.OutboundThreshold); err == nil {
			s.Sites[site.ID] = &site
		}
	}
}

func (s *Store) loadCrsCategories(ctx context.Context) {
	rows, err := s.Pool.Query(ctx, `SELECT id, name, rule_prefix, description, enabled, rule_count FROM crs_categories`)
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var c CrsCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.RulePrefix, &c.Description, &c.Enabled, &c.RuleCount); err == nil {
			s.CrsCats[c.ID] = &c
		}
	}
}

type pgxText []byte

// ---- write-through helpers (best-effort; errors logged, never fatal) ----

func (s *Store) saveRuleRow(ctx context.Context, r *CustomRule) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `INSERT INTO custom_rules (rule_id, site_id, name, seclang_raw, is_active, created_by)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, $5, $6)
		ON CONFLICT (rule_id) DO UPDATE SET name=$3, seclang_raw=$4, is_active=$5, updated_at=now()`,
		r.RuleID, r.SiteID, r.Name, r.SecLangRaw, r.IsActive, r.CreatedBy)
	logErr("rule", err)
	if r.ID == "" {
		var id string
		if err := s.Pool.QueryRow(ctx, `SELECT id::text FROM custom_rules WHERE rule_id=$1`, r.RuleID).Scan(&id); err == nil {
			r.ID = id
		}
	}
}

func (s *Store) deleteRuleRow(ctx context.Context, ruleID int64) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `DELETE FROM custom_rules WHERE rule_id=$1`, ruleID)
	logErr("delete rule", err)
}

func (s *Store) saveExceptionRow(ctx context.Context, x *RuleException) {
	if s.Pool == nil { return }
	var exists bool
	_ = s.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM rule_exceptions WHERE rule_id=$1 AND path_pattern=$2)`, x.RuleID, x.PathPattern).Scan(&exists)
	if exists { return }
	_, err := s.Pool.Exec(ctx, `INSERT INTO rule_exceptions (site_id, rule_id, path_pattern, parameter_name, reason, created_by)
		VALUES (NULLIF($1,'')::uuid, $2, $3, NULLIF($4,''), $5, $6)`,
		x.SiteID, x.RuleID, x.PathPattern, x.ParameterName, x.Reason, x.CreatedBy)
	logErr("exception", err)
	var id string
	if err := s.Pool.QueryRow(ctx, `SELECT id::text FROM rule_exceptions WHERE rule_id=$1 AND path_pattern=$2`, x.RuleID, x.PathPattern).Scan(&id); err == nil {
		x.ID = id
	}
}

func (s *Store) deleteExceptionRow(ctx context.Context, id string) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `DELETE FROM rule_exceptions WHERE id=$1`, id)
	logErr("delete exception", err)
}

func (s *Store) saveIpRow(ctx context.Context, e *IpListEntry) {
	if s.Pool == nil { return }
	var exists bool
	_ = s.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM ip_list WHERE cidr=$1 AND list=$2)`, e.CIDR, e.List).Scan(&exists)
	if exists { return }
	_, err := s.Pool.Exec(ctx, `INSERT INTO ip_list (cidr, list, source) VALUES ($1,$2,$3)`, e.CIDR, e.List, e.Source)
	logErr("ip", err)
	var id string
	if err := s.Pool.QueryRow(ctx, `SELECT id::text FROM ip_list WHERE cidr=$1 AND list=$2`, e.CIDR, e.List).Scan(&id); err == nil {
		e.ID = id
	}
}

func (s *Store) deleteIpRow(ctx context.Context, id string) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `DELETE FROM ip_list WHERE id=$1`, id)
	logErr("delete ip", err)
}

func (s *Store) saveRateLimitRow(ctx context.Context, r *RateLimitRule) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `INSERT INTO rate_limit_rules (name, endpoint, threshold, window_sec, action, enabled)
		VALUES ($1,$2,$3,$4,$5,$6)
		ON CONFLICT (name) DO UPDATE SET endpoint=$2, threshold=$3, window_sec=$4, action=$5, enabled=$6`,
		r.Name, r.Endpoint, r.Threshold, r.WindowSec, r.Action, r.Enabled)
	logErr("rate limit", err)
	var id string
	if err := s.Pool.QueryRow(ctx, `SELECT id::text FROM rate_limit_rules WHERE name=$1`, r.Name).Scan(&id); err == nil {
		r.ID = id
	}
}

func (s *Store) deleteRateLimitRow(ctx context.Context, id string) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `DELETE FROM rate_limit_rules WHERE id=$1`, id)
	logErr("delete rate limit", err)
}

func (s *Store) saveFeedRow(ctx context.Context, f *ThreatFeed) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `INSERT INTO threat_feeds (name, url, interval, status) VALUES ($1,$2,$3,$4)
		ON CONFLICT (name) DO UPDATE SET url=$2, status=$4`, f.Name, f.URL, f.Interval, f.Status)
	logErr("feed", err)
	var id string
	if err := s.Pool.QueryRow(ctx, `SELECT id::text FROM threat_feeds WHERE name=$1`, f.Name).Scan(&id); err == nil {
		f.ID = id
	}
}

func (s *Store) deleteFeedRow(ctx context.Context, id string) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `DELETE FROM threat_feeds WHERE id=$1`, id)
	logErr("delete feed", err)
}

func (s *Store) saveSiteRow(ctx context.Context, site *Site) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `UPDATE sites SET paranoia_level=$2, inbound_threshold=$3, outbound_threshold=$4, updated_at=now() WHERE id=$1`,
		site.ID, site.ParanoiaLevel, site.InboundThreshold, site.OutboundThreshold)
	logErr("site", err)
}

func (s *Store) saveCrsRow(ctx context.Context, c *CrsCategory) {
	if s.Pool == nil { return }
	_, err := s.Pool.Exec(ctx, `UPDATE crs_categories SET enabled=$2 WHERE id=$1`, c.ID, c.Enabled)
	logErr("crs category", err)
}

func logErr(what string, err error) {
	if err != nil && err != pgx.ErrNoRows {
		log.Printf("[store] persist %s: %v", what, err)
	}
}
