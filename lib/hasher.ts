import { createHash } from "crypto";

export function hashContent(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
