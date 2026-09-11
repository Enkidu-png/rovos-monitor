import { describe, it, expect } from "vitest";
import { MonitorConfigSchema } from "./schemas";

describe("config validation", () => {
  it("rejects intervalMinutes 0", () => {
    const result = MonitorConfigSchema.safeParse({
      url: "https://example.com/",
      selector: "main",
      intervalMinutes: 0,
      recipient: "js@architekton.gda.pl",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("intervalMinutes"))).toBe(true);
    }
  });

  it("accepts valid config", () => {
    const result = MonitorConfigSchema.safeParse({
      url: "https://example.com/",
      selector: "main",
      intervalMinutes: 60,
      recipient: "js@architekton.gda.pl",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid intervalMinutes 1441", () => {
    const result = MonitorConfigSchema.safeParse({
      url: "https://example.com/",
      selector: "main",
      intervalMinutes: 1441,
      recipient: "js@architekton.gda.pl",
    });
    expect(result.success).toBe(false);
  });
});
