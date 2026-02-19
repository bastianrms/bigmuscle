// components/ToggleSwitch.tsx
"use client";

import * as React from "react";

export type ToggleSwitchProps = {
  checked?: boolean; // default false
  disabled?: boolean; // default false
  onChange?: (checked: boolean) => void;

  // Design props (Plasmic editierbar)
  trackOffColor?: string; // "#d4d4d4"
  trackOnColor?: string;  // "#22c55e"
  thumbColor?: string;    // "#ffffff"

  widthPx?: number;   // 56
  heightPx?: number;  // 32
  paddingPx?: number; // 2
  thumbShadow?: boolean; // true

  // Class props (Plasmic Styling)
  wrapperClassName?: string; // A
  trackClassName?: string;   // B
  thumbClassName?: string;   // C
};

export function ToggleSwitch(props: ToggleSwitchProps) {
  const {
    checked = false,
    disabled = false,
    onChange,

    trackOffColor = "#d4d4d4",
    trackOnColor = "#22c55e",
    thumbColor = "#ffffff",

    widthPx = 56,
    heightPx = 32,
    paddingPx = 2,
    thumbShadow = true,

    wrapperClassName,
    trackClassName,
    thumbClassName,
  } = props;

  const handleToggle = React.useCallback(() => {
    if (disabled) return;
    onChange?.(!checked);
  }, [disabled, onChange, checked]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange?.(!checked);
      }
    },
    [disabled, onChange, checked]
  );

  const w = Math.max(36, Math.round(widthPx));
  const h = Math.max(20, Math.round(heightPx));
  const pad = Math.max(0, Math.round(paddingPx));

  const thumbSize = Math.max(8, h - pad * 2);
  const leftOff = pad;
  const leftOn = Math.max(pad, w - pad - thumbSize);

  const wrapperStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
  };

  const trackStyle: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: 9999,
    backgroundColor: checked ? trackOnColor : trackOffColor,
    position: "relative",
    transition: "background-color 150ms ease",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
    opacity: disabled ? 0.6 : 1,
  };

  const thumbStyle: React.CSSProperties = {
    width: thumbSize,
    height: thumbSize,
    borderRadius: 9999,
    backgroundColor: thumbColor,
    position: "absolute",
    top: pad,
    left: checked ? leftOn : leftOff,
    transition: "left 150ms ease",
    boxShadow: thumbShadow ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
  };

  return (
    <div
      className={wrapperClassName}
      style={wrapperStyle}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      data-checked={checked ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
    >
      <div className={trackClassName} style={trackStyle} data-checked={checked ? "true" : "false"}>
        <div className={thumbClassName} style={thumbStyle} data-checked={checked ? "true" : "false"} />
      </div>
    </div>
  );
}

export default ToggleSwitch;