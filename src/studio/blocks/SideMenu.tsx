/*
 * Custom side menu — the "+" add-block button and the "⋮⋮" drag handle whose
 * menu carries the block actions the product needs: Copy link (to the block on
 * the published page, with a #heading anchor when it is a heading), Duplicate,
 * Convert to (block type), and Delete. Drag to reorder is the handle's native
 * behaviour. Styling lives in blocknote.css.
 *
 * BlockNote 0.51 does not hand the hovered block to a custom side menu (the
 * sideMenu render fn gets `{}` and the dragHandleMenu fn gets `{children}`; the
 * block lives in an internal context only the built-ins read). So we track the
 * hovered block id from the DOM (`.bn-block-outer[data-id]`) and resolve it via
 * `editor.getBlock()` when an action fires — moving into the portalled menu does
 * not re-hover a block, so the id stays the one the menu opened for.
 */
import {
  AddBlockButton,
  DragHandleButton,
  DragHandleMenu,
  SideMenu,
  SideMenuController,
  useBlockNoteEditor,
  useComponentsContext
} from "@blocknote/react";
import { useEffect, useRef } from "react";
import { TbCopy, TbLink, TbTrash, TbTypography } from "react-icons/tb";

import { headingSlug, noteUrl } from "@/studio/blocks/noteUrl";
import type { StudioBlock, StudioEditor } from "@/studio/blocks/schema";

const CONVERT_TARGETS: { label: string; type: string; props?: Record<string, unknown> }[] = [
  { label: "Text", type: "paragraph" },
  { label: "Heading 1", type: "heading", props: { level: 1 } },
  { label: "Heading 2", type: "heading", props: { level: 2 } },
  { label: "Heading 3", type: "heading", props: { level: 3 } },
  { label: "Bulleted list", type: "bulletListItem" },
  { label: "Numbered list", type: "numberedListItem" },
  { label: "Quote", type: "quote" },
  { label: "Code", type: "codeBlock" }
];

function blockPlainText(block: StudioBlock): string {
  const content = (block as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  return content
    .map((n) => (n && typeof n === "object" && "text" in n ? String((n as { text: unknown }).text ?? "") : ""))
    .join("");
}

function StudioDragHandleMenu({ getBlock, notePath }: { getBlock: () => StudioBlock | undefined; notePath?: string }) {
  const editor = useBlockNoteEditor() as unknown as StudioEditor;
  const Components = useComponentsContext();
  if (!Components) return null;
  const Item = Components.Generic.Menu.Item;

  const copyLink = async () => {
    const block = getBlock();
    const base = noteUrl(notePath);
    if (!block || !base) return;
    const anchor = (block as { type?: string }).type === "heading" ? `#${headingSlug(blockPlainText(block))}` : "";
    try {
      await navigator.clipboard.writeText(base + anchor);
    } catch {
      /* clipboard needs focus/https — ignore */
    }
  };

  const duplicate = () => {
    const block = getBlock();
    if (!block) return;
    const copy = { type: block.type, props: { ...block.props }, content: block.content } as never;
    editor.insertBlocks([copy], block, "after");
  };

  const convert = (type: string, props?: Record<string, unknown>) => {
    const block = getBlock();
    if (!block) return;
    editor.updateBlock(block, { type, props } as never);
  };

  const remove = () => {
    const block = getBlock();
    if (block) editor.removeBlocks([block]);
  };

  return (
    <DragHandleMenu>
      <Item icon={<TbLink size={14} />} onClick={copyLink}>
        Copy link
      </Item>
      <Item icon={<TbCopy size={14} />} onClick={duplicate}>
        Duplicate
      </Item>
      <Components.Generic.Menu.Root position="right" sub>
        <Components.Generic.Menu.Trigger sub>
          <Item icon={<TbTypography size={14} />} subTrigger>
            Convert to
          </Item>
        </Components.Generic.Menu.Trigger>
        <Components.Generic.Menu.Dropdown sub>
          {CONVERT_TARGETS.map((t) => (
            <Item key={t.label} onClick={() => convert(t.type, t.props)}>
              {t.label}
            </Item>
          ))}
        </Components.Generic.Menu.Dropdown>
      </Components.Generic.Menu.Root>
      <Item icon={<TbTrash size={14} />} onClick={remove}>
        Delete
      </Item>
    </DragHandleMenu>
  );
}

export function StudioSideMenu({ notePath }: { notePath?: string }) {
  const editor = useBlockNoteEditor() as unknown as StudioEditor;
  const hoveredId = useRef<string | null>(null);

  // Track the block the cursor is over so menu actions know their target.
  useEffect(() => {
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const outer = t?.closest?.(".studio-blocknote .bn-block-outer[data-id]");
      const id = outer?.getAttribute("data-id");
      if (id) hoveredId.current = id;
    };
    document.addEventListener("mouseover", onOver, true);
    return () => document.removeEventListener("mouseover", onOver, true);
  }, []);

  const getBlock = () => {
    const id = hoveredId.current;
    if (!id) return undefined;
    return (editor.getBlock(id) as StudioBlock | undefined) ?? undefined;
  };

  return (
    <SideMenuController
      sideMenu={(props) => (
        <SideMenu {...props}>
          <AddBlockButton />
          <DragHandleButton {...props} dragHandleMenu={() => <StudioDragHandleMenu getBlock={getBlock} notePath={notePath} />} />
        </SideMenu>
      )}
    />
  );
}
