"use client";

import { Card, CardHeader, PageHeader, Badge, cn } from "@/components/ui";
import { Braces, FileJson, KeyRound, EyeOff } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  apiSecurityStats,
  jwtStats,
  mockApiEndpoints,
  mockDataExposures,
} from "@/lib/mock-data";
import type { SchemaStatus } from "@/lib/types";

const specTone: Record<SchemaStatus, "green" | "amber" | "red"> = {
  VALIDATED: "green",
  DRIFTED: "amber",
  UNSPECIFIED: "red",
};

const methodColor: Record<string, string> = {
  GET: "bg-cyan-600/10 text-[var(--accent-text)] border-cyan-600/40",
  POST: "bg-emerald-950/60 text-emerald-300 border-emerald-800",
  PUT: "bg-amber-950/60 text-amber-300 border-amber-800",
  DELETE: "bg-red-950/60 text-red-300 border-red-800",
};

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: "cyan" | "amber" | "red" | "green";
}) {
  const tones = {
    cyan: "text-[var(--accent-text)] bg-cyan-600/10",
    amber: "text-amber-400 bg-amber-600/10",
    red: "text-red-400 bg-red-600/10",
    green: "text-emerald-400 bg-emerald-600/10",
  };
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
        <Icon size={18} />
      </span>
      <div>
        <div className="font-mono text-xl font-bold text-ink">
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      </div>
    </Card>
  );
}

export default function ApiSecurityPage() {
  const s = apiSecurityStats;
  return (
    <>
      <PageHeader
        title="API Security"
        description="Positive security model for APIs — OpenAPI schema validation, JWT inspection and sensitive-data exposure detection"
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Endpoints Monitored" value={s.endpoints_monitored} icon={Braces} />
        <Kpi label="Schema Violations (24h)" value={s.schema_violations_24h} icon={FileJson} tone="red" />
        <Kpi label="JWT Failures (24h)" value={s.jwt_failures_24h} icon={KeyRound} tone="amber" />
        <Kpi label="Sensitive Data Blocked" value={s.sensitive_blocked_24h} icon={EyeOff} tone="green" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="API Endpoint Inventory"
            subtitle="Schema conformance against the imported OpenAPI specification"
            right={<Badge tone="slate">openapi.yaml v2.4.1</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Endpoint</th>
                  <th className="px-5 py-2.5 font-medium">Auth</th>
                  <th className="px-5 py-2.5 font-medium">Spec Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Violations 24h</th>
                </tr>
              </thead>
              <tbody>
                {mockApiEndpoints.map((ep) => (
                  <tr key={ep.id} className="border-b border-line/50 hover:bg-hover/50">
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "mr-2 inline-block rounded border px-1.5 py-0.5 font-mono text-[10px]",
                          methodColor[ep.method]
                        )}
                      >
                        {ep.method}
                      </span>
                      <span className="font-mono text-dim">{ep.path}</span>
                      <span className="ml-2 font-mono text-[10px] text-faint">{ep.host}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={ep.auth === "NONE" ? "red" : "slate"}>{ep.auth}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={specTone[ep.spec_status]}>{ep.spec_status}</Badge>
                      {ep.spec_status === "DRIFTED" && (
                        <span className="ml-2 text-[11px] text-faint">response schema drift</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-mono",
                        ep.violations_24h > 20 ? "text-red-400" : ep.violations_24h > 0 ? "text-amber-400" : "text-faint"
                      )}
                    >
                      {ep.violations_24h}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="JWT Inspection" subtitle="Token validation results per hour" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={jwtStats}>
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 9 }} interval={2} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="valid" name="Valid" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="invalid_sig" name="Invalid Signature" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expired" name="Expired" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Sensitive Data Exposure"
          subtitle="PII / secret patterns detected in responses — masked or blocked before leaving the gateway"
        />
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-2.5 font-medium">Data Type</th>
              <th className="px-5 py-2.5 font-medium">Endpoint</th>
              <th className="px-5 py-2.5 font-medium">Location</th>
              <th className="px-5 py-2.5 text-right font-medium">Occurrences 24h</th>
              <th className="px-5 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockDataExposures.map((d) => (
              <tr key={d.id} className="border-b border-line/50 hover:bg-hover/50">
                <td className="px-5 py-3 font-mono text-amber-300">{d.data_type}</td>
                <td className="px-5 py-3 font-mono text-dim">{d.endpoint}</td>
                <td className="px-5 py-3 font-mono text-muted">{d.location}</td>
                <td className="px-5 py-3 text-right font-mono">{d.occurrences_24h}</td>
                <td className="px-5 py-3">
                  <Badge tone={d.action_taken === "BLOCKED" ? "red" : d.action_taken === "MASKED" ? "amber" : "slate"}>
                    {d.action_taken}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
