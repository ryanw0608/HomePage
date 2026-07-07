import { describe, expect, it } from "vitest";

import { renderPreview } from "@/studio/lib/mdx";

/*
 * Regression locks for the two adversarial-review findings on the component
 * preview renderer. Both were reproduced against the real pipeline.
 */
describe("preview security + robustness", () => {
  it("scrubs a control-char-obfuscated javascript: URL (tab in the scheme)", async () => {
    // `java\tscript:` normalizes to javascript: in the browser before scheme
    // resolution — the scrubber must catch it, not just the contiguous form.
    const html = await renderPreview(
      '<Figure src="/a" alt="x" caption="c" source="s" sourceUrl={"java\tscript:alert(1)"} />',
      {}
    );
    expect(html).not.toMatch(/href="[^"]*script:/i);
    expect(html).toContain('href="#"');
  });

  it("scrubs the plain javascript: URL too (no regression)", async () => {
    const html = await renderPreview(
      '<Figure src="/a" alt="x" caption="c" source="s" sourceUrl="javascript:alert(1)" />',
      {}
    );
    expect(html).toContain('href="#"');
  });

  it("falls back to a placeholder instead of blanking on a renderer crash", async () => {
    // A double-comma array hole → a null element → the Recall renderer throws;
    // the transform must catch it and emit a placeholder, and renderPreview
    // must still resolve (not reject and freeze the whole preview).
    const html = await renderPreview('<Recall items={[{q:"a",a:"b"}, , {q:"c",a:"d"}]} />', {});
    expect(html).toContain("studio-jsx");
  });

  it("still renders good components fully (no over-eager fallback)", async () => {
    const html = await renderPreview('<Critique weaknesses={["w"]} improvements={["i"]} />', {});
    expect(html).toContain("diff-minus");
    expect(html).not.toContain("studio-jsx");
  });
});
