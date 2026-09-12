import * as cheerio from "cheerio";

export function normalizeContent(html: string, selector = "main"): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();
  const selected = $(selector);
  const raw = selected.length ? selected.text() : $("body").text();
  // remove nonce-like hex strings 32+ chars and ISO timestamps
  let cleaned = raw.replace(/\b[a-f0-9]{32,}\b/g, "");
  cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*/g, "");
  const collapsed = cleaned.replace(/\s+/g, " ").trim();
  return collapsed.slice(0, 50000);
}

export function isCloudflareChallenge(html: string): boolean {
  if (!html) return false;
  return (
    html.includes("Just a moment") ||
    html.includes("cf-mitigated") ||
    html.includes("challenges.cloudflare.com")
  );
}
