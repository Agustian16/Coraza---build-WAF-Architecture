"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, PageHeader, Badge, Select } from "@/components/ui";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { botTrafficSplit, mockBotCategories } from "@/lib/mock-data";
import { getBots } from "@/lib/api";
import type { BotAction } from "@/lib/types";

const actionTone: Record<BotAction, "green" | "amber" | "cyan" | "red"> = {
  ALLOW: "green",
  LOG: "amber",
  CHALLENGE: "cyan",
  BLOCK: "red",
};

export default function AntiBotPage() {
  const [bots, setBots] = useState(mockBotCategories);
  useEffect(() => { getBots().then(setBots).catch(() => {}); }, []);

  return (
    <>
      <PageHeader
        title="Bot Management"
        description="Advanced bot mitigation — credential stuffing, scraping and automated attack defense via fingerprinting, JS challenge and CAPTCHA"
      />

      {/* WAAP pillar: advanced bot attack defense */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Credential Stuffing Blocked (24h)", value: "12,847", detail: "6,412 unique IPs · login endpoint" },
          { label: "Scraping Sessions Stopped (24h)", value: "3,204", detail: "catalog & pricing endpoints" },
          { label: "Challenges Solved vs Failed", value: "68%", detail: "18,204 solved / 8,561 failed" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{k.label}</div>
            <div className="mt-2 font-mono text-2xl font-bold text-red-400">{k.value}</div>
            <div className="mt-1 font-mono text-[11px] text-faint">{k.detail}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Traffic Split (24h)" subtitle="Human vs automated traffic share" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={botTrafficSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {botTrafficSplit.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v}%`, undefined as never]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Bot Categories & Enforcement"
            subtitle="Classification by UA pattern and fingerprint; change action per category"
          />
          <div className="divide-y divide-line/60">
            <div className="hidden min-h-[2rem] grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_10rem_auto] items-center gap-4 py-2 pl-5 pr-6 text-[11px] font-medium uppercase tracking-wider text-muted lg:grid">
              <span>Category</span>
              <span className="text-right">Hits (24h)</span>
              <span>Enforcement</span>
              <span className="text-right">Status</span>
            </div>
            {bots.map((b) => (
              <div
                key={b.id}
                className="grid min-h-[3.25rem] grid-cols-[1fr_auto] items-center gap-4 py-4 pl-5 pr-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_10rem_auto]"
              >
                <div className="min-w-0 self-center">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium leading-5 text-dim">
                    {b.name}
                    {b.verified && <Badge tone="green">VERIFIED</Badge>}
                  </div>
                  <div className="truncate font-mono text-[11px] leading-4 text-faint">{b.ua_pattern}</div>
                </div>
                <div className="hidden self-center text-right font-mono text-xs text-muted lg:block">
                  {b.hits_24h.toLocaleString("en-US")} <span className="text-faint">hits / 24h</span>
                </div>
                <div className="hidden self-center lg:block">
                  <Select
                    value={b.action}
                    onChange={(e) =>
                      setBots((bs) =>
                        bs.map((x) => (x.id === b.id ? { ...x, action: e.target.value as BotAction } : x))
                      )
                    }
                    className="w-full"
                  >
                    {(["ALLOW", "LOG", "CHALLENGE", "BLOCK"] as const).map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex shrink-0 items-center justify-end self-center">
                  <Badge tone={actionTone[b.action]}>{b.action}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-5 text-xs leading-relaxed text-muted">
        <span className="font-medium text-dim">How it works:</span> requests are
        fingerprinted (TLS/JA3, headers, behavioral signals) before reaching Coraza.
        Unverified automation gets a lightweight JS challenge; failed challenges fall back
        to the configured action and are logged to the audit stream for forensic review in
        the Log Explorer and Allow &amp; Deny event feeds.
      </Card>
    </>
  );
}
