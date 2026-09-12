import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/scraper", () => ({
  scrapeSpecials: vi.fn(),
}));

import { scrapeSpecials } from "@/lib/scraper";
import { checkCycle } from "@/lib/check";
import { _resetStore, getHistory, getEmailLog } from "@/lib/storage";
import { hashContent } from "@/lib/hasher";

const mockedScrape = vi.mocked(scrapeSpecials);

describe("cron F3-04 3 przypadki", () => {
  beforeEach(async () => {
    await _resetStore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("inicjalizacja: lastHash null -> changed false, history changed false, emailLog 0", async () => {
    mockedScrape.mockResolvedValue({ content: "promo A", durationMs: 15, usedFallback: false });
    const res = await checkCycle();
    expect(res.changed).toBe(false);
    expect(res.hash).toBe(hashContent("promo A"));
    expect(res.hash).toMatch(/^[a-f0-9]{64}$/);
    const history = await getHistory();
    expect(history.length).toBe(1);
    expect(history[0].changed).toBe(false);
    expect(history[0].hash).toBe(hashContent("promo A"));
    const emailLog = await getEmailLog();
    expect(emailLog.length).toBe(0);
  });

  it("zmiana: promo A -> promo B -> changed true, emailLog 1, history changed true", async () => {
    mockedScrape.mockResolvedValue({ content: "promo A", durationMs: 10, usedFallback: false });
    await checkCycle();
    mockedScrape.mockResolvedValue({ content: "promo B", durationMs: 12, usedFallback: false });
    const res = await checkCycle();
    expect(res.changed).toBe(true);
    expect(res.hash).toBe(hashContent("promo B"));
    const history = await getHistory();
    expect(history[0].changed).toBe(true);
    expect(history[0].hash).toBe(hashContent("promo B"));
    const emailLog = await getEmailLog();
    expect(emailLog.length).toBe(1);
    expect(emailLog[0].to).toBe("js@architekton.gda.pl");
    // third call same B -> changed false, emailLog still 1
    mockedScrape.mockResolvedValue({ content: "promo B", durationMs: 11, usedFallback: false });
    const res2 = await checkCycle();
    expect(res2.changed).toBe(false);
    const emailLog2 = await getEmailLog();
    expect(emailLog2.length).toBe(1);
  });

  it("blad: scrape error -> history error, changed false, emailLog 0", async () => {
    mockedScrape.mockResolvedValue({ content: null, error: "cloudflare-challenge", durationMs: 20, usedFallback: false });
    const res = await checkCycle();
    expect(res.changed).toBe(false);
    expect(res.error).toBe("cloudflare-challenge");
    const history = await getHistory();
    expect(history.length).toBe(1);
    expect(history[0].error).toBe("cloudflare-challenge");
    expect(history[0].changed).toBe(false);
    const emailLog = await getEmailLog();
    expect(emailLog.length).toBe(0);
  });
});
