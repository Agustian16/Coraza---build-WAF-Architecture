"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, PageHeader, Button, Badge, cn } from "@/components/ui";
import { X, ScrollText } from "lucide-react";
import { mockAccessEvents, mockLogs } from "@/lib/mock-data";
import type { AccessEvent } from "@/lib/types";

function actionTone(a: AccessEvent["action"]) {
  return a === "DENY" ? "red" : a === "ALLOW" ? "green" : "amber";
}

export default function AccessControlPage() {
  const [selected, setSelected] = useState<AccessEvent | null>(null);
  const [filter, setFilter] = useState<"ALL" | "DENY" | "ALLOW">("ALL");

  const events = useMemo(
    () => mockAccessEvents.filter((e) => filter === "ALL" || e.action === filter),
    [filter]
  );

  // Related audit-log transactions for the selected event
  const relatedLogs = useMemo(
    () =>
      selected
        ? mockLogs.filter((l) => selected.log_ids.includes(l.transaction_id))
        : [],
    [selected]
  );

  return (
    <>
      <PageHeader
        title="Allow &amp; Deny"
        description="Access-control decisions across IP lists, geo rules, rate limiting and bot management — click a row for related logs"
        actions={
          <div className="flex gap-1 rounded-lg border border-line bg-bg p-1 text-xs">
            {(["ALL", "DENY", "ALLOW"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  filter === f ? "bg-hover text-[var(--accent-text)]" : "text-muted hover:text-ink"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <Card>
        <CardHeader
          title="Access Events"
          subtitle={`${events.length} events · newest first · UTC`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Address</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Rule Name</th>
                <th className="px-5 py-2.5 font-medium">Attack IP</th>
                <th className="px-5 py-2.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="cursor-pointer border-b border-line/50 hover:bg-hover/50"
                >
                  <td className="px-5 py-3">
                    <Badge tone={actionTone(e.action)}>{e.action}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-[var(--accent-text)]">{e.address}</td>
                  <td className="px-5 py-3 text-dim">{e.type}</td>
                  <td className="max-w-[240px] truncate px-5 py-3 font-mono text-muted">
                    {e.rule_name}
                  </td>
                  <td className="px-5 py-3 font-mono text-dim">{e.attack_ip}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-faint">
                    {e.time.replace("T", " ").replace("Z", "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Event detail drawer with related logs */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onMouseDown={(ev) => ev.target === ev.currentTarget && setSelected(null)}
        >
          <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-panel shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">Access Event Detail</h3>
                <p className="font-mono text-[11px] text-muted">{selected.id}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)} aria-label="Close">
                <X size={15} />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <dl className="space-y-2 rounded-lg border border-line bg-bg p-4 text-xs">
                <Row k="Action" v={selected.action} />
                <Row k="Address" v={selected.address} mono />
                <Row k="Type" v={selected.type} />
                <Row k="Rule Name" v={selected.rule_name} mono />
                <Row k="Attack IP" v={selected.attack_ip} mono />
                <Row k="Time" v={selected.time.replace("T", " ").replace("Z", "") + " UTC"} mono />
              </dl>

              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
                  <ScrollText size={12} /> Related WAF Logs ({relatedLogs.length})
                </h4>
                {relatedLogs.length === 0 ? (
                  <p className="rounded-lg border border-line bg-bg p-4 text-xs text-faint">
                    No WAF transaction logs recorded for this event (decision taken before
                    request inspection or by an allowlist match).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {relatedLogs.map((l) => (
                      <div key={l.transaction_id} className="rounded-lg border border-line bg-bg p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-muted">{l.transaction_id}</span>
                          <Badge tone={l.action_taken === "DENY" ? "red" : l.action_taken === "LOG" ? "amber" : "green"}>
                            {l.action_taken} ({l.response_status})
                          </Badge>
                        </div>
                        <div className="mt-1.5 break-all font-mono text-[11px] text-dim">
                          {l.http_method} {l.uri} — {l.client_ip} ({l.country})
                        </div>
                        {l.matched_rule_ids.map((id, i) => (
                          <div key={id} className="mt-1 font-mono text-[11px] text-red-300/90">
                            rule id:{id} — {l.matched_messages[i]}
                            <span className="block text-faint">
                              {l.matched_var_name} = &quot;{l.matched_data[i]}&quot;
                            </span>
                          </div>
                        ))}
                        <pre className="mt-2 overflow-x-auto rounded border border-line bg-panel p-2 font-mono text-[10px] leading-relaxed text-muted">
                          {Object.entries(l.request_headers)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join("\n")}
                          {l.request_body && `\n\n${l.request_body}`}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-muted">{k}</dt>
      <dd className={cn("min-w-0 break-all", mono ? "font-mono text-dim" : "text-dim")}>{v}</dd>
    </div>
  );
}
