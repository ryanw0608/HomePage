/*
 * Curated slash menu. BlockNote's default menu duplicates heading entries
 * (plain + toggle) and offers blocks the MDX converter can't serialize yet
 * (image/file/video/divider). We keep only the fully round-trippable blocks,
 * de-duplicated and ordered, so `/` is clean and everything it inserts saves
 * correctly. Native table + our components are offered explicitly below.
 */
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from "@blocknote/react";

// Titles to keep, in menu order. Matched against BlockNote's default item
// titles (aliases like "h1", "ul", "code" still work via query filtering).
const KEEP_ORDER = [
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Paragraph",
  "Bullet List",
  "Numbered List",
  "Quote",
  "Code Block"
];

/* Replace the current (empty) trigger block with `block`, or insert after a
 * non-empty one — mirrors BlockNote's native insertOrUpdateBlock so a `/`
 * insert doesn't strand an empty paragraph above the component. */
function insertBlock(editor: BlockNoteEditor<never, never, never>, block: PartialBlock<never, never, never>) {
  const cursor = editor.getTextCursorPosition();
  const current = cursor.block as { content?: unknown };
  const isEmpty = Array.isArray(current.content) && current.content.length === 0;
  if (isEmpty) {
    const updated = editor.updateBlock(cursor.block, block);
    editor.setTextCursorPosition(updated as never, "start");
    return;
  }
  const inserted = editor.insertBlocks([block], cursor.block, "after");
  if (inserted[0]) editor.setTextCursorPosition(inserted[0] as never, "start");
}

/* The site's own MDX components, offered like native blocks. */
function componentItems(editor: BlockNoteEditor<never, never, never>): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Tldr",
      subtext: "One-line takeaway callout ($ tldr)",
      aliases: ["tldr", "summary"],
      group: "Components",
      icon: <span className="studio-slash-glyph">$</span>,
      onItemClick: () => insertBlock(editor, { type: "tldr", content: [] } as never)
    },
    {
      title: "Callout",
      subtext: "Note / insight / warning / def / exam-trap",
      aliases: ["callout", "note", "def", "warning"],
      group: "Components",
      icon: <span className="studio-slash-glyph">//</span>,
      onItemClick: () => insertBlock(editor, { type: "callout", content: [] } as never)
    },
    ...leaf("Critique", "weaknesses ↔ improvements", ["critique", "weakness"], editor),
    ...leaf("WhenMatrix", "helps when / hurts when", ["whenmatrix", "helps", "hurts"], editor),
    ...leaf("KeyTakeaways", "bulleted takeaways", ["keytakeaways", "takeaways"], editor),
    ...leaf("Recall", "active-recall Q/A", ["recall", "qa"], editor),
    ...leaf("Figure", "image with caption", ["figure", "image", "img"], editor),
    ...leaf("FormulaCard", "reference formulas (KaTeX)", ["formulacard", "formula"], editor),
    ...leaf("Derivation", "collapsible numbered steps", ["derivation", "steps", "proof"], editor),
    ...leaf("Bench", "comparison table + winner highlight", ["bench", "table", "compare", "benchmark"], editor)
  ];
}

function leaf(
  name: string,
  subtext: string,
  aliases: string[],
  editor: BlockNoteEditor<never, never, never>
): DefaultReactSuggestionItem[] {
  return [
    {
      title: name,
      subtext,
      aliases,
      group: "Components",
      icon: <span className="studio-slash-glyph">▤</span>,
      onItemClick: () =>
        insertBlock(editor, { type: "mdxLeaf", props: { name, dataJson: "{}" } } as never)
    }
  ];
}

export function studioSlashItems(
  editor: BlockNoteEditor<never, never, never>
): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(editor);
  const byTitle = new Map<string, DefaultReactSuggestionItem>();
  for (const item of defaults) {
    // First occurrence wins → drops the toggle-heading duplicates.
    if (!byTitle.has(item.title)) byTitle.set(item.title, item);
  }
  const items = KEEP_ORDER.map((title) => byTitle.get(title)).filter(
    (item): item is DefaultReactSuggestionItem => Boolean(item)
  );
  const equation: DefaultReactSuggestionItem = {
    title: "Equation",
    subtext: "Display math ($$…$$)",
    aliases: ["equation", "math", "katex", "$$", "display"],
    group: "Blocks",
    icon: <span className="studio-slash-glyph">∑</span>,
    onItemClick: () => insertBlock(editor, { type: "displayMath", props: { tex: "" } } as never)
  };
  const table: DefaultReactSuggestionItem = {
    title: "Table",
    subtext: "GFM table (header + rows)",
    aliases: ["table", "grid", "gfm"],
    group: "Blocks",
    icon: <span className="studio-slash-glyph">▦</span>,
    onItemClick: () =>
      insertBlock(editor, {
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [
            { cells: [[], [], []] },
            { cells: [[], [], []] }
          ]
        }
      } as never)
  };
  return [...items.map((item) => ({ ...item, group: "Blocks" })), equation, table, ...componentItems(editor)];
}
