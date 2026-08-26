"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TerminalSquare, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    login(email, password)
      .then(() => router.push("/dashboard"))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/15 text-cyan-400">
            <TerminalSquare size={24} />
          </span>
          <h1 className="text-lg font-bold text-ink">Corazium</h1>
          <p className="text-xs text-muted">
            Web Application &amp; API Protection (WAAP)
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="admin@corazium.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="w-full justify-center py-2.5 text-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 space-y-1.5 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-faint">
            <ShieldCheck size={13} /> OAuth2 / OIDC + MFA ready (Keycloak, Okta)
          </p>
          <p className="font-mono text-[10px] text-faint">
            demo: admin@corazium.io / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
