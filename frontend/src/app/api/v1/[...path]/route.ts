// Same-origin API proxy via a route handler. Uses Node's native http client
// instead of global fetch, because Next.js 16 instruments fetch (for caching)
// and that breaks forwarding POST bodies to the Go backend. This forwards any
// method + body reliably.
import { NextRequest, NextResponse } from "next/server";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const TARGET = (process.env.API_PROXY ?? "http://localhost:8080").replace(/\/+$/, "");

function rawRequest(
  url: string,
  method: string,
  headers: Headers,
  body: string | null
): Promise<{ status: number; statusText: string; headers: Headers; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === "https:" ? httpsRequest : httpRequest;
    const h: Record<string, string> = {};
    headers.forEach((v, k) => {
      if (!["connection", "content-length", "host"].includes(k.toLowerCase())) h[k] = v;
    });
    if (body !== null) h["content-length"] = String(Buffer.byteLength(body));

    const req = client(
      { hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method, headers: h },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const respHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") respHeaders.set(k, v);
          }
          resolve({
            status: res.statusCode ?? 502,
            statusText: res.statusMessage ?? "",
            headers: respHeaders,
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("error", (err) => reject(err));
    if (body !== null) req.write(body);
    req.end();
  });
}

async function forward(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const url = `${TARGET}/api/v1/${path.join("/")}${search}`;

  let body: string | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const res = await rawRequest(url, req.method, req.headers, body);
    return new NextResponse(res.body as unknown as BodyInit, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `control plane unreachable (${url}): ${msg}` },
      { status: 502 }
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;