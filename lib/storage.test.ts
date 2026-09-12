/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from "vitest";
import { getLastHash, setLastHash, getHistory, pushHistory, _resetStore } from "./storage";
import * as fs from "fs";
import { HistoryEntrySchema } from "./schemas";

describe("storage F1-05", () => {
  beforeEach(async () => {
    await _resetStore();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
  });

  it("setLastHash -> getLastHash", async () => {
    const hash = "a".repeat(64);
    await setLastHash(hash);
    const got = await getLastHash();
    expect(got).toBe(hash);
  });

  it("pushHistory 101 -> length 100 FIFO newest first", async () => {
    for (let i = 0; i < 101; i++) {
      const hash = i.toString(16).padStart(64, "0");
      await pushHistory({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        hash,
        changed: i % 2 === 0,
        durationMs: 100,
        snippet: `snippet ${i}`,
      });
    }
    const h = await getHistory();
    expect(h.length).toBe(100);
    // newest first: last pushed (i=100) should be first
    expect(h[0].snippet).toBe("snippet 100");
  });

  it("getHistory validates zod, filters bad hash", async () => {
    // push valid
    const goodHash = "b".repeat(64);
    await pushHistory({
      timestamp: new Date().toISOString(),
      hash: goodHash,
      changed: false,
      durationMs: 10,
    });
    // directly corrupt file with bad entry
    const path = "data/store.json";
    const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
    raw.history.push({
      timestamp: new Date().toISOString(),
      hash: "bad",
      changed: false,
      durationMs: 10,
    });
    fs.writeFileSync(path, JSON.stringify(raw, null, 2));
    const h = await getHistory();
    // should filter bad, only good remains
    expect(h.every((e) => HistoryEntrySchema.safeParse(e).success)).toBe(true);
    expect(h.find((e) => e.hash === "bad")).toBeUndefined();
  });

  it("pushHistory with invalid hash throws", async () => {
    await expect(
      pushHistory({
        timestamp: new Date().toISOString(),
        hash: "bad",
        changed: false,
        durationMs: 10,
      } as any)
    ).rejects.toThrow();
  });

  it("fallback file when no UPSTASH, data/store.json exists and contains lastHash", async () => {
    const hash = "c".repeat(64);
    await setLastHash(hash);
    expect(fs.existsSync("data/store.json")).toBe(true);
    const raw = JSON.parse(fs.readFileSync("data/store.json", "utf-8"));
    expect(raw.lastHash).toBe(hash);
  });

  it("negative: no duplicate KVKeys strings in app/", async () => {
    let found = false;
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = dir + "/" + e.name;
        if (e.isDirectory()) walk(p);
        else if (p.endsWith(".ts") || p.endsWith(".tsx")) {
          const c = fs.readFileSync(p, "utf-8");
          if (c.includes("rovos:lastHash")) found = true;
        }
      }
    };
    if (fs.existsSync("app")) walk("app");
    expect(found).toBe(false);
  });

  it("edge: getLastHash when no data -> null", async () => {
    await _resetStore();
    const h = await getLastHash();
    expect(h).toBeNull();
  });
});
