import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashContent } from "./hasher";

vi.mock("./scraper", () => ({
  scrapeSpecials: vi.fn(),
}));

vi.mock("./storage", () => ({
  getLastHash: vi.fn(),
  setLastHash: vi.fn(),
  setLastContent: vi.fn(),
  setLastCheck: vi.fn(),
  pushHistory: vi.fn(),
  getLastContent: vi.fn(),
  getLastCheck: vi.fn(),
  getHistory: vi.fn(),
  getEmailLog: vi.fn(),
  pushEmailLog: vi.fn(),
}));

vi.mock("./email", () => ({
  canSendEmail: vi.fn(),
  sendChangeNotification: vi.fn(),
  buildEmailSubject: vi.fn(() => "mock subject"),
  buildEmailHtml: vi.fn(() => "<html>mock</html>"),
  buildEmailText: vi.fn(() => "mock text"),
}));

import { scrapeSpecials } from "./scraper";
import { getLastHash, pushHistory } from "./storage";
import { sendChangeNotification, canSendEmail } from "./email";
import { checkCycle } from "./check";

const mockedScrape = vi.mocked(scrapeSpecials);
const mockedGetLastHash = vi.mocked(getLastHash);
const mockedPushHistory = vi.mocked(pushHistory);
const mockedSend = vi.mocked(sendChangeNotification);
const mockedCanSend = vi.mocked(canSendEmail);

describe("checkCycle F1-01", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCanSend.mockResolvedValue(true);
    mockedSend.mockResolvedValue({ success: true, messageId: "mock" });
  });

  it("first run promo A with lastHash null -> changed false, no email, history durationMs<2000 snippet<=500", async () => {
    mockedScrape.mockResolvedValue({ content: "promo A", durationMs: 123, usedFallback: false });
    mockedGetLastHash.mockResolvedValue(null);
    mockedPushHistory.mockResolvedValue(undefined);

    const res = await checkCycle();

    expect(res.changed).toBe(false);
    expect(res.hash).toBe(hashContent("promo A"));
    expect(res.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(mockedSend).not.toHaveBeenCalled();

    expect(mockedPushHistory).toHaveBeenCalledTimes(1);
    const entry = mockedPushHistory.mock.calls[0][0];
    expect(entry.durationMs).toBeLessThan(2000);
    expect(entry.snippet?.length ?? 0).toBeLessThanOrEqual(500);
    expect(entry.changed).toBe(false);
  });

  it("second call promo B -> changed true, sendMock called with recipient", async () => {
    const hashA = hashContent("promo A");
    mockedScrape.mockResolvedValue({ content: "promo B", durationMs: 150, usedFallback: false });
    mockedGetLastHash.mockResolvedValue(hashA);

    const res = await checkCycle();

    expect(res.changed).toBe(true);
    expect(res.hash).toBe(hashContent("promo B"));
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "js@architekton.gda.pl" })
    );

    const entry = mockedPushHistory.mock.calls[0][0];
    expect(entry.changed).toBe(true);
    expect(entry.durationMs).toBeLessThan(2000);
    expect(entry.snippet?.length ?? 0).toBeLessThanOrEqual(500);
  });

  it("negative: no email on first run (lastHash null)", async () => {
    mockedScrape.mockResolvedValue({ content: "promo A", durationMs: 100, usedFallback: false });
    mockedGetLastHash.mockResolvedValue(null);

    await checkCycle();

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("edge: when scrapeSpecials returns error, history with error and no email", async () => {
    mockedScrape.mockResolvedValue({ content: null, error: "cloudflare-challenge", durationMs: 200, usedFallback: false });
    // getLastHash not called in error branch, but mock anyway
    mockedGetLastHash.mockResolvedValue(null);

    const res = await checkCycle();

    expect(res.changed).toBe(false);
    expect(res.error).toBe("cloudflare-challenge");
    expect(mockedSend).not.toHaveBeenCalled();
    expect(mockedPushHistory).toHaveBeenCalledTimes(1);
    const entry = mockedPushHistory.mock.calls[0][0];
    expect(entry.error).toBe("cloudflare-challenge");
    expect(entry.changed).toBe(false);
  });

  it("pushHistory snippet truncated to 500 when content longer", async () => {
    const long = "a".repeat(600);
    mockedScrape.mockResolvedValue({ content: long, durationMs: 100, usedFallback: false });
    mockedGetLastHash.mockResolvedValue(null);

    await checkCycle();

    const entry = mockedPushHistory.mock.calls[0][0];
    expect(entry.snippet?.length).toBeLessThanOrEqual(500);
    expect(entry.snippet?.length).toBe(500);
  });
});
