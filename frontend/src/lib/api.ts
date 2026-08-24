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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function get<T>(path: string): Promise<T> {
  if (!API_BASE) throw new Error("api disabled");
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_BASE) throw new Error("api disabled");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
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
export const addIp = (cidr: string, list: "allow" | "block") =>
  send("POST", "/ip-list", { cidr, list });
export const updateRateLimit = (id: string, payload: { enabled?: boolean; action?: string }) =>
  send("PATCH", `/rate-limits/${id}`, payload);
export const updateBotAction = (id: string, action: string) =>
  send("PATCH", `/bots/${id}`, { action });
export const testSandbox = (payload: string) =>
  send<{ result: string; rule_id: number; message: string; matched_data: string }>(
    "POST",
    "/rules/sandbox",
    { payload }
  );

export { mockNodes };
