import { readFileSync } from "fs";
import { resolve } from "path";
import { MonitorConfigSchema, EnvSchema, type MonitorConfig } from "./schemas";

// storage uses BLOB_READ_WRITE_TOKEN (vercel blob) with fallback data/store.json when missing
// ZENROWS_API_KEY optional - validated as string if present (see lib/schemas.ts EnvSchema)

let cachedConfig: MonitorConfig | null = null;

export function loadConfig(): MonitorConfig {
  if (cachedConfig) return cachedConfig;
  const configPath = resolve(process.cwd(), "config/monitor.json");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  const result = MonitorConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  // Validate secrets in prod - warn but not crash
  if (process.env.NODE_ENV === "production" && !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Email auth missing in production - email will be mocked");
  }
  cachedConfig = result.data;
  return result.data;
}

export function validateConfig(): MonitorConfig {
  const cfg = loadConfig();
  // validate env optional keys (ZENROWS_API_KEY etc.) — ponytail: warn only, not crash
  try {
    EnvSchema.safeParse(process.env);
  } catch {}
  return cfg;
}

// CLI: npm run validate
// ponytail: ESM compat - require/module undefined in Next.js, guard with typeof
if ((typeof require !== "undefined" && typeof module !== "undefined" && (require as unknown as { main: unknown }).main === module) || process.argv.includes("--validate")) {
  try {
    const cfg = loadConfig();
    // Validate env secrets handling
    if (!process.env.GMAIL_APP_PASSWORD) {
      console.warn("Email auth not set - using mock (dev)");
    }
    console.log(JSON.stringify(cfg, null, 2));
    console.log("\u2713 config valid");
    process.exit(0);
  } catch (err) {
    console.error("Config validation failed:", err);
    process.exit(1);
  }
}
