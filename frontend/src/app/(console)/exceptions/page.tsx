"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, PageHeader, Button, Badge, EmptyState, fmtDate, Modal, Input, Label, useToast } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { mockExceptions, mockSites } from "@/lib/mock-data";
import { createException, deleteException, getExceptions } from "@/lib/api";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState(mockExceptions);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rule_id: 942100, path_pattern: "", parameter_name: "", reason: "" });
  const { show: showToast, node: toastNode } = useToast();
  useEffect(() => { getExceptions().then(setExceptions).catch(() => {}); }, []);

  return (
    <>
      <PageHeader
        title="False Positive Exceptions"
        description="Rule suppressions generated via one-click exception — deployed as SecRuleUpdateTargetById"
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
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
                        <Button variant="ghost" aria-label="Revoke" onClick={() => deleteException(e.id).then(() => getExceptions().then(setExceptions)).catch(() => showToast("Failed to delete exception", false))}>
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

      <Modal open={open} onClose={() => setOpen(false)} title="New Exception">
        <div className="space-y-4">
          <div>
            <Label>Rule ID</Label>
            <Input type="number" value={form.rule_id} onChange={(e) => setForm({ ...form, rule_id: +e.target.value })} />
          </div>
          <div>
            <Label>Path Pattern</Label>
            <Input placeholder="/api/v1/upload/*" value={form.path_pattern} onChange={(e) => setForm({ ...form, path_pattern: e.target.value })} />
          </div>
          <div>
            <Label>Parameter (optional)</Label>
            <Input placeholder="ARGS:file_description" value={form.parameter_name} onChange={(e) => setForm({ ...form, parameter_name: e.target.value })} />
          </div>
          <div>
            <Label>Reason</Label>
            <Input placeholder="Why is this a false positive?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              if (!form.path_pattern) return;
              createException(form)
                .then(() => {
                  setOpen(false);
                  showToast("Exception created — SecRuleUpdateTargetById deployed");
                  getExceptions().then(setExceptions).catch(() => {});
                })
                .catch(() => showToast("Failed to create exception", false));
            }}
          >
            Create Exception
          </Button>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
