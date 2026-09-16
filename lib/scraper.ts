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
// ZenRows: RETRY 2 (nie 3, ZenRows już retry), timeout 15000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function hasZenRows(): boolean {
  return !!process.env.ZENROWS_API_KEY;
}

export async function scrapeViaZenRows(target: string, selector = "main"): Promise<ScrapeResult> {
  const start = Date.now();
  const key = process.env.ZENROWS_API_KEY;
  if (!key) {
    return { content: null, error: "zenrows-missing-key", durationMs: Date.now() - start, usedFallback: false };
  }
  const url = `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(target)}&js_render=true&antibot=true&premium_proxy=true&wait=5000`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      const html = await res.text();
      if (!res.ok) {
        const slice = html.slice(0, 200);
        return { content: null, error: `zenrows-error: ${res.status} ${slice}`, durationMs: Date.now() - start, usedFallback: false };
      }
      const content = normalizeContent(html, selector);
      return { content, durationMs: Date.now() - start, usedFallback: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
      if (attempt === 2) {
        return { content: null, error: msg, durationMs: Date.now() - start, usedFallback: false };
      }
      await sleep(RETRY_DELAY);
    }
  }
  return { content: null, error: "zenrows-error: unknown", durationMs: Date.now() - start, usedFallback: false };
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

  // 1) ZenRows primary if key present
  if (hasZenRows()) {
    const zr = await scrapeViaZenRows(target, selector);
    if (zr.content && !isCloudflareChallenge(zr.content) && !zr.error) {
      return zr;
    }
    if (zr.error && zr.error.includes("zenrows-missing-key")) {
      // no key -> fall through to fetch
    } else if (zr.content && isCloudflareChallenge(zr.content)) {
      // challenge despite antibot -> fall through to fetch/playwright
    } else if (zr.error) {
      // zenrows error -> fall through to fetch/playwright (ponytail: świadomy fallback zamiast twardy fail)
    } else if (!zr.content) {
      // empty -> fallback
    } else {
      // success case already returned above
    }
    // if zenrows returned error or challenge, continue to fetch fallback
    // but if zenrows succeeded with content, we already returned
  }

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
      return { content: null, error: "cloudflare-challenge", durationMs: Date.now() - start, usedFallback: true };
    }
    return { content: null, error: msg, durationMs: Date.now() - start, usedFallback: true };
  }
}
