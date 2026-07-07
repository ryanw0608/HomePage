import { describe, expect, it } from "vitest";

import { splitFrontmatter } from "@/studio/lib/mdx";

// Sanity coverage that also proves the vitest wiring; the converter's full
// golden round-trip suite lands with src/studio/convert/ in P3.1+.
describe("splitFrontmatter", () => {
  it("splits a note into inner YAML and body", () => {
    const { hasFrontmatter, frontmatter, body } = splitFrontmatter('---\ntitle: "X"\n---\n\nBody.\n');
    expect(hasFrontmatter).toBe(true);
    expect(frontmatter).toBe('title: "X"');
    expect(body).toBe("\nBody.\n");
  });

  it("preserves CRLF line endings in the body", () => {
    const { body } = splitFrontmatter("---\r\ntitle: X\r\n---\r\nline1\r\nline2\r\n");
    expect(body).toBe("line1\r\nline2\r\n");
  });

  it("treats a note without frontmatter as all body", () => {
    const { hasFrontmatter, body } = splitFrontmatter("no frontmatter here");
    expect(hasFrontmatter).toBe(false);
    expect(body).toBe("no frontmatter here");
  });
});
