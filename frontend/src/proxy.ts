// Server-side route guard: unauthenticated visitors are redirected to
// /login before any console page renders. The API itself still enforces
// the real token validation (defense in depth).
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("corazium_token")?.value;
  const { pathname } = req.nextUrl;

  if (!token && pathname !== "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // everything except the API proxy, Next internals and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
