/*
 * Curated slash menu. BlockNote's default menu duplicates heading entries
 * (plain + toggle) and offers blocks the MDX converter can't serialize yet
 * (table/image/file/video/divider). We keep only the fully round-trippable
 * blocks, de-duplicated and ordered, so `/` is clean and everything it inserts
 * saves correctly. Component/table blocks are added here as P3.2b/P3.3 land.
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

/* Replace the current (empty) block with `block`, or insert after it. */
function insertBlock(editor: BlockNoteEditor<never, never, never>, block: PartialBlock<never, never, never>) {
  const cursor = editor.getTextCursorPosition();
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
  return [...items.map((item) => ({ ...item, group: "Blocks" })), ...componentItems(editor)];
}
