"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Badge,
  Switch,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { Plus, Gauge } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { mockRateLimitRules, rateLimitStats } from "@/lib/mock-data";
import { getRateLimits } from "@/lib/api";

const actionTone = { BLOCK: "red", TARPIT: "amber", CAPTCHA: "cyan" } as const;

export default function RateLimitingPage() {
  const [rules, setRules] = useState(mockRateLimitRules);
  useEffect(() => { getRateLimits().then(setRules).catch(() => {}); }, []);

  return (
    <>
      <PageHeader
        title="DDoS Protection (L7) & Rate Limiting"
        description="HTTP/HTTPS flood defense via thresholds and anomaly patterns — defends against DDoS attacks, malicious crawlers and bots"
      />

      {/* WAAP pillar: L7 DDoS flood status */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Flood Status</span>
            <Badge tone="green" dot>NORMAL</Badge>
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-ink">No L7 flood detected</div>
          <div className="mt-1 text-[11px] text-faint">baseline 12.4k rps · peak 14.1k rps</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Anomaly Score</div>
          <div className="mt-2 font-mono text-xl font-bold text-emerald-400">0.18 / 1.00</div>
          <div className="mt-1 text-[11px] text-faint">traffic pattern vs rolling 7-day baseline</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Mitigation Mode</div>
          <div className="mt-2 font-mono text-xl font-bold text-dim">SENSITIVE</div>
          <div className="mt-1 text-[11px] text-faint">auto-scales to UNDER_ATTACK on trigger</div>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Requests Limited (24h)
            </span>
            <Gauge size={15} className="text-faint" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-ink">
            {rateLimitStats.reduce((a, b) => a + b.limited, 0).toLocaleString("en-US")}
          </div>
          <Badge tone="amber" dot>
            TARPIT + CAPTCHA + BLOCK
          </Badge>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Limited Requests Trend" subtitle="Hourly, all rules" />
          <div className="h-44 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rateLimitStats}>
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} interval={3} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="limited" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Rate Limit Rules"
          subtitle={`${rules.filter((r) => r.enabled).length}/${rules.length} active`}
          right={
            <Button
              variant="primary"
              onClick={() =>
                setRules((rs) => [
                  ...rs,
                  {
                    id: `rl-${crypto.randomUUID().slice(0, 6)}`,
                    name: "RL_NEW_RULE",
                    endpoint: "*",
                    threshold: 100,
                    window_sec: 60,
                    action: "BLOCK",
                    enabled: true,
                  },
                ])
              }
            >
              <Plus size={13} /> New Rule
            </Button>
          }
        />
        <div className="divide-y divide-line/60">
          {rules.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 pl-5 pr-6 lg:grid-cols-[2fr_2fr_1fr_1fr_auto]">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs font-medium text-dim">{r.name}</div>
                <div className="font-mono text-[11px] text-faint">{r.endpoint}</div>
              </div>
              <div className="hidden font-mono text-xs text-muted lg:block">
                {r.threshold.toLocaleString("en-US")} req / {r.window_sec}s
              </div>
              <div className="hidden lg:block">
                <Select
                  value={r.action}
                  onChange={(e) =>
                    setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, action: e.target.value as typeof r.action } : x))
                  }
                  className="w-32"
                >
                  {(["BLOCK", "TARPIT", "CAPTCHA"] as const).map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </div>
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted">
                <Badge tone={actionTone[r.action]}>{r.action}</Badge>
              </div>
              <Switch
                checked={r.enabled}
                onChange={(v) => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, enabled: v } : x))}
                label=""
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <Label>Add Custom Threshold</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          <Input placeholder="/api/v1/orders" className="w-56" />
          <Input type="number" placeholder="Threshold (req)" className="w-36" />
          <Input type="number" placeholder="Window (sec)" className="w-32" />
          <Button variant="primary">Create Rule</Button>
        </div>
      </Card>
    </>
  );
}
