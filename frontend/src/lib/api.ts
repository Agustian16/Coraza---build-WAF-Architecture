// REST client for the Corazium control plane.
// When NEXT_PUBLIC_API_URL is set (docker-compose sets it), pages fetch live
// data from the Go backend; on failure they keep their seeded mock values so
// the UI still renders without the backend.
import type {
  AccessEvent,
  ApiEndpoint,
  AuditLog,
  BotCategory,
  CorazaNode,
  CrsCategory,
  CustomRule,
  DataExposure,
  IpListEntry,
  RateLimitRule,
  RuleException,
  Site,
} from "./types";
import { mockNodes } from "./mock-data";

export const API_BASE = "/api/v1";

const TOKEN_COOKIE = "corazium_token";

// Token lives in a cookie (readable by the server-side proxy for route
// guards) — localStorage kept as a mirror for same-tab reads.
export const getToken = (): string | null => {
  if (typeof document !== "undefined") {
    const m = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  }
  if (typeof window !== "undefined") return localStorage.getItem(TOKEN_COOKIE);
  return null;
};

export const setToken = (t: string) => {
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(t)}; path=/; max-age=86400; SameSite=Lax`;
  localStorage.setItem(TOKEN_COOKIE, t);
};

export const clearToken = () => {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  localStorage.removeItem(TOKEN_COOKIE);
};

function headers(): HeadersInit {
  const t = getToken();
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
}

function handle401(res: Response) {
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    clearToken();
    window.location.href = "/login";
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  handle401(res);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) throw new Error(`${method} ${path} -> ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

// ---- reads ----

export interface DashboardOverview {
  kpi: {
    total_rps: number;
    blocked_24h: number;
    block_ratio_pct: number;
    avg_latency_ms: number;
  };
  nodes_online: number;
  nodes_total: number;
  config_version: string;
  posture: {
    score: number;
    checks: { label: string; detail: string; ok: boolean }[];
  };
}

export const getOverview = () => get<DashboardOverview>("/dashboard/overview");
export const getNodes = () => get<CorazaNode[]>("/nodes");
export const getSites = () => get<Site[]>("/sites");
export const getCrsCategories = () => get<CrsCategory[]>("/crs/categories");
export const getRules = () => get<CustomRule[]>("/rules");
export const getLogs = (filters?: Record<string, string>) => {
  const qs = filters ? "?" + new URLSearchParams(filters).toString() : "";
  return get<AuditLog[]>(`/logs${qs}`);
};
export const getExceptions = () => get<RuleException[]>("/exceptions");
export const getAccessEvents = () => get<AccessEvent[]>("/access-events");
export const getIpList = () => get<IpListEntry[]>("/ip-list");
export const getRateLimits = () => get<RateLimitRule[]>("/rate-limits");
export const getBots = () => get<BotCategory[]>("/bots");
export const getApiEndpoints = () => get<ApiEndpoint[]>("/api-security/endpoints");
export const getExposures = () => get<DataExposure[]>("/api-security/exposures");
export const getGeo = () => get<import("./types").GeoStat[]>("/geo");

// ---- Auth ----

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  setToken(data.token);
  return data;
}

export const getMe = () => get<AuthUser>("/auth/me");
export const updateProfile = (payload: { name?: string; email?: string }) =>
  send<{ token: string; user: AuthUser }>("PATCH", "/auth/profile", payload);
export const changePassword = (current: string, newPassword: string) =>
  send("PUT", "/auth/password", { current, new: newPassword });
export const logout = () => {
  clearToken();
  window.location.href = "/login";
};

// ---- Auth ----
// ---- writes (fire-and-forget helpers used by interactive controls) ----

export const toggleCrsCategory = (id: string, enabled: boolean) =>
  send("PATCH", `/crs/categories/${id}`, { enabled });
export const updateSite = (
  id: string,
  payload: { paranoia_level?: number; inbound_threshold?: number; outbound_threshold?: number }
) => send("PATCH", `/sites/${id}`, payload);
export const createException = (payload: {
  rule_id: number;
  path_pattern: string;
  parameter_name?: string;
  reason: string;
}) => send("POST", "/exceptions", payload);
export const deleteException = (id: string) => send("DELETE", `/exceptions/${id}`);
export const addIp = (cidr: string, list: "allow" | "block") =>
  send("POST", "/ip-list", { cidr, list });
export const deleteIp = (id: string) => send("DELETE", `/ip-list/${id}`);
export const updateRateLimit = (id: string, payload: { enabled?: boolean; action?: string }) =>
  send("PATCH", `/rate-limits/${id}`, payload);
export const addRateLimit = (payload: {
  name: string;
  endpoint: string;
  threshold: number;
  window_sec?: number;
  action?: string;
}) => send("POST", "/rate-limits", payload);
export const deleteRateLimit = (id: string) => send("DELETE", `/rate-limits/${id}`);
export const updateBotAction = (id: string, action: string) =>
  send("PATCH", `/bots/${id}`, { action });
export const createRule = (payload: {
  rule_id: number;
  name: string;
  seclang_raw: string;
  site_id?: string;
  is_active?: boolean;
}) => send("POST", "/rules", payload);
export const updateRule = (
  id: string,
  payload: { name?: string; seclang_raw?: string; is_active?: boolean }
) => send("PATCH", `/rules/${id}`, payload);
export const deleteRule = (id: string) => send("DELETE", `/rules/${id}`);
export const testSandbox = (payload: string) =>
  send<{ result: string; rule_id: number; message: string; matched_data: string }>(
    "POST",
    "/rules/sandbox",
    { payload }
  );
export const registerNode = (payload: {
  node_name: string;
  ip_address: string;
  version?: string;
  crs_version?: string;
}) => send<{ node: CorazaNode; config_version: string }>("POST", "/nodes", payload);
export const getFeeds = () =>
  get<
    { id: string; name: string; url: string; interval: string; status: string; last_sync: string }[]
  >("/feeds");
export const importFeed = (payload: { name: string; url: string; interval?: string }) =>
  send("POST", "/feeds", payload);
export const refreshFeed = (id: string) => send("POST", `/feeds/${id}/refresh`);
export const policyExportUrl = "/api/v1/policy/export";

// Downloads the declarative policy with the auth token attached (a plain
// <a href> cannot send the Authorization header, which would 401).
export async function downloadPolicyYaml() {
  const res = await fetch(policyExportUrl, { headers: headers() });
  if (!res.ok) throw new Error(`export failed (${res.status})`);
  const text = await res.text();
  const url = URL.createObjectURL(new Blob([text], { type: "application/x-yaml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "coraza-policy.yaml";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { mockNodes };
