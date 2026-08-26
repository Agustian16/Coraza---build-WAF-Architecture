"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, PageHeader, Button, Badge, Input, Label, Select, useToast } from "@/components/ui";
import { Download, RefreshCw, Plus, Trash2 } from "lucide-react";
import { mockIpList } from "@/lib/mock-data";
import { addIp as apiAddIp, changePassword, deleteIp, downloadPolicyYaml, getFeeds, getIpList, getMe, importFeed, refreshFeed, setToken, updateProfile, type AuthUser } from "@/lib/api";

interface Feed {
  id: string;
  name: string;
  url: string;
  interval: string;
  status: string;
  last_sync: string;
}

export default function SettingsPage() {
  const [ipList, setIpList] = useState(mockIpList);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [cidr, setCidr] = useState("");
  const [listType, setListType] = useState<"allow" | "block">("block");
  const [feedUrl, setFeedUrl] = useState("");
  const { show: showToast, node: toastNode } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [pw, setPw] = useState({ current: "", new: "" });
  useEffect(() => { getMe().then((u) => { setUser(u); setProfile({ name: u.name, email: u.email }); }).catch(() => {}); }, []);

  const refreshIps = () => getIpList().then(setIpList).catch(() => {});
  const refreshFeeds = () => getFeeds().then(setFeeds).catch(() => {});
  useEffect(() => {
    getIpList().then(setIpList).catch(() => {});
    getFeeds().then(setFeeds).catch(() => {});
  }, []);

  const handleAddIp = () => {
    if (!cidr.trim()) return;
    apiAddIp(cidr.trim(), listType)
      .then(() => {
        showToast(`${cidr.trim()} added to ${listType}list`);
        setCidr("");
        refreshIps();
      })
      .catch(() => showToast("Failed to add entry", false));
  };

  const handleImportFeed = () => {
    if (!feedUrl.trim()) return;
    const name = feedUrl.split("/").pop()?.replace(/\.[a-z]+$/, "") || "custom_feed";
    importFeed({ name, url: feedUrl.trim() })
      .then(() => {
        showToast("Threat feed imported");
        setFeedUrl("");
        refreshFeeds();
      })
      .catch(() => showToast("Failed to import feed", false));
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Threat intelligence feeds, IP reputation lists and GitOps export"
      />

      <Card className="mb-5">
        <CardHeader title="User Profile" subtitle="Account details and credentials (RBAC roles: Admin / SecOps Analyst / Auditor)" />
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <Label>Display Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Label>Email</Label>
            <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Button
              variant="primary"
              onClick={() =>
                updateProfile(profile)
                  .then((res) => {
                    setToken(res.token);
                    setUser(res.user);
                    showToast("Profile updated");
                  })
                  .catch(() => showToast("Failed to update profile", false))
              }
            >
              Save Profile
            </Button>
          </div>
          <div className="space-y-3 lg:border-l lg:border-line lg:pl-6">
            <Label>Current Password</Label>
            <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            <Label>New Password (min 8 chars)</Label>
            <Input type="password" value={pw.new} onChange={(e) => setPw({ ...pw, new: e.target.value })} />
            <Button
              onClick={() => {
                changePassword(pw.current, pw.new)
                  .then(() => {
                    showToast("Password changed");
                    setPw({ current: "", new: "" });
                  })
                  .catch(() => showToast("Failed to change password", false))
              }}
            >
              Change Password
            </Button>
          </div>
        </div>
      </Card>
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
              <Input placeholder="192.168.1.0/24" value={cidr} onChange={(e) => setCidr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddIp()} />
              <Button variant="primary" onClick={handleAddIp}>
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
                    onClick={() => deleteIp(e.id).then(refreshIps).catch(() => showToast("Failed to remove", false))}
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
            <div className="divide-y divide-line/60 rounded-lg border border-line">
              {feeds.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-ink">
                      {f.name} <span className="text-faint">· {f.interval}</span>
                    </div>
                    <div className="truncate font-mono text-[10px] text-faint">{f.url}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={f.status === "SYNCED" ? "green" : f.status === "ERROR" ? "red" : "amber"}>{f.status}</Badge>
                    <button
                      aria-label={`Refresh ${f.name}`}
                      onClick={() => refreshFeed(f.id).then(refreshFeeds).catch(() => showToast("Refresh failed", false))}
                      className="text-faint hover:text-cyan-400"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <span className="hidden font-mono text-[10px] text-faint sm:block">
                      {f.last_sync ? f.last_sync.slice(0, 10) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-line pt-4">
              <Label>Import New Feed URL</Label>
              <Input placeholder="https://example.com/blocklist.txt" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleImportFeed()} />
              <Button onClick={handleImportFeed}>
                <Download size={13} className="hidden" />
                <RefreshCw size={13} /> Import Feed
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
              <Button
                onClick={() =>
                  downloadPolicyYaml()
                    .then(() => showToast("coraza-policy.yaml downloaded"))
                    .catch(() => showToast("Failed to export policy", false))
                }
              >
                <Download size={13} /> Export coraza-policy.yaml
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {toastNode}
    </>
  );
}
