import { normalizeContent, isCloudflareChallenge } from "./normalizer";
import { loadConfig } from "./config";

export type ScrapeResult = {
  content: string | null;
  error?: string;
  durationMs: number;
  usedFallback: boolean;
};

const TIMEOUT = 10000;
const RETRY = 3;
const RETRY_DELAY = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeSpecials(
  url?: string,
  opts?: { timeoutMs?: number }
): Promise<ScrapeResult> {
  const cfg = loadConfig();
  const target = url || cfg.url;
  const selector = cfg.selector || "main";
  const timeoutMs = opts?.timeoutMs ?? TIMEOUT;
  const start = Date.now();

  let sawCloudflare = false;
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    try {
      const res = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const html = await res.text();
      if (isCloudflareChallenge(html)) {
        sawCloudflare = true;
        throw new Error("cloudflare-challenge");
      }
      const content = normalizeContent(html, selector);
      return { content, durationMs: Date.now() - start, usedFallback: false };
    } catch (e) {
      if (e instanceof Error && e.message.includes("cloudflare")) sawCloudflare = true;
      if (attempt === RETRY) break;
      await sleep(RETRY_DELAY);
    }
  }

  // fallback: playwright
  // ponytail: lazy import only in fallback branch
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { chromium: pw } = await import("playwright-core");
    const executablePath = await chromium.executablePath();
    const browser = await pw.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(3000);
    const html = await page.content();
    await browser.close();
    if (isCloudflareChallenge(html)) {
      return { content: null, error: "cloudflare-still-blocked", durationMs: Date.now() - start, usedFallback: true };
    }
    const content = normalizeContent(html, selector);
    return { content, durationMs: Date.now() - start, usedFallback: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    if (sawCloudflare || msg.includes("cloudflare")) {
      return { content: null, error: "cloudflare-challenge", durationMs: Date.now() - start, usedFallback: false };
    }
    return { content: null, error: msg, durationMs: Date.now() - start, usedFallback: true };
  }
}
