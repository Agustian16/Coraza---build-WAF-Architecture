"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  PageHeader,
  Button,
  Badge,
  Modal,
  Input,
  Label,
} from "@/components/ui";
import { Plus, RefreshCw, Cpu, MemoryStick } from "lucide-react";
import { mockNodes } from "@/lib/mock-data";
import { getNodes } from "@/lib/api";
import type { CorazaNode } from "@/lib/types";

function statusTone(s: CorazaNode["status"]) {
  return s === "ONLINE" ? "green" : s === "WARN" ? "amber" : "red";
}

export default function FleetPage() {
  const [nodes, setNodes] = useState(mockNodes);
  useEffect(() => { getNodes().then(setNodes).catch(() => {}); }, []);
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Fleet Management"
        description="Coraza edge nodes registered to this control plane via gRPC (mTLS)"
        actions={
          <>
            <Button>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => setRegisterOpen(true)}>
              <Plus size={13} /> Register Node
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Node Inventory"
          subtitle={`${nodes.length} nodes · ${nodes.filter((n) => n.status !== "OFFLINE").length} reachable`}
          right={<Badge tone="cyan">config v104</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Node Name</th>
                <th className="px-5 py-2.5 font-medium">Hostname / IP</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">CPU</th>
                <th className="px-5 py-2.5 text-right font-medium">Mem</th>
                <th className="px-5 py-2.5 text-right font-medium">RPS</th>
                <th className="px-5 py-2.5 text-right font-medium">Latency</th>
                <th className="px-5 py-2.5 font-medium">CRS Version</th>
                <th className="px-5 py-2.5 font-medium">Sync Status</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id} className="border-b border-line hover:bg-hover/50">
                  <td className="px-5 py-3">
                    <div className="font-mono font-medium text-ink">{n.node_name}</div>
                    <div className="text-[11px] text-faint">{n.version}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-muted">{n.ip_address}</td>
                  <td className="px-5 py-3">
                    <Badge dot tone={statusTone(n.status)}>
                      {n.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Cpu size={12} className="text-faint" />
                      {n.cpu_pct}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <MemoryStick size={12} className="text-faint" />
                      {n.mem_pct}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{n.rps.toLocaleString("en-US")}</td>
                  <td
                    className={`px-5 py-3 text-right font-mono ${
                      n.latency_ms > 2 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {n.latency_ms.toFixed(1)} ms
                  </td>
                  <td className="px-5 py-3 font-mono text-muted">{n.crs_version}</td>
                  <td className="px-5 py-3">
                    <Badge tone={n.sync_status === "IN_SYNC" ? "green" : "amber"}>
                      {n.sync_status === "IN_SYNC" ? `IN_SYNC (${n.config_version})` : n.sync_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Register Node">
        <p className="mb-4 text-xs leading-relaxed text-muted">
          Deploy the Coraza agent on the target host and provide the enrollment token.
          The node registers itself over gRPC with an x509 mTLS certificate.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Node Name</Label>
            <Input placeholder="edge-jkt-caddy-04" />
          </div>
          <div>
            <Label>IP Address / Hostname</Label>
            <Input placeholder="10.10.3.20" />
          </div>
          <div>
            <Label>Enrollment Token</Label>
            <Input placeholder="czc_••••••••••••••••••••••••" />
          </div>
          <Button variant="primary" className="w-full justify-center" onClick={() => setRegisterOpen(false)}>
            Generate Agent Config
          </Button>
        </div>
      </Modal>
    </>
  );
}
