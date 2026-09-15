import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { resolve } from "path";
import { put, list, del, head } from "@vercel/blob";
import { KVKeys, HistoryEntrySchema, EmailLogEntrySchema, type HistoryEntry, type EmailLogEntry } from "./schemas";

type Store = {
  lastHash: string | null;
  lastContent: string | null;
  lastCheck: string | null;
  history: HistoryEntry[];
  emailLog: EmailLogEntry[];
};

const BLOB_PATHNAME = "rovos/store.json";

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID;
}

function emptyStore(): Store {
  return { lastHash: null, lastContent: null, lastCheck: null, history: [], emailLog: [] };
}

function normalizeStore(parsed: unknown): Store {
  if (!parsed || typeof parsed !== "object") return emptyStore();
  const p = parsed as Record<string, unknown>;
  return {
    lastHash: typeof p.lastHash === "string" ? p.lastHash : null,
    lastContent: typeof p.lastContent === "string" ? p.lastContent : null,
    lastCheck: typeof p.lastCheck === "string" ? p.lastCheck : null,
    history: Array.isArray(p.history) ? (p.history as HistoryEntry[]) : [],
    emailLog: Array.isArray(p.emailLog) ? (p.emailLog as EmailLogEntry[]) : [],
  };
}

function storePath(): string {
  return resolve(process.cwd(), "data/store.json");
}

function ensureStoreFile(): void {
  const p = storePath();
  const dir = resolve(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(p)) {
    const init: Store = emptyStore();
    writeFileSync(p, JSON.stringify(init, null, 2), "utf-8");
  }
}

function readFileStore(): Store {
  ensureStoreFile();
  const p = storePath();
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    const normalized = normalizeStore(parsed);
    return normalized;
  } catch {
    return emptyStore();
  }
}

function writeFileStore(store: Store): void {
  ensureStoreFile();
  const p = storePath();
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf-8");
  try {
    renameSync(tmp, p);
  } catch {
    writeFileSync(p, readFileSync(tmp, "utf-8"), "utf-8");
    try {
      unlinkSync(tmp);
    } catch {}
  }
}

async function readBlobStore(): Promise<Store> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME });
    const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (!found) return emptyStore();
    try {
      await head(found.url);
    } catch {}
    const res = await fetch(found.url);
    if (!res.ok) return emptyStore();
    const text = await res.text();
    const parsed = JSON.parse(text);
    return normalizeStore(parsed);
  } catch {
    return emptyStore();
  }
}

async function writeBlobStore(store: Store): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(store), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
  } as never);
}

async function delBlobStore(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME });
    const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (found) await del(found.url);
  } catch {}
}

// keep KVKeys used for in-file validation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _kvKeysRef = KVKeys;

// --- public API ---

export async function getLastHash(): Promise<string | null> {
  if (hasBlob()) {
    const s = await readBlobStore();
    return s.lastHash;
  }
  return readFileStore().lastHash;
}

export async function setLastHash(hash: string): Promise<void> {
  if (hasBlob()) {
    const s = await readBlobStore();
    s.lastHash = hash;
    await writeBlobStore(s);
    return;
  }
  const s = readFileStore();
  s.lastHash = hash;
  writeFileStore(s);
}

export async function getLastContent(): Promise<string | null> {
  if (hasBlob()) {
    const s = await readBlobStore();
    return s.lastContent;
  }
  return readFileStore().lastContent;
}

export async function setLastContent(content: string): Promise<void> {
  if (hasBlob()) {
    const s = await readBlobStore();
    s.lastContent = content;
    await writeBlobStore(s);
    return;
  }
  const s = readFileStore();
  s.lastContent = content;
  writeFileStore(s);
}

export async function getLastCheck(): Promise<string | null> {
  if (hasBlob()) {
    const s = await readBlobStore();
    return s.lastCheck;
  }
  return readFileStore().lastCheck;
}

export async function setLastCheck(iso: string): Promise<void> {
  if (hasBlob()) {
    const s = await readBlobStore();
    s.lastCheck = iso;
    await writeBlobStore(s);
    return;
  }
  const s = readFileStore();
  s.lastCheck = iso;
  writeFileStore(s);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  let raw: unknown[];
  if (hasBlob()) {
    const s = await readBlobStore();
    raw = s.history;
  } else {
    raw = readFileStore().history;
  }
  const out: HistoryEntry[] = [];
  for (const e of raw) {
    const parsed = HistoryEntrySchema.safeParse(e);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function pushHistory(entry: HistoryEntry): Promise<void> {
  const parsed = HistoryEntrySchema.safeParse(entry);
  if (!parsed.success) {
    throw new Error(`Invalid history entry: ${parsed.error.message}`);
  }
  if (hasBlob()) {
    const history = await getHistory();
    history.unshift(parsed.data);
    const trimmed = history.slice(0, 100);
    const s = await readBlobStore();
    s.history = trimmed;
    await writeBlobStore(s);
    return;
  }
  const s = readFileStore();
  const existing = await getHistory();
  existing.unshift(parsed.data);
  s.history = existing.slice(0, 100);
  writeFileStore(s);
}

export async function getEmailLog(): Promise<EmailLogEntry[]> {
  let raw: unknown[];
  if (hasBlob()) {
    const s = await readBlobStore();
    raw = s.emailLog;
  } else {
    raw = readFileStore().emailLog;
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
  if (hasBlob()) {
    const log = await getEmailLog();
    log.unshift(parsed.data);
    const trimmed = log.slice(0, 50);
    const s = await readBlobStore();
    s.emailLog = trimmed;
    await writeBlobStore(s);
    return;
  }
  const s = readFileStore();
  const existing = await getEmailLog();
  existing.unshift(parsed.data);
  s.emailLog = existing.slice(0, 50);
  writeFileStore(s);
}

// helper for tests to reset - not part of spec but useful
export async function _resetStore(): Promise<void> {
  if (hasBlob()) {
    const empty = emptyStore();
    try {
      await writeBlobStore(empty);
    } catch {}
    try {
      await delBlobStore();
      await writeBlobStore(empty);
    } catch {}
    return;
  }
  const init: Store = emptyStore();
  writeFileStore(init);
}
