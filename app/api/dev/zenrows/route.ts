import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Tymczasowy endpoint diagnostyczny ZenRows - do usunięcia po naprawie scrapera.
// Auth: Bearer CRON_SECRET. Query: przekazywane 1:1 do ZenRows (poza apikey/url).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.ZENROWS_API_KEY;
  if (!key) return NextResponse.json({ error: "no-key" }, { status: 500 });

  const inUrl = new URL(req.url);
  const params = new URLSearchParams(inUrl.searchParams);
  const slice = Number(params.get("slice") || 400);
  params.delete("slice");
  params.set("apikey", key);
  if (!params.has("url")) params.set("url", "https://rovos.com/journeys/specials/");

  const start = Date.now();
  try {
    const res = await fetch(`https://api.zenrows.com/v1/?${params}`, {
      signal: AbortSignal.timeout(240000),
    });
    const body = await res.text();
    return NextResponse.json({
      status: res.status,
      durationMs: Date.now() - start,
      bodyLength: body.length,
      bodyStart: body.slice(0, slice),
      headers: Object.fromEntries(
        [...res.headers.entries()].filter(([k]) => k.startsWith("x-") || k === "content-type")
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, durationMs: Date.now() - start }, { status: 502 });
  }
}
