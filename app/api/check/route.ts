import { NextResponse } from "next/server";
import { checkCycle } from "@/lib/check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, number>();
const RATE_WINDOW_MS = 30 * 1000;

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  // Allow in development without auth, require CRON_SECRET in production
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    const expected = process.env.CRON_SECRET;
    if (!expected || auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // rate-limit: 1 request / 30s per IP
  const ip = getClientIp(req);
  const now = Date.now();
  const last = rateLimitMap.get(ip);
  const isForm =
    req.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ||
    req.headers.get("content-type")?.includes("multipart/form-data") ||
    req.headers.get("accept")?.includes("text/html");
  if (last !== undefined && now - last < RATE_WINDOW_MS) {
    if (isForm) {
      const url = new URL("/", req.url);
      url.searchParams.set("checked", "1");
      url.searchParams.set("error", "rate-limited");
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: "rate-limited, try in 30s" }, { status: 429 });
  }
  rateLimitMap.set(ip, now);
  try {
    const result = await checkCycle();
    if (isForm) {
      const url = new URL("/", req.url);
      url.searchParams.set("checked", "1");
      url.searchParams.set("changed", String(result.changed));
      url.searchParams.set("hash", result.hash.slice(0, 8));
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({
      changed: result.changed,
      hash: result.hash,
      durationMs: result.durationMs,
      usedFallback: result.usedFallback,
      error: result.error,
      snippet: result.hash.slice(0, 8),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isForm) {
      const url = new URL("/", req.url);
      url.searchParams.set("checked", "1");
      url.searchParams.set("error", msg.slice(0, 100));
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export function _resetRateLimit() {
  rateLimitMap.clear();
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
