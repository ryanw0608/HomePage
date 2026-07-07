/*
 * BlockEditor — the Notion-grade WYSIWYG surface (BlockNote/ProseMirror).
 *
 * P3.2: the note body parses into real blocks (heading 1–6 / paragraph /
 * quote / code + inline math), with everything else in a rawMdx card. The
 * converter keeps byte-exact provenance so an unchanged note round-trips
 * verbatim: at mount we re-key provenance to BlockNote's own block ids and
 * capture each block's post-normalization baseline, then self-check that the
 * baseline reproduces the body — if it can't, we degrade to a single whole-doc
 * rawMdx block (never lossy structured editing). Frontmatter stays owned by
 * the raw text / Properties panel and is re-prepended verbatim on save.
 */
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@/studio/blocks/blocknote.css";
// Editable component blocks (Tldr/Callout) reuse the ported component styles.
import "@/studio/preview/components.css";

import { filterSuggestionItems, type PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { studioSchema } from "@/studio/blocks/schema";
import { studioSlashItems } from "@/studio/blocks/slashMenu";
import {
  joinDocument,
  loadDocument,
  splitDocument,
  wholeDocFallback,
  type ConvBlock
} from "@/studio/convert";
import { blockKey, serializeBody, type ProvMap } from "@/studio/convert/serialize";

interface Props {
  text: string;
  onChange?: (next: string) => void;
}

export default function BlockEditor({ text, onChange }: Props) {
  const mountText = useRef(text);
  const latestText = useRef(text);
  latestText.current = text;

  const loaded = useMemo(() => loadDocument(mountText.current), []);
  const editor = useCreateBlockNote({
    schema: studioSchema,
    initialContent: loaded.blocks as unknown as PartialBlock[]
  });

  const provRef = useRef<ProvMap>(loaded.prov);
  const tailRef = useRef(loaded.tail);
  const ready = useRef(false);

  // Post-mount baseline + self-check. Runs once.
  useEffect(() => {
    const mounted = editor.document as unknown as ConvBlock[];
    const { body } = splitDocument(latestText.current);
    const rebuilt: ProvMap = new Map();
    const n = Math.min(mounted.length, loaded.blocks.length);
    for (let i = 0; i < n; i++) {
      const orig = loaded.prov.get(loaded.blocks[i].id as string);
      if (!orig) continue;
      rebuilt.set(mounted[i].id as string, {
        gapBefore: orig.gapBefore,
        source: orig.source,
        pristineKey: blockKey(mounted[i])
      });
    }

    if (serializeBody(mounted, rebuilt, loaded.tail) === body) {
      provRef.current = rebuilt;
      tailRef.current = loaded.tail;
      ready.current = true;
      return;
    }

    // Baseline doesn't reproduce the body (BlockNote renormalized in a way the
    // pairing can't follow) — degrade to a safe whole-doc rawMdx block.
    const fb = wholeDocFallback(latestText.current);
    editor.replaceBlocks(editor.document, fb.blocks as unknown as PartialBlock[]);
    queueMicrotask(() => {
      const m2 = editor.document as unknown as ConvBlock[];
      const p2: ProvMap = new Map();
      const fbEntry = fb.prov.get(fb.blocks[0].id as string);
      if (m2[0] && fbEntry) {
        p2.set(m2[0].id as string, { ...fbEntry, pristineKey: blockKey(m2[0]) });
      }
      provRef.current = p2;
      tailRef.current = "";
      ready.current = true;
    });
  }, [editor, loaded]);

  const emit = useCallback(() => {
    if (!ready.current) return; // don't serialize before the baseline is captured
    try {
      const { fmRegion } = splitDocument(latestText.current);
      const body = serializeBody(editor.document as unknown as ConvBlock[], provRef.current, tailRef.current);
      onChange?.(joinDocument(fmRegion, body));
    } catch {
      // A block with no house-style serializer (e.g. a slash-inserted table
      // before P3.2b) — keep the last-good text; raw mode is the safe path.
    }
  }, [editor, onChange]);

  return (
    <div className="studio-blocknote">
      <BlockNoteView editor={editor} onChange={emit} slashMenu={false} theme="dark">
        <SuggestionMenuController
          getItems={async (query) =>
            filterSuggestionItems(studioSlashItems(editor as never), query)
          }
          triggerCharacter="/"
        />
      </BlockNoteView>
    </div>
  );
}
