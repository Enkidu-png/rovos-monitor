import { NextResponse } from "next/server";
import { checkCycle } from "@/lib/check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return auth === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkCycle();
    return NextResponse.json(
      {
        changed: result.changed,
        hash: result.hash,
        lastHash: result.hash,
        durationMs: result.durationMs,
        usedFallback: result.usedFallback ?? false,
        error: result.error,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    return NextResponse.json({ changed: false, error: msg, durationMs: 0, hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }, { status: 200 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
