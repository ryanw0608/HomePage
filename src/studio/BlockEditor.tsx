/*
 * BlockEditor — the Notion-grade WYSIWYG surface (BlockNote/ProseMirror).
 *
 * P3.0: mounts the editor with the Terminal-Luxe skin to prove the Astro
 * client-only island + theming + bundle isolation. The MDX<->block converter
 * (loadDocument/serializeDocument) is wired in P3.1+; until then block mode
 * shows a placeholder and raw mode stays the default editing surface.
 */
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@/studio/blocks/blocknote.css";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

interface Props {
  text: string;
  onChange?: (next: string) => void;
}

export default function BlockEditor(_props: Props) {
  const editor = useCreateBlockNote({
    initialContent: [
      { type: "heading", props: { level: 1 }, content: "Block mode" },
      {
        type: "paragraph",
        content:
          "The MDX↔block converter lands next. For now edit in raw mode (toggle above) — it round-trips your notes byte-for-byte."
      }
    ]
  });

  return (
    <div className="studio-blocknote">
      <BlockNoteView editor={editor} theme="dark" />
    </div>
  );
}
