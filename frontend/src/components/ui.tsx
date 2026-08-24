import clsx from "clsx";

export function cn(...parts: Parameters<typeof clsx>) {
  return clsx(parts);
}

// Deterministic date rendering — locale/timezone-dependent Date methods
// (e.g. toLocaleDateString) cause server/client hydration text mismatches.
export const fmtDate = (iso: string) => iso.slice(0, 10);

// Same for numbers: server (en-US) vs client (e.g. id-ID) separators differ.
export const fmtNum = (n: number) => n.toLocaleString("en-US");

// ---- Card ----

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-panel shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ---- Button ----

const btnVariants = {
  primary:
    "bg-cyan-600 hover:bg-cyan-500 text-white border-transparent shadow-[0_0_12px_rgba(6,182,212,0.25)]",
  secondary: "bg-hover hover:bg-hover/70 text-ink border-line2",
  danger: "bg-red-600/90 hover:bg-red-600 text-white border-transparent",
  ghost:
    "bg-transparent hover:bg-hover text-muted hover:text-ink border-transparent",
};

export function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof btnVariants;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        btnVariants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

// ---- Badge ----

export function Badge({
  children,
  tone = "slate",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "cyan" | "slate";
  dot?: boolean;
}) {
  const tones = {
    green: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
    amber: "text-amber-400 bg-amber-950/60 border-amber-800",
    red: "text-red-400 bg-red-950/60 border-red-800",
    cyan: "text-[var(--accent-text)] bg-cyan-600/10 border-cyan-600/40",
    slate: "text-muted bg-hover/60 border-line2",
  };
  const dots = {
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    cyan: "bg-cyan-400",
    slate: "bg-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] leading-4",
        tones[tone]
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

// ---- Toggle switch ----

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || "toggle"}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-10 shrink-0 rounded-full border transition-colors",
          checked ? "border-cyan-500 bg-cyan-600" : "border-line2 bg-[var(--switch-off)]"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-[calc(100%-1rem)]" : "left-1"
          )}
        />
      </button>
      {label && <span className="text-xs text-muted">{label}</span>}
    </label>
  );
}

// ---- Inputs ----

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-line2 bg-bg px-3 py-1.5 text-xs text-ink placeholder:text-faint focus:border-cyan-600 focus:outline-none",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-line2 bg-bg px-3 py-1.5 text-xs text-ink focus:border-cyan-600 focus:outline-none",
        props.className
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted">
      {children}
    </label>
  );
}

// ---- Modal ----

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-xl border border-line bg-panel shadow-2xl",
          wide ? "max-w-3xl" : "max-w-md"
        )}
      >
        <CardHeader
          title={title}
          right={
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          }
        />
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Page header ----

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Empty state ----

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="font-mono text-3xl text-faint">{"{ }"}</span>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
