import { NextRequest } from "next/server";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (path.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p)))
    return Response.json(
      { error: { message: "Invalid path" } },
      { status: 400 },
    );
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const name of ["authorization", "x-guest-id", "idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // No cookies or server-held admin secret are added to public requests.
  const origin = request.headers.get("origin");
  // Next may normalize request.nextUrl.hostname to its internal bind hostname.
  // The HTTP Host is the browser-facing authority; never trust forwarded hosts.
  const expectedOrigin =
    process.env.FRONTEND_PUBLIC_URL ||
    `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (request.method !== "GET" && origin && origin !== expectedOrigin) {
    return Response.json(
      { error: { message: "Cross-origin request blocked" } },
      { status: 403 },
    );
  }
  const body = request.method === "GET" ? undefined : await request.text();
  if (body && new TextEncoder().encode(body).length > 32768)
    return Response.json(
      { error: { message: "Request too large" } },
      { status: 413 },
    );
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL || "http://127.0.0.1:8000"}/api/v1/${path.join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Request-ID": upstream.headers.get("X-Request-ID") || "",
      },
    });
  } catch {
    return Response.json(
      {
        error: {
          message:
            "Our reading room is temporarily unavailable. Please try again.",
        },
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
