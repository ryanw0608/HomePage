/*
 * Custom formatting toolbar (the "选词" bubble over a text selection).
 *
 * Extends BlockNote's defaults with the actions the product needs and drops the
 * ones it doesn't: block-type convert (→ heading/list/quote/code), the text
 * styles, an inline-math button ($…$), inline text + background colour (these
 * are BlockNote *inline* styles — they colour the selected text only, never the
 * whole row), and a link button. Terminal-Luxe styling comes from blocknote.css.
 */
import {
  BasicTextStyleButton,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorChange,
  useEditorSelectionChange
} from "@blocknote/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { TbBlockquote, TbCode, TbH1, TbH2, TbH3, TbLetterCase, TbList, TbListNumbers, TbMath } from "react-icons/tb";

import type { StudioEditor } from "@/studio/blocks/schema";

/* Block-type "turn into" control. BlockNote's own BlockTypeSelect renders null
 * under a custom schema, so we drive the Select primitive directly off the
 * block at the text cursor. */
const TURN_INTO: { key: string; text: string; type: string; props?: Record<string, unknown>; icon: ReactNode }[] = [
  { key: "paragraph", text: "Text", type: "paragraph", icon: <TbLetterCase size={16} /> },
  { key: "h1", text: "Heading 1", type: "heading", props: { level: 1 }, icon: <TbH1 size={16} /> },
  { key: "h2", text: "Heading 2", type: "heading", props: { level: 2 }, icon: <TbH2 size={16} /> },
  { key: "h3", text: "Heading 3", type: "heading", props: { level: 3 }, icon: <TbH3 size={16} /> },
  { key: "bullet", text: "Bulleted list", type: "bulletListItem", icon: <TbList size={16} /> },
  { key: "numbered", text: "Numbered list", type: "numberedListItem", icon: <TbListNumbers size={16} /> },
  { key: "quote", text: "Quote", type: "quote", icon: <TbBlockquote size={16} /> },
  { key: "code", text: "Code", type: "codeBlock", icon: <TbCode size={16} /> }
];

function matches(block: { type: string; props?: Record<string, unknown> }, t: (typeof TURN_INTO)[number]): boolean {
  if (block.type !== t.type) return false;
  if (t.props?.level != null) return (block.props as { level?: number } | undefined)?.level === t.props.level;
  return true;
}

function TurnIntoSelect() {
  const editor = useBlockNoteEditor() as unknown as StudioEditor;
  const Components = useComponentsContext();
  const [block, setBlock] = useState(() => editor.getTextCursorPosition().block);
  const refresh = () => {
    try {
      setBlock(editor.getTextCursorPosition().block);
    } catch {
      /* no cursor mid-transaction — ignore */
    }
  };
  useEditorSelectionChange(refresh, editor as never);
  useEditorChange(refresh, editor as never);
  if (!Components) return null;
  const cur = block as { type: string; props?: Record<string, unknown> };
  // Only offer the turn-into control for basic text blocks (not custom cards).
  if (!TURN_INTO.some((t) => t.type === cur.type)) return null;
  return (
    <Components.FormattingToolbar.Select
      items={TURN_INTO.map((t) => ({
        text: t.text,
        icon: t.icon,
        isSelected: matches(cur, t),
        onClick: () => editor.updateBlock(block, { type: t.type, props: t.props } as never)
      }))}
    />
  );
}

/* Convert the current selection into an inline-math node holding its text as
 * TeX. Empty selection inserts an empty placeholder to type into. */
function InlineMathButton() {
  const editor = useBlockNoteEditor() as unknown as StudioEditor;
  const Components = useComponentsContext();
  if (!Components) return null;
  return (
    <Components.FormattingToolbar.Button
      icon={<TbMath />}
      label="Inline math"
      mainTooltip="Inline math"
      onClick={() => {
        const tex = editor.getSelectedText();
        editor.insertInlineContent([{ type: "inlineMath", props: { tex } }, " "]);
      }}
    />
  );
}

export function StudioFormattingToolbar() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <TurnIntoSelect key="turnInto" />
          <BasicTextStyleButton basicTextStyle="bold" key="bold" />
          <BasicTextStyleButton basicTextStyle="italic" key="italic" />
          <BasicTextStyleButton basicTextStyle="underline" key="underline" />
          <BasicTextStyleButton basicTextStyle="strike" key="strike" />
          <BasicTextStyleButton basicTextStyle="code" key="code" />
          <InlineMathButton key="inlineMath" />
          <ColorStyleButton key="colors" />
          <CreateLinkButton key="link" />
        </FormattingToolbar>
      )}
    />
  );
}
