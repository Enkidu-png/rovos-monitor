/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("scraper-fetch F1-03", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("mock fetch -> HTML <main>promo</main> -> content promo", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: async () => "<main>promo</main>",
    } as any);
    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials();
    expect(res.content).toBe("promo");
    expect(res.error).toBeUndefined();
    expect(res.durationMs).toBeLessThan(2000);
    expect(res.usedFallback).toBe(false);
  });

  it("retry: fetch throws 2x -> 3rd success -> content exists duration >=4000", async () => {
    let calls = 0;
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      calls++;
      if (calls <= 2) throw new Error("network fail");
      return { text: async () => "<main>ok</main>" } as any;
    });
    const { scrapeSpecials } = await import("./scraper");
    const start = Date.now();
    const res = await scrapeSpecials();
    const dur = Date.now() - start;
    expect(res.content).toBe("ok");
    expect(res.durationMs).toBeGreaterThanOrEqual(4000);
    expect(dur).toBeGreaterThanOrEqual(4000);
    expect(res.usedFallback).toBe(false);
  }, 10000);

  it("cloudflare HTML -> error cloudflare-challenge or fallback, content null", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: async () => "<html>Just a moment - challenge</html>",
    } as any);
    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials();
    expect(res.content).toBeNull();
    expect(res.error).toBeDefined();
    expect(res.error).toMatch(/cloudflare/);
  }, 10000);

  it("timeout 10000 via AbortSignal.timeout used and no axios", async () => {
    const fs = await import("fs");
    const txt = fs.readFileSync("lib/scraper.ts", "utf-8");
    expect(txt).toContain("AbortSignal.timeout");
    expect(txt).not.toContain("axios");
  });

  it("negative: does not throw on error, returns { error }", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const { scrapeSpecials } = await import("./scraper");
    let res: any;
    let threw = false;
    try {
      res = await scrapeSpecials();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(res.error).toBeDefined();
  }, 10000);
});
