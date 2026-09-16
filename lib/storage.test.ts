/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as fs from "fs";
import { HistoryEntrySchema } from "./schemas";

// ponytail: mock blob in memory via globalThis
(globalThis as any).__mockBlobStorage = null as string | null;

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string, body: any) => {
    const content = typeof body === "string" ? body : JSON.stringify(body);
    (globalThis as any).__mockBlobStorage = content;
    return { url: "https://blob.vercel-storage.com/rovos/store.json", pathname };
  }),
  list: vi.fn(async () => {
    const c = (globalThis as any).__mockBlobStorage;
    if (c) return { blobs: [{ pathname: "rovos/store.json", url: "https://blob.vercel-storage.com/rovos/store.json" }] };
    return { blobs: [] };
  }),
  del: vi.fn(async () => {
    (globalThis as any).__mockBlobStorage = null;
  }),
  head: vi.fn(async () => ({})),
}));

// mock fetch for blob url
const _origFetch = global.fetch;
global.fetch = vi.fn(async (url: any, ...args: any[]) => {
  const u = typeof url === "string" ? url : url?.toString?.() ?? "";
  if (u.includes("blob.vercel-storage.com")) {
    const c = (globalThis as any).__mockBlobStorage;
    if (c) return new Response(c, { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response("", { status: 404 });
  }
  return _origFetch(url as any, ...args);
}) as any;

import { getLastHash, setLastHash, getHistory, pushHistory, _resetStore } from "./storage";
import { put, list } from "@vercel/blob";

describe("storage F6-04 blob", () => {
  beforeEach(async () => {
    (globalThis as any).__mockBlobStorage = null;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.clearAllMocks();
    // ensure blob mock returns empty
    (globalThis as any).__mockBlobStorage = null;
    await _resetStore();
    // clean file fallback as well
    if (fs.existsSync("data/store.json")) {
      try {
        fs.unlinkSync("data/store.json");
      } catch {}
    }
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    (globalThis as any).__mockBlobStorage = null;
  });

  it("setLastHash -> getLastHash via file fallback when no BLOB token", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const hash = "a".repeat(64);
    await setLastHash(hash);
    const got = await getLastHash();
    expect(got).toBe(hash);
    expect(fs.existsSync("data/store.json")).toBe(true);
  });

  it("pushHistory 101 -> length 100 FIFO newest first via file fallback", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
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
    expect(h[0].snippet).toBe("snippet 100");
  });

  it("getHistory validates zod, filters bad hash, corrupt JSON -> empty store", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const goodHash = "b".repeat(64);
    await pushHistory({
      timestamp: new Date().toISOString(),
      hash: goodHash,
      changed: false,
      durationMs: 10,
    });
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
    expect(h.every((e) => HistoryEntrySchema.safeParse(e).success)).toBe(true);
    expect(h.find((e) => e.hash === "bad")).toBeUndefined();
    // corrupt JSON -> empty store
    fs.writeFileSync(path, "not-json{{{");
    const empty = await getHistory();
    expect(empty.length).toBe(0);
    const nullHash = await getLastHash();
    expect(nullHash).toBeNull();
  });

  it("pushHistory with invalid hash throws", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(
      pushHistory({
        timestamp: new Date().toISOString(),
        hash: "bad",
        changed: false,
        durationMs: 10,
      } as any)
    ).rejects.toThrow();
  });

  it("fallback file when no BLOB token, data/store.json exists and contains lastHash", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
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

  it("edge + blob: getLastHash null when no data, corrupt JSON -> empty, BLOB put/fetch via mock", async () => {
    // file null case
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await _resetStore();
    expect(await getLastHash()).toBeNull();
    // corrupt file -> empty
    fs.writeFileSync("data/store.json", "corrupt{{{");
    expect(await getLastHash()).toBeNull();
    expect(await getHistory()).toEqual([]);
    // now blob branch with token
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token";
    (globalThis as any).__mockBlobStorage = null;
    const hash = "d".repeat(64);
    await setLastHash(hash);
    // verify put called with rovos/store.json and public (ponytail: public store fetchable on Vercel)
    expect(put).toHaveBeenCalled();
    const putArg = (put as any).mock.calls[0];
    expect(putArg[0]).toBe("rovos/store.json");
    expect(putArg[2].access).toBe("public");
    // get via blob fetch
    const got = await getLastHash();
    expect(got).toBe(hash);
    // list should have been called for read
    expect(list).toHaveBeenCalled();
    // FIFO via blob as well
    await _resetStore();
    for (let i = 0; i < 101; i++) {
      const h = i.toString(16).padStart(64, "0");
      await pushHistory({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        hash: h,
        changed: true,
        durationMs: 10,
        snippet: `blob ${i}`,
      });
    }
    const hist = await getHistory();
    expect(hist.length).toBe(100);
    expect(hist[0].snippet).toBe("blob 100");
  });
});
