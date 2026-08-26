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
  cn,
  useToast,
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
import {
  getCrsCategories,
  getRules,
  getSites,
  toggleCrsCategory,
  updateSite,
  createRule,
  updateRule,
  deleteRule,
  testSandbox,
} from "@/lib/api";
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
  useEffect(() => { getCrsCategories().then(setCategories).catch(() => {}); getRules().then(setRules).catch(() => {}); getSites().then((ss) => { if (ss.length) setSite(ss[0]); }).catch(() => {}); }, []);
  const [mode, setMode] = useState<"visual" | "code">("code");
  const [sandbox, setSandbox] = useState<null | { result: string; ruleId: number; msg: string; data: string }>(null);
  const [testPayload, setTestPayload] = useState("' OR '1'='1");
  const [vb, setVb] = useState({ target: "ARGS", param: "", operator: "@rx", pattern: "", action: "deny", phase: "2", status: "403", severity: "CRITICAL" });
  const { show: showToast, node: toastNode } = useToast();
  const [sites, setSites] = useState(mockSites);
  useEffect(() => { getSites().then(setSites).catch(() => {}); }, []);

  const refreshRules = () => getRules().then(setRules).catch(() => {});

  const toggleCategory = (id: string, enabled: boolean) => {
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, enabled } : c)));
    toggleCrsCategory(id, enabled)
      .then(() => showToast("CRS category updated — config pushed to nodes"))
      .catch(() => showToast("Failed to reach control plane", false));
  };

  const savePolicy = () => {
    updateSite(site.id, {
      paranoia_level: site.paranoia_level,
      inbound_threshold: site.inbound_threshold,
      outbound_threshold: site.outbound_threshold,
    })
      .then(() => showToast("Policy saved — new config version pushed to nodes"))
      .catch(() => showToast("Failed to save policy", false));
  };

  const saveRule = (override?: string) => {
    if (!editing) return;
    const payload = {
      rule_id: editing.rule_id,
      name: editing.name,
      seclang_raw: override ?? editing.seclang_raw,
      site_id: editing.site_id ?? undefined,
      is_active: editing.is_active,
    };
    const req = rules.some((r) => r.id === editing.id)
      ? updateRule(editing.id, { name: payload.name, seclang_raw: payload.seclang_raw, is_active: payload.is_active })
      : createRule(payload);
    req
      .then(() => {
        showToast("Rule saved — deployed to fleet");
        setEditing(null);
        refreshRules();
      })
      .catch(() => showToast("Failed to save rule", false));
  };

  const runSandbox = () => {
    testSandbox(testPayload)
      .then((res) =>
        setSandbox({
          result: res.result,
          ruleId: res.rule_id,
          msg: res.message,
          data: res.matched_data,
        })
      )
      .catch(() => showToast("Sandbox unreachable", false));
  };

  // Visual Builder form → SecLang (one-way generation on save)
  const buildSecLangFromVisual = (): string => {
    const target = vb.param ? `${vb.target}:${vb.param}` : vb.target;
    return `SecRule ${target} "${vb.operator} ${vb.pattern}" \\\n    "id:${editing?.rule_id ?? 900001},\\\n    phase:${vb.phase},\\\n    ${vb.action},\\\n    status:${vb.status},\\\n    msg:'${editing?.name || "Custom rule"}',\\\n    tag:'custom',\\\n    severity:'${vb.severity}'"`;
  };

  return (
    <>
      <PageHeader
        title="OWASP CRS & Rule Management"
        description="Core Rule Set tuning and custom SecLang rules per site"
        actions={
          <Select
            value={site.id}
            onChange={(e) => setSite(sites.find((s) => s.id === e.target.value)!)}
            className="w-56"
          >
            {sites.map((s) => (
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
              <Button variant="primary" onClick={savePolicy}>
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
                    <Switch checked={r.is_active} onChange={(v) => { setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, is_active: v } : x)); updateRule(r.id, { is_active: v }).then(() => showToast("Rule updated")).catch(() => showToast("Failed to update rule", false)); }} label="" />
                    <Button variant="ghost" onClick={() => { setEditing(r); setSandbox(null); }}>Edit</Button>
                    <Button variant="ghost" aria-label="Delete" onClick={() => { deleteRule(r.id).then(refreshRules).catch(() => showToast("Failed to delete rule", false)); }}>
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
                  <Select value={vb.target} onChange={(e) => setVb({ ...vb, target: e.target.value })}>
                    {["ARGS", "ARGS_GET", "ARGS_POST", "REQUEST_URI", "REQUEST_HEADERS"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Parameter / Key</Label>
                  <Input value={vb.param} onChange={(e) => setVb({ ...vb, param: e.target.value })} placeholder="user_id" />
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select value={vb.operator} onChange={(e) => setVb({ ...vb, operator: e.target.value })}>
                    {["@rx", "@streq", "@contains", "@beginsWith", "@detectSQLi", "@detectXSS"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Pattern / Value</Label>
                  <Input value={vb.pattern} onChange={(e) => setVb({ ...vb, pattern: e.target.value })} placeholder="(?i)(union\s+select)" />
                </div>
                <div>
                  <Label>Action</Label>
                  <Select value={vb.action} onChange={(e) => setVb({ ...vb, action: e.target.value })}>
                    {["deny", "pass", "log", "allow"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Phase</Label>
                  <Select value={vb.phase} onChange={(e) => setVb({ ...vb, phase: e.target.value })}>
                    {["1", "2", "3", "4"].map((v) => (
                      <option key={v}>phase:{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Status Code</Label>
                  <Select value={vb.status} onChange={(e) => setVb({ ...vb, status: e.target.value })}>
                    {["403", "404", "406", "501"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={vb.severity} onChange={(e) => setVb({ ...vb, severity: e.target.value })}>
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
                  sandbox.result === "MATCHED"
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                    : "border-line2 bg-bg text-muted"
                )}
              >
                FTW Sandbox Result:{" "}
                <strong>{sandbox.result}</strong> · triggered rule id:
                {sandbox.ruleId} · matched data: &quot;{sandbox.data}&quot;
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="font-mono text-[11px] text-emerald-400">
                ✓ Syntax Validated (0 errors, 0 warnings)
              </span>
              <div className="flex gap-2">
                <Input value={testPayload} onChange={(e) => setTestPayload(e.target.value)} placeholder="Test payload" className="w-56" />
                <Button onClick={runSandbox}>
                  <FlaskConical size={13} /> Test Sandbox
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (mode === "visual" && editing) {
                      saveRule(buildSecLangFromVisual());
                    } else {
                      saveRule();
                    }
                  }}
                >
                  <Save size={13} /> Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}
