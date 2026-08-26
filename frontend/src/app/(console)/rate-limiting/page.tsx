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
  Modal,
  useToast,
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
import { addRateLimit, getRateLimits, updateRateLimit } from "@/lib/api";

const actionTone = { BLOCK: "red", TARPIT: "amber", CAPTCHA: "cyan" } as const;

export default function RateLimitingPage() {
  const [rules, setRules] = useState(mockRateLimitRules);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", endpoint: "", threshold: 100, window_sec: 60, action: "BLOCK" });
  const { show: showToast, node: toastNode } = useToast();
  const [quick, setQuick] = useState({ endpoint: "", threshold: 100, window_sec: 60 });
  const refresh = () => getRateLimits().then(setRules).catch(() => {});
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
            <Button variant="primary" onClick={() => setOpen(true)}>
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
                  onChange={(e) => {
                    const action = e.target.value as typeof r.action;
                    setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, action } : x));
                    updateRateLimit(r.id, { action }).then(() => showToast("Action updated")).catch(() => showToast("Failed to update", false));
                  }}
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
                onChange={(v) => { setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, enabled: v } : x)); updateRateLimit(r.id, { enabled: v }).then(() => showToast("Rule updated")).catch(() => showToast("Failed to update rule", false)); }}
                label=""
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <Label>Add Custom Threshold</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          <Input
            placeholder="/api/v1/orders"
            className="w-56"
            value={quick.endpoint}
            onChange={(e) => setQuick({ ...quick, endpoint: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Threshold (req)"
            className="w-36"
            value={quick.threshold || ""}
            onChange={(e) => setQuick({ ...quick, threshold: +e.target.value })}
          />
          <Input
            type="number"
            placeholder="Window (sec)"
            className="w-32"
            value={quick.window_sec || ""}
            onChange={(e) => setQuick({ ...quick, window_sec: +e.target.value })}
          />
          <Button
            variant="primary"
            onClick={() =>
              addRateLimit({
                name: `RL_CUSTOM_${Date.now().toString().slice(-6)}`,
                endpoint: quick.endpoint || "*",
                threshold: quick.threshold,
                window_sec: quick.window_sec,
              })
                .then(() => {
                  showToast("Rate limit rule created");
                  refresh();
                })
                .catch(() => showToast("Failed to create rule", false))
            }
          >
            Create Rule
          </Button>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Rate Limit Rule">
        <div className="space-y-4">
          <div>
            <Label>Rule Name</Label>
            <Input placeholder="RL_LOGIN_BRUTEFORCE" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Endpoint</Label>
            <Input placeholder="api.domain.com/api/v1/login" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Threshold (requests)</Label>
              <Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: +e.target.value })} />
            </div>
            <div>
              <Label>Window (seconds)</Label>
              <Input type="number" value={form.window_sec} onChange={(e) => setForm({ ...form, window_sec: +e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Action</Label>
            <Select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              {["BLOCK", "TARPIT", "CAPTCHA"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </div>
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              if (!form.name || form.threshold <= 0) return;
              addRateLimit(form)
                .then(() => {
                  setOpen(false);
                  showToast("Rate limit rule created — pushed to nodes");
                  refresh();
                })
                .catch(() => showToast("Failed to create rule", false));
            }}
          >
            Create Rule
          </Button>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
