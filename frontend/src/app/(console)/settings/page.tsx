"use client";

import { useState } from "react";
import { Card, CardHeader, PageHeader, Button, Badge, Input, Label, Select } from "@/components/ui";
import { Download, Upload, Plus, Trash2 } from "lucide-react";
import { mockIpList } from "@/lib/mock-data";

export default function SettingsPage() {
  const [ipList, setIpList] = useState(mockIpList);
  const [cidr, setCidr] = useState("");
  const [listType, setListType] = useState<"allow" | "block">("block");

  const addIp = () => {
    if (!cidr.trim()) return;
    setIpList((l) => [
      ...l,
      {
        id: crypto.randomUUID(),
        cidr: cidr.trim(),
        list: listType,
        source: "manual",
        added_at: new Date().toISOString(),
      },
    ]);
    setCidr("");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Threat intelligence feeds, IP reputation lists and GitOps export"
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="IP Allowlist / Blocklist"
            subtitle="Central IP reputation with CIDR support"
            right={<Badge tone="cyan">{ipList.length} entries</Badge>}
          />
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <Select value={listType} onChange={(e) => setListType(e.target.value as "allow" | "block")} className="w-28">
                <option value="block">Block</option>
                <option value="allow">Allow</option>
              </Select>
              <Input placeholder="192.168.1.0/24" value={cidr} onChange={(e) => setCidr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIp()} />
              <Button variant="primary" onClick={addIp}>
                <Plus size={13} /> Add
              </Button>
            </div>
            <div className="divide-y divide-line rounded-lg border border-line">
              {ipList.map((e) => (
                <div key={e.id} className="flex min-h-[2.5rem] items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-dim">{e.cidr}</span>
                  <span className="w-20 shrink-0">
                    <Badge tone={e.list === "allow" ? "green" : "red"}>{e.list.toUpperCase()}</Badge>
                  </span>
                  <span className="w-40 shrink-0 truncate text-right font-mono text-[10px] text-faint">
                    {e.source}
                  </span>
                  <button
                    aria-label={`Remove ${e.cidr}`}
                    onClick={() => setIpList((l) => l.filter((x) => x.id !== e.id))}
                    className="w-5 shrink-0 text-center text-faint hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Threat Intelligence Feeds" subtitle="Auto-pull plain text / CSV blocklist URLs" />
          <div className="space-y-4 p-5">
            {[
              { name: "firehol_level1", url: "https://iplists.firehol.org/files/firehol_level1.netset", interval: "6h", status: "SYNCED" },
              { name: "abuseipdb_high_confidence", url: "https://api.abuseipdb.com/blacklist", interval: "12h", status: "SYNCED" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg p-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-ink">{f.name}</div>
                  <div className="truncate font-mono text-[10px] text-faint">{f.url}</div>
                </div>
                <Badge tone="green">{f.status}</Badge>
              </div>
            ))}
            <div className="space-y-3 border-t border-line pt-4">
              <Label>Import New Feed URL</Label>
              <Input placeholder="https://example.com/blocklist.txt" />
              <Button>
                <Upload size={13} /> Import Feed
              </Button>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="GitOps / Config Export"
            subtitle="Export the full WAF policy as declarative coraza-policy.yaml for CI/CD validation"
          />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="max-w-xl text-xs leading-relaxed text-muted">
              The exported policy contains CRS toggles, anomaly thresholds, custom SecLang rules,
              exceptions and IP lists. Wire it into GitHub Actions or GitLab CI to validate rules
              via the Coraza CLI before deployment.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => alert("coraza-policy.yaml generated (mock)")}>
                <Download size={13} /> Export coraza-policy.yaml
              </Button>
              <Button variant="ghost">View CI Pipeline Docs</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
