"use client";

import { useState } from "react";
import { Card, CardHeader, PageHeader, Button, Badge, EmptyState, fmtDate } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { mockExceptions, mockSites } from "@/lib/mock-data";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState(mockExceptions);

  return (
    <>
      <PageHeader
        title="False Positive Exceptions"
        description="Rule suppressions generated via one-click exception — deployed as SecRuleUpdateTargetById"
        actions={
          <Button variant="primary">
            <Plus size={13} /> New Exception
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Active Suppressions"
          subtitle={`${exceptions.length} exceptions across ${mockSites.length} sites`}
        />
        {exceptions.length === 0 ? (
          <EmptyState message="No exceptions configured." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Site</th>
                  <th className="px-5 py-2.5 font-medium">Rule ID</th>
                  <th className="px-5 py-2.5 font-medium">Path Pattern</th>
                  <th className="px-5 py-2.5 font-medium">Parameter</th>
                  <th className="px-5 py-2.5 font-medium">Reason</th>
                  <th className="px-5 py-2.5 font-medium">Created</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((e) => {
                  const site = mockSites.find((s) => s.id === e.site_id);
                  return (
                    <tr key={e.id} className="border-b border-line hover:bg-hover/50">
                      <td className="px-5 py-3 font-mono text-[var(--accent-text)]">{site?.domain_name ?? e.site_id}</td>
                      <td className="px-5 py-3 font-mono">{e.rule_id}</td>
                      <td className="px-5 py-3 font-mono text-muted">{e.path_pattern}</td>
                      <td className="px-5 py-3 font-mono text-muted">{e.parameter_name ?? "—"}</td>
                      <td className="max-w-[280px] px-5 py-3 text-muted">{e.reason}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">
                        {fmtDate(e.created_at)}{" "}
                        <Badge tone="slate">{e.created_by.split("@")[0]}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" aria-label="Revoke" onClick={() => setExceptions((xs) => xs.filter((x) => x.id !== e.id))}>
                          <Trash2 size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
