import { NextResponse } from "next/server";
import { getLastCheck, getHistory } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [lastCheck, history] = await Promise.all([getLastCheck(), getHistory()]);
  const response = {
    ok: true,
    lastCheck: lastCheck ?? null,
    historyLength: history.length,
    hashPrefix: null as string | null,
    uptime: "ok",
  };
  if (history.length > 0 && history[0].hash) {
    response.hashPrefix = history[0].hash.slice(0, 8);
  }
  return NextResponse.json(response, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
