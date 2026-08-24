"use client";

import {
  Card,
  CardHeader,
  Badge,
  PageHeader,
  Button,
} from "@/components/ui";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Activity, ShieldAlert, Timer } from "lucide-react";
import { trafficTrend, topRules, topAttackers, mockNodes, mockGeoStats } from "@/lib/mock-data";
import { WorldMap } from "@/components/world-map";

function Kpi({
  label,
  value,
  unit,
  delta,
  up_good,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  up_good: boolean;
  icon: React.ElementType;
}) {
  const good = up_good;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        <Icon size={15} className="text-faint" />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold text-ink">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      <div
        className={`mt-1 flex items-center gap-1 text-[11px] ${
          good ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {good ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
        {delta}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Security Overview"
        description="Real-time attack monitoring across all Coraza edge nodes · last 24 hours"
        actions={
          <>
            <Badge tone="green" dot>
              LIVE
            </Badge>
            <Button>Export Report</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi
          label="Total Traffic"
          value="12,483"
          unit="req/s"
          delta="-4.2% vs yesterday"
          up_good
          icon={Activity}
        />
        <Kpi
          label="Blocked Requests"
          value="18,392"
          delta="+12.8% vs yesterday"
          up_good={false}
          icon={ShieldAlert}
        />
        <Kpi
          label="Block Ratio"
          value="2.7"
          unit="%"
          delta="+0.3 pts vs yesterday"
          up_good={false}
          icon={ShieldAlert}
        />
        <Kpi
          label="Avg WAF Latency"
          value="1.4"
          unit="ms"
          delta="NFR target < 2 ms"
          up_good
          icon={Timer}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Traffic vs Attack Trend" subtitle="Hourly time-series, all sites" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTrend}>
                <XAxis
                  dataKey="hour"
                  stroke="#475569"
                  tick={{ fontSize: 10 }}
                  interval={3}
                  tickLine={false}
                />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="requests"
                  name="Total Requests"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="attacks"
                  name="Attack Attempts"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top Triggered OWASP Rules" subtitle="Last 24h across fleet" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRules} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="rule_id"
                  stroke="#475569"
                  tick={{ fontSize: 10, fontFamily: "monospace" }}
                  width={58}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(100,116,139,0.25)" }}
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v} hits`, "Triggered"]}
                />
                <Bar dataKey="hits" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Top Attacking IPs"
            subtitle="Aggregated by client_ip from ClickHouse audit logs"
            right={<Button variant="ghost">View All</Button>}
          />
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Client IP</th>
                <th className="px-5 py-2.5 font-medium">Country</th>
                <th className="px-5 py-2.5 font-medium">ASN</th>
                <th className="px-5 py-2.5 text-right font-medium">Hits</th>
                <th className="px-5 py-2.5 text-right font-medium">% Blocked</th>
              </tr>
            </thead>
            <tbody>
              {topAttackers.map((a) => (
                <tr key={a.ip} className="border-b border-line hover:bg-hover/50">
                  <td className="px-5 py-2.5 font-mono text-dim">{a.ip}</td>
                  <td className="px-5 py-2.5">{a.country}</td>
                  <td className="px-5 py-2.5 font-mono text-muted">{a.asn}</td>
                  <td className="px-5 py-2.5 text-right font-mono">{a.hits.toLocaleString("en-US")}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Badge tone={a.blocked_pct === 100 ? "green" : "amber"}>
                      {a.blocked_pct}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader
            title="Fleet Health"
            right={<Button variant="ghost">Manage</Button>}
          />
          <div className="space-y-3 p-5">
            {mockNodes.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-dim">{n.node_name}</div>
                  <div className="text-[11px] text-faint">
                    {n.latency_ms.toFixed(1)} ms · {n.rps.toLocaleString("en-US")} rps
                  </div>
                </div>
                <Badge
                  dot
                  tone={
                    n.status === "ONLINE" ? "green" : n.status === "WARN" ? "amber" : "red"
                  }
                >
                  {n.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Traffic Analysis — Geolocation 2D */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Traffic Analysis — Geolocation 2D"
            subtitle="Requests vs blocked by source country, last 24h"
          />
          <div className="p-5">
            <WorldMap stats={mockGeoStats} />
            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">Country</th>
                  <th className="py-2 text-right font-medium">Requests</th>
                  <th className="py-2 text-right font-medium">Blocked</th>
                  <th className="py-2 text-right font-medium">Block Ratio</th>
                </tr>
              </thead>
              <tbody>
                {[...mockGeoStats]
                  .sort((a, b) => b.blocked - a.blocked)
                  .slice(0, 5)
                  .map((g) => (
                    <tr key={g.code} className="border-b border-line/50">
                      <td className="py-2">
                        {g.country}{" "}
                        <span className="font-mono text-faint">{g.code}</span>
                      </td>
                      <td className="py-2 text-right font-mono text-dim">
                        {g.requests.toLocaleString("en-US")}
                      </td>
                      <td className="py-2 text-right font-mono text-red-400">
                        {g.blocked.toLocaleString("en-US")}
                      </td>
                      <td className="py-2 text-right">
                        <Badge tone={g.blocked / g.requests > 0.1 ? "red" : "green"}>
                          {((g.blocked / g.requests) * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <SecurityPosture />
      </div>
    </>
  );
}

const postureChecks = [
  { label: "Rule Engine (Signature WAF)", detail: "SecRuleEngine: On (blocking)", ok: true },
  { label: "OWASP CRS Version", detail: "CRS v4.0.0 on 3/4 nodes", ok: true },
  { label: "API Schema Validation", detail: "1 endpoint drifted, 2 unspecified", ok: false },
  { label: "Bot Management", detail: "Challenge mode on unverified bots", ok: true },
  { label: "L7 DDoS / Rate Limiting", detail: "3/4 rules active · flood status NORMAL", ok: true },
  { label: "Sensitive Data Masking", detail: "CC/token patterns enforced on egress", ok: true },
  { label: "Config Sync", detail: "1 node PENDING_UPDATE (v097)", ok: false },
  { label: "mTLS Transport", detail: "gRPC streams with x509 mutual TLS", ok: true },
];

function SecurityPosture() {
  const score = Math.round(
    (postureChecks.filter((c) => c.ok).length / postureChecks.length) * 100
  );
  return (
    <Card>
      <CardHeader title="Security Posture" subtitle="Continuous configuration assessment" />
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke={score >= 85 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f43f5e"}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-center font-mono text-lg font-bold leading-none text-ink">
              {score}
            </span>
          </div>
          <div className="text-xs leading-relaxed text-muted">
            Posture score derived from engine state, rule coverage,
            transport security and fleet sync health.
          </div>
        </div>

        <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
          {postureChecks.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-dim">{c.label}</div>
                <div className="font-mono text-[11px] text-faint">{c.detail}</div>
              </div>
              <Badge tone={c.ok ? "green" : "amber"}>{c.ok ? "PASS" : "WARN"}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
