"use client";

import React, { useEffect, useRef } from "react";

export type ChatMessageInputProps = {
  // Value & Events
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onEnter?: () => void;

  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;

  // Styling-Props (hierarchisch)
  // A. Ganz außen
  wrapperClassName?: string;   // A. Root wrapper
  // B. Außenrahmen (z.B. Flex, Border, Background)
  outerClassName?: string;     // B. Outer wrapper
  // C. Innerer Wrapper direkt um Textarea
  innerClassName?: string;     // C. Inner wrapper
  // D. Textarea selbst
  textareaClassName?: string;  // D. Textarea (Text, Placeholder, Padding)
};

export function ChatMessageInput(props: ChatMessageInputProps) {
  const {
    value,
    onChange,
    placeholder,
    onEnter,
    autoFocus,
    minRows = 1,
    maxRows = 5,
    wrapperClassName,
    outerClassName,
    innerClassName,
    textareaClassName,
  } = props;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-height anhand des Inhalts
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    const lineHeight = 20; // grob, kannst du per CSS genauer machen
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    const newHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${newHeight}px`;
  }, [value, minRows, maxRows]);

  return (
    <div className={wrapperClassName}>
      <div className={outerClassName}>
        <div className={innerClassName}>
          <textarea
            ref={textareaRef}
            className={textareaClassName}
            value={value}
            placeholder={placeholder}
            autoFocus={autoFocus}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => {
              // Enter = senden, Shift+Enter = neue Zeile
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onEnter?.();
              }
            }}
            rows={minRows}
            style={{
              overflow: "hidden",
              resize: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}