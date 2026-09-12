import { NextResponse } from "next/server";
import { checkCycle } from "@/lib/check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Allow in development without auth, require CRON_SECRET in production
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    const expected = process.env.CRON_SECRET;
    if (!expected || auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // simple rate-limit placeholder for F1: allow, real limit in F3-02
  try {
    const result = await checkCycle();
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
