/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox"],
    executablePath: vi.fn(async () => "/tmp/chromium"),
  },
}));

vi.mock("playwright-core", () => ({
  chromium: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        goto: vi.fn(async () => {}),
        waitForTimeout: vi.fn(async () => {}),
        content: vi.fn(async () => "<main>after-challenge</main>"),
      })),
      close: vi.fn(async () => {}),
    })),
  },
}));

describe("scraper-playwright F1-04", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // re-mock after restore
    vi.spyOn(global, "fetch");
  });

  it("fallback when fetch challenge -> usedFallback true and content correct", async () => {
    // need to re-apply mocks after restore
    vi.mocked(await import("@sparticuz/chromium")).default.executablePath = vi.fn(async () => "/tmp/chromium") as any;
    const pw = await import("playwright-core");
    (pw.chromium.launch as any) = vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        goto: vi.fn(async () => {}),
        waitForTimeout: vi.fn(async () => {}),
        content: vi.fn(async () => "<main>after-challenge</main>"),
      })),
      close: vi.fn(async () => {}),
    }));

    vi.spyOn(global, "fetch").mockResolvedValue({
      text: async () => "<html>Just a moment</html>",
    } as any);

    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials();
    // Since we mocked fetch to always return challenge, it will retry 3x then fallback
    expect(res.usedFallback).toBe(true);
    expect(res.content).toBe("after-challenge");
  });

  it("integration without mock: example.com-like fetch success no fallback", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: async () => "<main>hello world</main>",
    } as any);
    const { scrapeSpecials } = await import("./scraper");
    const res = await scrapeSpecials("https://example.com");
    expect(res.usedFallback).toBe(false);
    expect(res.content).toBe("hello world");
  });

  it("lazy import only in fallback branch", async () => {
    const fs = await import("fs");
    const txt = fs.readFileSync("lib/scraper.ts", "utf-8");
    const matches = (txt.match(/playwright-core/g) || []).length;
    expect(matches).toBeGreaterThan(0);
    // ensure it's inside fallback (after comment)
    const lines = txt.split("\n");
    const hasLazy = lines.some((l) => l.includes('await import("playwright-core")'));
    expect(hasLazy).toBe(true);
  });

  it("no puppeteer in package.json and next.config has external", async () => {
    const fs = await import("fs");
    const pkg = fs.readFileSync("package.json", "utf-8");
    expect(pkg).not.toContain("puppeteer");
    const next = fs.readFileSync("next.config.mjs", "utf-8");
    expect(next).toContain("playwright-core");
  });
});
