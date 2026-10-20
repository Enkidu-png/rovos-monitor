import { NextResponse } from "next/server";
import { sendChangeNotification } from "@/lib/email";
import { loadConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Tymczasowy endpoint testu toru mailowego - do usunięcia po weryfikacji.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cfg = loadConfig();
  try {
    await sendChangeNotification({
      to: cfg.recipient,
      url: cfg.url,
      snippet: "TEST toru mailowego rovos-monitor - ta wiadomosc potwierdza, ze Gmail dziala. Zadna zmiana na stronie nie zaszla.",
      hash: "test-" + new Date().toISOString(),
    });
    return NextResponse.json({ sent: true, to: cfg.recipient });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ sent: false, error: msg }, { status: 500 });
  }
}
