import {
  CORS_ALLOW_HEADERS,
  CORS_ALLOW_METHODS,
  matchAllowedOrigin,
} from "@/lib/cors";
import {
  BASE_SECURITY_HEADERS,
  buildContentSecurityPolicy,
} from "@/lib/security-headers";
import { NextRequest, NextResponse } from "next/server";

function applyBaseSecurityHeaders(response: NextResponse) {
  for (const { key, value } of BASE_SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
}

function applyPrivatePageCacheHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
}

function isPrivatePage(pathname: string): boolean {
  const prefixes = ["/dashboard", "/recharge", "/console", "/admin", "/chat"];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applyPageSecurityHeaders(
  request: NextRequest,
  response: NextResponse
) {
  applyBaseSecurityHeaders(response);
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isDev: process.env.NODE_ENV === "development",
    })
  );

  // 覆盖 CDN 默认的 Access-Control-Allow-Origin: *（页面无需通配 CORS）
  const origin = matchAllowedOrigin(request.headers.get("origin"));
  const host = request.headers.get("host");
  const selfOrigin =
    host != null
      ? `${request.nextUrl.protocol}//${host}`.replace(/\/$/, "")
      : null;

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.append("Vary", "Origin");
  } else if (selfOrigin && matchAllowedOrigin(selfOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", selfOrigin);
  }
}

function applyApiCors(request: NextRequest, response: NextResponse) {
  const origin = matchAllowedOrigin(request.headers.get("origin"));
  if (!origin) return;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.append("Vary", "Origin");
}

function apiPreflightResponse(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") return null;

  const origin = matchAllowedOrigin(request.headers.get("origin"));
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const preflight = apiPreflightResponse(request);
    if (preflight) return preflight;

    const response = NextResponse.next();
    applyBaseSecurityHeaders(response);
    applyApiCors(request, response);
    return response;
  }

  const response = NextResponse.next();
  applyPageSecurityHeaders(request, response);
  if (isPrivatePage(pathname)) {
    applyPrivatePageCacheHeaders(response);
  }
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|icon.png|site-logo.png).*)",
  ],
};
