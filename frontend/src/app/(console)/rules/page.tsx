"use client";

import { useState } from "react";
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
  cn,
  fmtDate,
} from "@/components/ui";
import { SecLangEditor } from "@/components/seclang-editor";
import { Plus, FlaskConical, Save, Code2, Wand2, Trash2 } from "lucide-react";
import {
  mockCrsCategories,
  mockCustomRules,
  mockSites,
  sampleSecLang,
} from "@/lib/mock-data";
import type { CustomRule, Site } from "@/lib/types";

const emptyRule: CustomRule = {
  id: "",
  rule_id: 900003,
  site_id: null,
  name: "NEW_CUSTOM_RULE",
  seclang_raw: sampleSecLang,
  is_active: true,
  created_by: "ahmad@secops.corp",
  created_at: new Date().toISOString(),
};

export default function RulesPage() {
  const [site, setSite] = useState<Site>(mockSites[0]);
  const [categories, setCategories] = useState(mockCrsCategories);
  const [rules, setRules] = useState(mockCustomRules);
  const [editing, setEditing] = useState<CustomRule | null>(null);
  const [mode, setMode] = useState<"visual" | "code">("code");
  const [sandbox, setSandbox] = useState<null | { matched: boolean; ruleId: number; data: string }>(null);

  const toggleCategory = (id: string, enabled: boolean) =>
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, enabled } : c)));

  return (
    <>
      <PageHeader
        title="OWASP CRS & Rule Management"
        description="Core Rule Set tuning and custom SecLang rules per site"
        actions={
          <Select
            value={site.id}
            onChange={(e) => setSite(mockSites.find((s) => s.id === e.target.value)!)}
            className="w-56"
          >
            {mockSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain_name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* CRS categories */}
        <Card>
          <CardHeader
            title="OWASP CRS v4 Categories"
            subtitle="Toggle attack-category coverage for this site"
            right={<Badge tone="cyan">{categories.filter((c) => c.enabled).length}/{categories.length} ON</Badge>}
          />
          <div className="divide-y divide-line">
            {categories.map((c) => (
              <div key={c.id} className="flex min-h-[3rem] items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-5 text-ink">
                    {c.name}{" "}
                    <span className="ml-1 font-mono text-[11px] text-muted">{c.rule_prefix}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] leading-4 text-muted">{c.description}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-center">
                  <span className="hidden font-mono text-[10px] text-faint sm:block">
                    {c.rule_count} rules
                  </span>
                  <Switch checked={c.enabled} onChange={(v) => toggleCategory(c.id, v)} label="" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tuning */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Anomaly Scoring Tuning"
              subtitle={`Applies to ${site.domain_name}`}
            />
            <div className="space-y-5 p-5">
              <div>
                <Label>Paranoia Level — PL{site.paranoia_level}</Label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={site.paranoia_level}
                  onChange={(e) => setSite({ ...site, paranoia_level: +e.target.value })}
                  className="w-full accent-cyan-500"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-faint">
                  {["PL1 · low FP", "PL2", "PL3", "PL4 · strict"].map((t, i) => (
                    <span key={i} className={cn(site.paranoia_level === i + 1 && "text-[var(--accent-text)]")}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Inbound Threshold</Label>
                  <Input
                    type="number"
                    value={site.inbound_threshold}
                    onChange={(e) => setSite({ ...site, inbound_threshold: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Outbound Threshold</Label>
                  <Input
                    type="number"
                    value={site.outbound_threshold}
                    onChange={(e) => setSite({ ...site, outbound_threshold: +e.target.value })}
                  />
                </div>
              </div>
              <Button variant="primary" onClick={() => alert("Policy saved — will push config v105 to 3 nodes via gRPC.")}>
                <Save size={13} /> Save & Deploy Policy
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Custom SecLang Rules"
              right={
                <Button variant="primary" onClick={() => { setEditing({ ...emptyRule }); setSandbox(null); }}>
                  <Plus size={13} /> New Rule
                </Button>
              }
            />
            <div className="divide-y divide-line">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-medium text-ink">
                      {r.name}{" "}
                      <span className="text-faint">id:{r.rule_id}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      by {r.created_by} · {fmtDate(r.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={r.is_active} onChange={() => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: !x.is_active } : x))} label="" />
                    <Button variant="ghost" onClick={() => { setEditing(r); setSandbox(null); }}>Edit</Button>
                    <Button variant="ghost" aria-label="Delete" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Rule editor */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing ? `RULE EDITOR: ${editing.name}` : ""}
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[180px] flex-1">
                <Label>Rule Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="w-32">
                <Label>Rule ID</Label>
                <Input type="number" value={editing.rule_id} onChange={(e) => setEditing({ ...editing, rule_id: +e.target.value })} />
              </div>
            </div>

            <div className="flex gap-1 rounded-lg border border-line bg-bg p-1 text-xs">
              <button
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors",
                  mode === "visual" ? "bg-hover text-[var(--accent-text)]" : "text-muted hover:text-dim"
                )}
                onClick={() => setMode("visual")}
              >
                <Wand2 size={13} /> Visual Builder
              </button>
              <button
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors",
                  mode === "code" ? "bg-hover text-[var(--accent-text)]" : "text-muted hover:text-dim"
                )}
                onClick={() => setMode("code")}
              >
                <Code2 size={13} /> Monaco SecLang Editor
              </button>
            </div>

            {mode === "code" ? (
              <SecLangEditor value={editing.seclang_raw} onChange={(v) => setEditing({ ...editing, seclang_raw: v })} />
            ) : (
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-bg p-4">
                <div>
                  <Label>Match Target</Label>
                  <Select defaultValue="ARGS">
                    {["ARGS", "ARGS_GET", "ARGS_POST", "REQUEST_URI", "REQUEST_HEADERS"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Parameter / Key</Label>
                  <Input placeholder="user_id" />
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select defaultValue="@detectSQLi">
                    {["@rx", "@streq", "@contains", "@beginsWith", "@detectSQLi", "@detectXSS"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Pattern / Value</Label>
                  <Input placeholder="(?i)(union\s+select)" />
                </div>
                <div>
                  <Label>Action</Label>
                  <Select defaultValue="deny">
                    {["deny", "pass", "log", "allow"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Phase</Label>
                  <Select defaultValue="2">
                    {["1", "2", "3", "4"].map((v) => (
                      <option key={v}>phase:{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Status Code</Label>
                  <Select defaultValue="403">
                    {["403", "404", "406", "501"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select defaultValue="CRITICAL">
                    {["CRITICAL", "ERROR", "WARNING", "NOTICE"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {sandbox && (
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 font-mono text-xs",
                  sandbox.matched
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                    : "border-line2 bg-bg text-muted"
                )}
              >
                FTW Sandbox Result:{" "}
                <strong>{sandbox.matched ? "MATCHED" : "PASSED"}</strong> · triggered rule id:
                {sandbox.ruleId} · matched data: &quot;{sandbox.data}&quot;
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="font-mono text-[11px] text-emerald-400">
                ✓ Syntax Validated (0 errors, 0 warnings)
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    setSandbox({ matched: true, ruleId: editing.rule_id, data: "' OR '1'='1" })
                  }
                >
                  <FlaskConical size={13} /> Test Sandbox
                </Button>
                <Button variant="primary" onClick={() => setEditing(null)}>
                  <Save size={13} /> Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
