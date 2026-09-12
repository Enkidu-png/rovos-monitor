import { describe, it, expect } from "vitest";
import { hashContent } from "@/lib/hasher";

describe("perf F5-01", () => {
  it("hashContent 50KB <50ms", () => {
    const big = "a".repeat(50000);
    const start = performance.now();
    const h = hashContent(big);
    const dur = performance.now() - start;
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(dur).toBeLessThan(50);
  });
});
