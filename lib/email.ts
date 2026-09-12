import { getEmailLog, pushEmailLog } from "./storage";

const RATE_LIMIT_MS = 60 * 60 * 1000;

export function buildEmailSubject(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `Rovos Specials - wykryto zmiane - ${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export function buildEmailHtml(opts: { url: string; snippet: string; hash: string; dashboardUrl?: string }): string {
  const snippet = opts.snippet.slice(0, 500);
  const dash = opts.dashboardUrl || process.env.NEXT_PUBLIC_APP_URL || "https://rovos-monitor.vercel.app";
  const ts = new Date().toISOString();
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;background:#fafaf7;padding:24px;border-radius:8px">
  <meta charset="utf-8">
  <h1 style="font-size:18px;color:#0f4a3a">Wykryto zmiane na Rovos Specials</h1>
  <p>URL: <a href="${opts.url}">${opts.url}</a></p>
  <p>Hash: <code>${opts.hash}</code></p>
  <p>Fragment: ${escapeHtml(snippet)}</p>
  <p><a href="${dash}">Zobacz dashboard</a></p>
  <p style="color:#6b6b6b;font-size:12px">${ts} UTC</p>
</div>`;
}

export function buildEmailText(opts: { url: string; snippet: string; hash: string; dashboardUrl?: string }): string {
  const snippet = opts.snippet.slice(0, 500);
  return `Wykryto zmiane na Rovos Specials\nURL: ${opts.url}\nHash: ${opts.hash}\nFragment: ${snippet}\n`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function canSendEmail(): Promise<boolean> {
  const log = await getEmailLog();
  if (log.length === 0) return true;
  const last = log[0];
  const diff = Date.now() - new Date(last.timestamp).getTime();
  return diff > RATE_LIMIT_MS;
}

export async function sendChangeNotification(opts: {
  to: string;
  url: string;
  snippet: string;
  hash: string;
  dashboardUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const canSend = await canSendEmail();
  if (!canSend) return { success: false, error: "rate-limited" };

  const subject = buildEmailSubject(new Date());
  const html = buildEmailHtml(opts);
  const text = buildEmailText(opts);

  // In test, return mock without real SMTP
  if (process.env.NODE_ENV === "test") {
    const entry = { timestamp: new Date().toISOString(), to: opts.to, subject, success: true as const };
    await pushEmailLog(entry);
    return { success: true, messageId: "mock" };
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    // mock in dev without creds - still log
    const entry = { timestamp: new Date().toISOString(), to: opts.to, subject, success: true as const };
    await pushEmailLog(entry);
    return { success: true, messageId: "mock-dev-no-creds" };
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  try {
    const info = await transporter.sendMail({
      from: user,
      to: opts.to,
      subject,
      text,
      html,
    });
    await pushEmailLog({ timestamp: new Date().toISOString(), to: opts.to, subject, success: true });
    return { success: true, messageId: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await pushEmailLog({ timestamp: new Date().toISOString(), to: opts.to, subject, success: false });
    return { success: false, error: msg };
  }
}
