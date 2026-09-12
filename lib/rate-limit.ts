const rateLimitMap = new Map<string, number>();
const RATE_WINDOW_MS = 30 * 1000;

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const last = rateLimitMap.get(ip);
  if (last !== undefined && now - last < RATE_WINDOW_MS) return true;
  return false;
}

export function setRateLimit(ip: string, now = Date.now()): void {
  rateLimitMap.set(ip, now);
}

export function resetRateLimit(): void {
  rateLimitMap.clear();
}
