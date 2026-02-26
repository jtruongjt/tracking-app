import { NextRequest, NextResponse } from "next/server";

function withDebugHeaders(response: NextResponse, state: string) {
  response.headers.set("x-basic-auth-middleware", "on");
  response.headers.set("x-basic-auth-state", state);
  return response;
}

function unauthorized() {
  return withDebugHeaders(
    new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Tracking App", charset="UTF-8"'
      }
    }),
    "auth-required"
  );
}

function misconfigured() {
  return withDebugHeaders(
    new NextResponse("Basic auth is misconfigured.", {
      status: 500,
    }),
    "misconfigured"
  );
}

function decodeBasicAuth(headerValue: string): { username: string; password: string } | null {
  if (!headerValue.startsWith("Basic ")) return null;

  try {
    const encoded = headerValue.slice("Basic ".length).trim();
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUsername = process.env.BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // Gate is enabled only when both values are configured.
  if (!expectedUsername && !expectedPassword) {
    return withDebugHeaders(NextResponse.next(), "disabled");
  }

  if (!expectedUsername || !expectedPassword) {
    return misconfigured();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return unauthorized();
  }

  const creds = decodeBasicAuth(authHeader);
  if (!creds) {
    return unauthorized();
  }

  if (creds.username !== expectedUsername || creds.password !== expectedPassword) {
    return unauthorized();
  }

  return withDebugHeaders(NextResponse.next(), "authorized");
}

export const config = {
  matcher: [
    // Protect app pages and API routes, but skip framework assets and common public files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"
  ]
};
