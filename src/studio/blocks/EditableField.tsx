/*
 * Edit-in-place primitives: inputs styled to look exactly like the rendered
 * text (borderless, transparent, inherit font/colour), so a component's
 * rendered output IS its editing surface — click the text and type, no form,
 * no markdown. IME-safe (commit on change; composition handled by the browser
 * for a controlled input). Used by the leaf component blocks.
 */
import { useEffect, useRef, type KeyboardEvent } from "react";

export function AutoInput({
  value,
  onChange,
  onEnter,
  onBackspaceEmpty,
  placeholder,
  className,
  autoFocus
}: {
  value: string;
  onChange: (next: string) => void;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, [autoFocus]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Backspace" && value === "" && onBackspaceEmpty) {
      e.preventDefault();
      onBackspaceEmpty();
    }
  }

  return (
    <input
      className={`studio-edit-input ${className ?? ""}`}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      ref={ref}
      value={value}
    />
  );
}

export function AutoArea({
  value,
  onChange,
  onEnter,
  onBackspaceEmpty,
  placeholder,
  className,
  autoFocus
}: {
  value: string;
  onChange: (next: string) => void;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, [autoFocus]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter commits the item (Notion list behaviour); Shift+Enter is a soft
    // newline inside the field.
    if (e.key === "Enter" && !e.shiftKey && onEnter) {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Backspace" && value === "" && onBackspaceEmpty) {
      e.preventDefault();
      onBackspaceEmpty();
    }
  }

  return (
    <textarea
      className={`studio-edit-area ${className ?? ""}`}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      ref={ref}
      rows={1}
      value={value}
    />
  );
}
