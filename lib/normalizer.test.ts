import { describe, it, expect } from "vitest";
import { normalizeContent, isCloudflareChallenge } from "./normalizer";
import { hashContent } from "./hasher";

describe("normalizer-hasher F1-02", () => {
  it("normalizeContent removes script and collapses whitespace -> 'a b'", () => {
    expect(normalizeContent('<main>  a  <script>x</script> b </main>')).toBe("a b");
  });

  it("hashContent hello -> 64 hex deterministyczny", () => {
    const h = hashContent("hello");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(hashContent("hello")).toBe(h);
  });

  it("isCloudflareChallenge true/false", () => {
    expect(isCloudflareChallenge("Just a moment")).toBe(true);
    expect(isCloudflareChallenge("<html>normal</html>")).toBe(false);
  });

  it("hashContent 50KB <50ms", () => {
    const big = "a".repeat(50000);
    const start = performance.now();
    hashContent(big);
    const dur = performance.now() - start;
    expect(dur).toBeLessThan(50);
  });

  it("negative: nie lowercasuje", () => {
    expect(normalizeContent("<main>A</main>")).toBe("A");
  });

  it("brzegowe: empty -> '' and empty hash known", () => {
    expect(normalizeContent("", "main")).toBe("");
    expect(hashContent("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("truncate 50KB", () => {
    const big = "x".repeat(60000);
    const html = `<main>${big}</main>`;
    const out = normalizeContent(html);
    expect(out.length).toBe(50000);
  });

  it("removes style/noscript/iframe/svg", () => {
    expect(normalizeContent('<main>a<style>x</style>b</main>')).toBe("ab");
  });
});
