import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Minimal health for F0 - file fallback not yet implemented, return ok
  const response = {
    ok: true,
    lastCheck: null,
    historyLength: 0,
    uptime: "ok",
  };
  return NextResponse.json(response, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
