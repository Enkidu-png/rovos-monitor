import { scrapeSpecials } from "./scraper";
import { hashContent } from "./hasher";
import { getLastHash, applyCheckUpdate } from "./storage";
import { canSendEmail, sendChangeNotification } from "./email";
import { loadConfig } from "./config";

export type CheckResult = {
  changed: boolean;
  hash: string;
  durationMs: number;
  usedFallback?: boolean;
  error?: string;
};

const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export async function checkCycle(): Promise<CheckResult> {
  const cfg = loadConfig();
  const t0 = Date.now();
  const result = await scrapeSpecials(cfg.url);

  if (result.error || !result.content) {
    const durationMs = result.durationMs ?? Date.now() - t0;
    const now = new Date().toISOString();
    await applyCheckUpdate({
      lastCheck: now,
      entry: {
        timestamp: now,
        hash: EMPTY_HASH,
        changed: false,
        error: result.error || "no-content",
        durationMs,
        snippet: undefined,
      },
    });
    return { changed: false, hash: EMPTY_HASH, durationMs, usedFallback: result.usedFallback, error: result.error || "no-content" };
  }

  const hash = hashContent(result.content);
  const lastHash = await getLastHash();
  const changed = lastHash !== null && hash !== lastHash;
  const now = new Date().toISOString();
  const durationMs = result.durationMs ?? Date.now() - t0;

  await applyCheckUpdate({
    lastCheck: now,
    content: result.content,
    hash,
    entry: {
      timestamp: now,
      hash,
      changed,
      durationMs,
      snippet: result.content.slice(0, 500),
    },
  });

  if (changed && (await canSendEmail())) {
    await sendChangeNotification({
      to: cfg.recipient,
      url: cfg.url,
      snippet: result.content.slice(0, 500),
      hash,
    });
  }

  return { changed, hash, durationMs, usedFallback: result.usedFallback };
}
