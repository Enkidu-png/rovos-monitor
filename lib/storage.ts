import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { resolve } from "path";
import { KVKeys, HistoryEntrySchema, EmailLogEntrySchema, type HistoryEntry, type EmailLogEntry } from "./schemas";

type Store = {
  lastHash: string | null;
  lastContent: string | null;
  lastCheck: string | null;
  history: HistoryEntry[];
  emailLog: EmailLogEntry[];
};

function storePath(): string {
  return resolve(process.cwd(), "data/store.json");
}

function ensureStoreFile(): void {
  const p = storePath();
  const dir = resolve(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(p)) {
    const init: Store = { lastHash: null, lastContent: null, lastCheck: null, history: [], emailLog: [] };
    writeFileSync(p, JSON.stringify(init, null, 2), "utf-8");
  }
}

function hasRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
}

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return Redis.fromEnv();
}

function readStore(): Store {
  ensureStoreFile();
  const p = storePath();
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      lastHash: parsed.lastHash ?? null,
      lastContent: parsed.lastContent ?? null,
      lastCheck: parsed.lastCheck ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      emailLog: Array.isArray(parsed.emailLog) ? parsed.emailLog : [],
    };
  } catch {
    return { lastHash: null, lastContent: null, lastCheck: null, history: [], emailLog: [] };
  }
}

function writeStore(store: Store): void {
  ensureStoreFile();
  const p = storePath();
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  try {
    renameSync(tmp, p);
  } catch {
    // fallback if rename fails
    writeFileSync(p, readFileSync(tmp, "utf-8"), "utf-8");
    try {
      unlinkSync(tmp);
    } catch {}
  }
}

// --- public API ---

export async function getLastHash(): Promise<string | null> {
  if (hasRedis()) {
    const redis = await getRedis();
    const val = await redis.get(KVKeys.lastHash);
    return (val as string | null) ?? null;
  }
  return readStore().lastHash;
}

export async function setLastHash(hash: string): Promise<void> {
  if (hasRedis()) {
    const redis = await getRedis();
    await redis.set(KVKeys.lastHash, hash);
    return;
  }
  const s = readStore();
  s.lastHash = hash;
  writeStore(s);
}

export async function getLastContent(): Promise<string | null> {
  if (hasRedis()) {
    const redis = await getRedis();
    const val = await redis.get(KVKeys.lastContent);
    return (val as string | null) ?? null;
  }
  return readStore().lastContent;
}

export async function setLastContent(content: string): Promise<void> {
  if (hasRedis()) {
    const redis = await getRedis();
    await redis.set(KVKeys.lastContent, content);
    return;
  }
  const s = readStore();
  s.lastContent = content;
  writeStore(s);
}

export async function getLastCheck(): Promise<string | null> {
  if (hasRedis()) {
    const redis = await getRedis();
    const val = await redis.get(KVKeys.lastCheck);
    return (val as string | null) ?? null;
  }
  return readStore().lastCheck;
}

export async function setLastCheck(iso: string): Promise<void> {
  if (hasRedis()) {
    const redis = await getRedis();
    await redis.set(KVKeys.lastCheck, iso);
    return;
  }
  const s = readStore();
  s.lastCheck = iso;
  writeStore(s);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  let raw: unknown[];
  if (hasRedis()) {
    const redis = await getRedis();
    const val = await redis.get(KVKeys.history);
    raw = (val as unknown[] | null) ?? [];
  } else {
    raw = readStore().history;
  }
  // validate and filter
  const out: HistoryEntry[] = [];
  for (const e of raw) {
    const parsed = HistoryEntrySchema.safeParse(e);
    if (parsed.success) out.push(parsed.data);
    else {
      // try to allow error entries with placeholder hash? filter invalid
    }
  }
  return out;
}

export async function pushHistory(entry: HistoryEntry): Promise<void> {
  // validate before push, allow throw if invalid
  const parsed = HistoryEntrySchema.safeParse(entry);
  if (!parsed.success) {
    throw new Error(`Invalid history entry: ${parsed.error.message}`);
  }
  if (hasRedis()) {
    const redis = await getRedis();
    const history = await getHistory();
    history.unshift(parsed.data);
    const trimmed = history.slice(0, 100);
    await redis.set(KVKeys.history, trimmed);
    return;
  }
  const s = readStore();
  // re-validate existing history via schema
  const existing = await getHistory();
  existing.unshift(parsed.data);
  s.history = existing.slice(0, 100);
  writeStore(s);
}

export async function getEmailLog(): Promise<EmailLogEntry[]> {
  let raw: unknown[];
  if (hasRedis()) {
    const redis = await getRedis();
    const val = await redis.get(KVKeys.emailLog);
    raw = (val as unknown[] | null) ?? [];
  } else {
    raw = readStore().emailLog;
  }
  const out: EmailLogEntry[] = [];
  for (const e of raw) {
    const parsed = EmailLogEntrySchema.safeParse(e);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function pushEmailLog(entry: EmailLogEntry): Promise<void> {
  const parsed = EmailLogEntrySchema.safeParse(entry);
  if (!parsed.success) throw new Error(`Invalid email log: ${parsed.error.message}`);
  if (hasRedis()) {
    const redis = await getRedis();
    const log = await getEmailLog();
    log.unshift(parsed.data);
    const trimmed = log.slice(0, 50);
    await redis.set(KVKeys.emailLog, trimmed);
    return;
  }
  const s = readStore();
  const existing = await getEmailLog();
  existing.unshift(parsed.data);
  s.emailLog = existing.slice(0, 50);
  writeStore(s);
}

// helper for tests to reset - not part of spec but useful
export async function _resetStore(): Promise<void> {
  if (hasRedis()) {
    const redis = await getRedis();
    await redis.del(KVKeys.lastHash);
    await redis.del(KVKeys.lastContent);
    await redis.del(KVKeys.lastCheck);
    await redis.del(KVKeys.history);
    await redis.del(KVKeys.emailLog);
    return;
  }
  const init: Store = { lastHash: null, lastContent: null, lastCheck: null, history: [], emailLog: [] };
  writeStore(init);
}
