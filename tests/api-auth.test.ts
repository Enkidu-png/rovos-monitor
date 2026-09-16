import { describe, it, expect, vi, beforeEach } from "vitest";

describe("api auth F3-02 prod vs dev", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET /api/cron/check without auth ->401", async () => {
    process.env.CRON_SECRET = "test-secret";
    const mod = await import("@/app/api/cron/check/route");
    const req = new Request("http://localhost:3000/api/cron/check");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await mod.GET(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("GET /api/cron/check with x-vercel-cron alone ->200 (Vercel prod cron trusted)", async () => {
    process.env.CRON_SECRET = "test-secret";
    const mod = await import("@/app/api/cron/check/route");
    const req = new Request("http://localhost:3000/api/cron/check", {
      headers: { "x-vercel-cron": "1" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await mod.GET(req as any);
    // ponytail: Vercel cron sends x-vercel-cron:1 without Bearer — trust Vercel (fix c525e3b)
    expect(res.status).toBe(200);
  });

  it("POST /api/cron/check ->405", async () => {
    const mod = await import("@/app/api/cron/check/route");
    const res = await mod.POST();
    expect(res.status).toBe(405);
  });

  it("POST /api/check without auth in dev ->200 (mocked checkCycle)", async () => {
    const orig = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");
    vi.doMock("@/lib/check", () => ({
      checkCycle: vi.fn(async () => ({ changed: false, hash: "a".repeat(64), durationMs: 10, usedFallback: false })),
    }));
    const { resetRateLimit } = await import("@/lib/rate-limit");
    resetRateLimit();
    const mod = await import("@/app/api/check/route");
    const req = new Request("http://localhost:3000/api/check", { method: "POST" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await mod.POST(req as any);
    expect(res.status).toBe(200);
    vi.stubEnv("NODE_ENV", orig);
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", orig);
    vi.doUnmock("@/lib/check");
  });

  it("POST /api/check without auth in prod ->401", async () => {
    const orig = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    process.env.CRON_SECRET = "test-secret";
    vi.resetModules();
    const { resetRateLimit } = await import("@/lib/rate-limit");
    resetRateLimit();
    const mod = await import("@/app/api/check/route");
    const req = new Request("http://localhost:3000/api/check", { method: "POST" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await mod.POST(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
    vi.stubEnv("NODE_ENV", orig);
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", orig);
  });

  it("POST /api/check rate-limit 2x ->429", async () => {
    const orig = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");
    vi.doMock("@/lib/check", () => ({
      checkCycle: vi.fn(async () => ({ changed: false, hash: "a".repeat(64), durationMs: 10, usedFallback: false })),
    }));
    vi.resetModules();
    const { resetRateLimit } = await import("@/lib/rate-limit");
    resetRateLimit();
    const mod = await import("@/app/api/check/route");
    const req1 = new Request("http://localhost:3000/api/check", { method: "POST" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res1 = await mod.POST(req1 as any);
    expect(res1.status).toBe(200);
    const req2 = new Request("http://localhost:3000/api/check", { method: "POST" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res2 = await mod.POST(req2 as any);
    expect(res2.status).toBe(429);
    vi.stubEnv("NODE_ENV", orig);
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", orig);
    vi.doUnmock("@/lib/check");
  });

  it("GET /api/check ->405", async () => {
    const mod = await import("@/app/api/check/route");
    const res = await mod.GET();
    expect(res.status).toBe(405);
  });
});
