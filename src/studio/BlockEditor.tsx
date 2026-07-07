/*
 * BlockEditor — the Notion-grade WYSIWYG surface (BlockNote/ProseMirror).
 *
 * P3.1: the note body loads as one rawMdx block (source verbatim → byte-clean
 * round-trip); the source is editable in-card with a live preview. Frontmatter
 * stays owned by the raw text / Properties panel — on save we re-prepend the
 * LATEST fence region and combine it with the body serialized from the blocks
 * ("one-way while editing": blocks are canonical for the body, never pushed
 * back mid-session). P3.2 swaps loadDocument's body handling for real
 * per-node block parsing; this wiring stays.
 */
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@/studio/blocks/blocknote.css";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useCallback, useMemo, useRef } from "react";

import { studioSchema } from "@/studio/blocks/schema";
import { joinDocument, loadDocument, serializeBody, splitDocument, type ConvBlock } from "@/studio/convert";

interface Props {
  text: string;
  onChange?: (next: string) => void;
}

export default function BlockEditor({ text, onChange }: Props) {
  const mountText = useRef(text);
  const latestText = useRef(text);
  latestText.current = text;

  // initialContent is read once at creation; capture the mount-time text.
  const initial = useMemo(
    () => loadDocument(mountText.current).blocks as unknown as PartialBlock[],
    []
  );
  const editor = useCreateBlockNote({ schema: studioSchema, initialContent: initial });

  const emit = useCallback(() => {
    try {
      const { fmRegion } = splitDocument(latestText.current);
      const body = serializeBody(editor.document as unknown as ConvBlock[]);
      onChange?.(joinDocument(fmRegion, body));
    } catch {
      // A block without a P3.1 serializer (fresh content typed in block mode
      // before P3.2) — keep the last-good text; raw mode is the safe path.
    }
  }, [editor, onChange]);

  return (
    <div className="studio-blocknote">
      <BlockNoteView editor={editor} onChange={emit} theme="dark" />
    </div>
  );
}
