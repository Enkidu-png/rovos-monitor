/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("scraper-zenrows F6-05", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ZENROWS_API_KEY;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.ZENROWS_API_KEY;
  });

  it("mock ZenRows fetch -> <main>promo zenrows</main> -> content promo", async () => {
    process.env.ZENROWS_API_KEY = "test-key-123";
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const u = String(url);
      if (u.includes("api.zenrows.com")) {
        return {
          ok: true,
          status: 200,
          text: async () => "<main>promo zenrows</main>",
        } as any;
      }
      throw new Error("unexpected fetch url " + u);
    });
    const { scrapeViaZenRows, hasZenRows } = await import("./scraper");
    expect(hasZenRows()).toBe(true);
    const res = await scrapeViaZenRows("https://rovos.com/journeys/specials/", "main");
    expect(res.content).toBe("promo zenrows");
    expect(res.error).toBeUndefined();
    expect(res.usedFallback).toBe(false);
    expect(res.durationMs).toBeLessThan(15000);
    // also via scrapeSpecials chain should use ZenRows primary
    const { scrapeSpecials } = await import("./scraper");
    const res2 = await scrapeSpecials();
    expect(res2.content).toBe("promo zenrows");
    expect(res2.usedFallback).toBe(false);
    expect(res2.error).toBeUndefined();
  });

  it("mock ZenRows 401 -> error zenrows-error", async () => {
    process.env.ZENROWS_API_KEY = "bad-key";
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const u = String(url);
      if (u.includes("api.zenrows.com")) {
        return {
          ok: false,
          status: 401,
          text: async () => "Unauthorized",
        } as any;
      }
      throw new Error("unexpected " + u);
    });
    const { scrapeViaZenRows } = await import("./scraper");
    const res = await scrapeViaZenRows("https://rovos.com/journeys/specials/", "main");
    expect(res.content).toBeNull();
    expect(res.error).toMatch(/zenrows-error: 401/);
    expect(res.usedFallback).toBe(false);
  });

  it("brak klucza -> fallback na fetch mock", async () => {
    delete process.env.ZENROWS_API_KEY;
    const { hasZenRows } = await import("./scraper");
    expect(hasZenRows()).toBe(false);
    const { scrapeViaZenRows } = await import("./scraper");
    const r = await scrapeViaZenRows("https://rovos.com/journeys/specials/", "main");
    expect(r.error).toBe("zenrows-missing-key");
    expect(r.content).toBeNull();

    // fallback via scrapeSpecials using normal fetch mock
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: async () => "<main>fallback promo</main>",
      ok: true,
      status: 200,
    } as any);
    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials();
    expect(res.content).toBe("fallback promo");
    expect(res.error).toBeUndefined();
    expect(res.usedFallback).toBe(false);
  });

  it("zenrows zwraca Just a moment mimo antibot -> fallback na fetch", async () => {
    process.env.ZENROWS_API_KEY = "test-key-123";
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const u = String(url);
      if (u.includes("api.zenrows.com")) {
        return {
          ok: true,
          status: 200,
          text: async () => "<html>Just a moment - challenge</html>",
        } as any;
      }
      // fallback fetch should be called after zenrows challenge
      return {
        ok: true,
        status: 200,
        text: async () => "<main>after fallback</main>",
      } as any;
    });
    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials();
    expect(res.content).toBe("after fallback");
    expect(res.usedFallback).toBe(false);
  });

  it("negative: nie loguje ZENROWS_API_KEY i nie używa axios, timeout 15000", async () => {
    const fs = await import("fs");
    const txt = fs.readFileSync("lib/scraper.ts", "utf-8");
    expect(txt).not.toContain("console.log");
    // grep ZENROWS_API_KEY should appear at least once
    expect(txt).toContain("ZENROWS_API_KEY");
    expect(txt).not.toContain("axios");
    expect(txt).toContain("AbortSignal.timeout(15000)");
    expect(txt).toContain("api.zenrows.com");
    expect(txt).toContain("premium_proxy=true");
    const hasRetry = txt.includes("RETRY 2") || txt.includes("ZENROWS_RETRY") || txt.includes("attempt <= 2");
    expect(hasRetry).toBe(true);
  });
});
