"use client";

import { useRouter } from "next/navigation";
import { TerminalSquare, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui";

// ponytail: mock OIDC login — wire to real Keycloak/Okta SSO when backend exists
export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/15 text-[var(--accent-text)]">
            <TerminalSquare size={24} />
          </span>
          <h1 className="text-lg font-bold text-ink">Corazium</h1>
          <p className="text-xs text-muted">
            Web Application &amp; API Protection (WAAP)
          </p>
        </div>

        <Button
          variant="primary"
          className="w-full justify-center py-2.5 text-sm"
          onClick={() => router.push("/dashboard")}
        >
          <KeyRound size={15} />
          Sign in with SSO (OIDC)
        </Button>

        <div className="mt-6 space-y-1.5 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-faint">
            <ShieldCheck size={13} /> Protected by OAuth2 / OpenID Connect · MFA required
          </p>
          <p className="font-mono text-[10px] text-faint">
            Providers: Keycloak · Okta · Google Workspace
          </p>
        </div>
      </div>
    </div>
  );
}
