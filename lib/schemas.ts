import { z } from "zod";

export const MonitorConfigSchema = z.object({
  url: z.string().url().default("https://rovos.com/journeys/specials/"),
  selector: z.string().default("main"),
  intervalMinutes: z.number().int().min(5).max(1440).default(60),
  recipient: z.string().email().default("js@architekton.gda.pl"),
  sender: z.string().email().default("noreply@rovos-monitor.vercel.app"),
});
export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

export const HistoryEntrySchema = z.object({
  timestamp: z.string().datetime(),
  hash: z.string().length(64).regex(/^[a-f0-9]+$/),
  changed: z.boolean(),
  error: z.string().optional(),
  durationMs: z.number().int().min(0).max(60000),
  snippet: z.string().max(500).optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const KVKeys = {
  lastHash: "rovos:lastHash",
  lastContent: "rovos:lastContent",
  lastCheck: "rovos:lastCheck",
  history: "rovos:history",
  emailLog: "rovos:emailLog",
} as const;

export const EmailLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  to: z.string().email(),
  subject: z.string().max(200),
  success: z.boolean(),
});
export type EmailLogEntry = z.infer<typeof EmailLogEntrySchema>;

export const EnvSchema = z.object({
  ZENROWS_API_KEY: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});
export type Env = z.infer<typeof EnvSchema>;
