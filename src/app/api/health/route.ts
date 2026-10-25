import { NextResponse } from "next/server";
import { fetchUpstreamHealth } from "@/lib/api/account";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: { at: number; result: Awaited<ReturnType<typeof fetchUpstreamHealth>> } | null =
  null;
const CACHE_MS = 30_000;

/**
 * GET /api/health — health endpoint for Dokploy restart/health checks.
 *
 * The website itself reports "ok" as long as this route can respond; the
 * upstream Devora API status is reported separately so a temporary upstream
 * outage does not kill the website container.
 */
export async function GET() {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    cached = { at: Date.now(), result: await fetchUpstreamHealth() };
  }
  const upstream = cached.result;
  return NextResponse.json(
    {
      status: "ok",
      service: "devora-website",
      time: new Date().toISOString(),
      upstream: {
        configured: serverEnv.apiBaseUrl() !== null,
        baseUrl: serverEnv.apiBaseUrl()?.host ?? null,
        status: upstream.ok
          ? "reachable"
          : upstream.error.code === "not_configured"
            ? "not_checked"
            : "unreachable",
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
