"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Server,
  Shield,
  ScrollText,
  Ban,
  Settings,
  TerminalSquare,
  CircleUserRound,
  ShieldCheck,
  Gauge,
  Bot,
  Braces,
} from "lucide-react";
import { cn, Badge, Button } from "./ui";
import { ThemeToggle } from "./theme";
import { getMe, logout, type AuthUser } from "@/lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Fleet Management", icon: Server },
  { href: "/rules", label: "Rules & CRS", icon: Shield },
  { href: "/api-security", label: "API Security", icon: Braces },
  { href: "/access-control", label: "Allow & Deny", icon: ShieldCheck },
  { href: "/rate-limiting", label: "DDoS & Rate Limiting", icon: Gauge },
  { href: "/anti-bot", label: "Bot Management", icon: Bot },
  { href: "/logs", label: "Log Explorer", icon: ScrollText },
  { href: "/exceptions", label: "Exceptions", icon: Ban },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async getMe + rAF avatar read
  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .catch(() => {});
    const raf = requestAnimationFrame(() => {
      try {
        setAvatar(localStorage.getItem("corazium_avatar"));
      } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-bg transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-[18px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/15 text-[var(--accent-text)]">
            <TerminalSquare size={18} />
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight text-ink">
              Corazium
            </div>
            <div className="font-mono text-[10px] text-muted">WAAP control plane</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-cyan-600/10 font-medium text-[var(--nav-active)]"
                    : "text-muted hover:bg-panel hover:text-ink"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <button
            onClick={() => router.push("/settings/profile")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-panel"
            title="Open profile"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <CircleUserRound size={26} className="shrink-0 text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-dim">
                {user?.email ?? "…"}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="cyan">{user?.role ?? "—"}</Badge>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  className="text-[10px] text-faint hover:text-red-400"
                >
                  Logout
                </span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-5 py-3 backdrop-blur">
          <Button
            variant="ghost"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </Button>
          <Badge tone="green" dot>
            CONTROL PLANE CONNECTED
          </Badge>
          <span className="ml-auto hidden font-mono text-[11px] text-faint sm:block">
            gRPC stream · mTLS · config v104
          </span>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
