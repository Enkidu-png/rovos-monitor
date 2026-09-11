import { readFileSync } from "fs";
import { resolve } from "path";
import { MonitorConfigSchema, type MonitorConfig } from "./schemas";

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
  return loadConfig();
}

// CLI: npm run validate
if (require.main === module || process.argv.includes("--validate")) {
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
