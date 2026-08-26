"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Badge,
  Input,
  Select,
  cn,
  useToast,
} from "@/components/ui";
import { X, Ban, ShieldOff } from "lucide-react";
import { mockLogs } from "@/lib/mock-data";
import { addIp, createException, getLogs } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

export default function LogsPage() {
  const [live, setLive] = useState(true);
  const [filters, setFilters] = useState<{ ruleId?: string; action?: string; host?: string }>({});
  const [ruleInput, setRuleInput] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [logRows, setLogRows] = useState(mockLogs);
  useEffect(() => { getLogs().then(setLogRows).catch(() => {}); }, []);
  const { show: showToast, node: toastNode } = useToast();

  const logs = useMemo(
    () =>
      logRows.filter(
        (l) =>
          (!filters.ruleId ||
            l.matched_rule_ids.some((id) => String(id).startsWith(filters.ruleId!))) &&
          (!filters.action || l.action_taken === filters.action) &&
          (!filters.host || l.target_host === filters.host)
      ),
    [filters, logRows]
  );

  const addChip = () => {
    if (ruleInput.trim()) {
      setFilters((f) => ({ ...f, ruleId: ruleInput.trim() }));
      setRuleInput("");
    }
  };

  const notify = (msg: string, ok = true) => showToast(msg, ok);

  return (
    <>
      <PageHeader
        title="Incident Forensic Explorer"
        description="ClickHouse-backed log search across millions of WAF audit events"
        actions={
          <Badge
            dot
            tone={live ? "green" : "slate"}
          >
            <button onClick={() => setLive(!live)} className="cursor-pointer">
              LIVE STREAM: {live ? "ON" : "OFF"}
            </button>
          </Badge>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search URI / payload…" className="w-56" />
          <Select className="w-40" value="" onChange={(e) => e.target.value && setFilters((f) => ({ ...f, action: e.target.value }))}>
            <option value="">Action: any</option>
            {["DENY", "LOG", "ALLOW"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
          <Select className="w-44" value="" onChange={(e) => e.target.value && setFilters((f) => ({ ...f, host: e.target.value }))}>
            <option value="">Target host: any</option>
            <option>api.domain.com</option>
            <option>shop.domain.com</option>
          </Select>
          <div className="flex w-44 overflow-hidden rounded-lg border border-line2">
            <input
              value={ruleInput}
              onChange={(e) => setRuleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChip()}
              placeholder="Rule ID…"
              className="w-full bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-faint focus:outline-none"
            />
            <Button variant="ghost" className="rounded-none border-0 border-l border-line2" onClick={addChip}>
              +
            </Button>
          </div>

          {(filters.ruleId || filters.action || filters.host) && (
            <>
              {filters.ruleId && (
                <FilterChip label={`Rule ID: ${filters.ruleId}*`} onRemove={() => setFilters((f) => ({ ...f, ruleId: undefined }))} />
              )}
              {filters.action && (
                <FilterChip label={`Action: ${filters.action}`} onRemove={() => setFilters((f) => ({ ...f, action: undefined }))} />
              )}
              {filters.host && (
                <FilterChip label={filters.host} onRemove={() => setFilters((f) => ({ ...f, host: undefined }))} />
              )}
            </>
          )}
          <span className="ml-auto font-mono text-[11px] text-muted">
            {logs.length} rows · query 1.24M logs in 38 ms
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Audit Log Stream" subtitle="Newest first · UTC" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Timestamp</th>
                <th className="px-5 py-2.5 font-medium">Client IP</th>
                <th className="px-5 py-2.5 font-medium">Method</th>
                <th className="px-5 py-2.5 font-medium">URI Path</th>
                <th className="px-5 py-2.5 font-medium">Rule ID</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr
                  key={l.transaction_id}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer border-b border-line hover:bg-hover/50"
                >
                  <td className="px-5 py-3 font-mono text-muted">{l.timestamp.replace("T", " ").replace("Z", "")}</td>
                  <td className="px-5 py-3 font-mono text-dim">
                    {l.client_ip}
                    <span className="ml-1.5 text-[10px] text-faint">{l.country}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px]">{l.http_method}</span>
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-3 font-mono text-[var(--accent-text)]">{l.uri}</td>
                  <td className="px-5 py-3 font-mono text-muted">{l.matched_rule_ids.join(", ")}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] leading-4",
                        l.action_taken === "DENY"
                          ? "border-red-900/50 bg-red-950/25 text-red-400/90"
                          : l.action_taken === "LOG"
                            ? "border-amber-900/50 bg-amber-950/25 text-amber-400/90"
                            : "border-emerald-900/50 bg-emerald-950/25 text-emerald-400/90"
                      )}
                    >
                      {l.action_taken} ({l.response_status})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-panel shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">Transaction Inspector</h3>
                <p className="font-mono text-[11px] text-muted">{selected.transaction_id}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)} aria-label="Close">
                <X size={15} />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <dl className="space-y-2 rounded-lg border border-line bg-bg p-4 text-xs">
                <Row k="Client IP" v={`${selected.client_ip} (${selected.country} / ${selected.asn})`} />
                <Row k="Target Host" v={selected.target_host} mono />
                <Row k="Request" v={`${selected.http_method} ${selected.uri} ${selected.http_version}`} mono />
                <Row k="Action Taken" v={`${selected.action_taken} (HTTP ${selected.response_status})`} />
                <Row k="WAF Latency" v={`${(selected.latency_us / 1000).toFixed(2)} ms`} />
              </dl>

              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Matched Rules
                </h4>
                <div className="space-y-2">
                  {selected.matched_rule_ids.map((id, i) => (
                    <div key={id} className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs">
                      <div className="font-mono font-medium text-red-300">rule id:{id}</div>
                      <div className="mt-1 text-muted">{selected.matched_messages[i]}</div>
                      <div className="mt-1.5 font-mono text-[11px] text-muted">
                        {selected.matched_var_name} = <span className="text-amber-300">&quot;{selected.matched_data[i]}&quot;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                  Request Headers
                </h4>
                <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
                  {Object.entries(selected.request_headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}
                </pre>
              </div>

              {selected.request_body && (
                <div>
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Request Body
                  </h4>
                  <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-[11px] text-muted">
                    {selected.request_body}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    const path = selected.uri.split("?")[0];
                    createException({
                      rule_id: selected.matched_rule_ids[0],
                      path_pattern: path,
                      reason: `One-click exception from ${selected.transaction_id}`,
                    })
                      .then(() => notify(`Exception created: SecRuleUpdateTargetById ${selected.matched_rule_ids[0]} for ${path} — deployed`))
                      .catch(() => notify("Failed to create exception", false));
                  }}
                >
                  <ShieldOff size={13} /> Disable Rule for this Endpoint
                </Button>
                <Button
                  variant="danger"
                  onClick={() => addIp(`${selected.client_ip}/32`, "block").then(() => notify(`${selected.client_ip}/32 added to central blocklist`)).catch(() => notify("Failed to add IP", false))}
                >
                  <Ban size={13} /> Add IP to Blacklist
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt className={cn("shrink-0 w-28 text-muted")}>{k}</dt>
      <dd className={cn("min-w-0 break-all", mono ? "font-mono text-dim" : "text-dim")}>
        {v}
      </dd>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-600/40 bg-cyan-600/10 px-2 py-1 font-mono text-[11px] text-[var(--accent-text)]">
      {label}
      <button onClick={onRemove} aria-label={`Remove filter ${label}`} className="hover:opacity-70">
        ✕
      </button>
    </span>
  );
}
