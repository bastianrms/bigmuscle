"use client";

import * as React from "react";

export type InputFieldNewType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "date"
  | "time"
  | "datetime-local"
  | "hidden";

export type InputMode =
  | "search"
  | "text"
  | "email"
  | "tel"
  | "url"
  | "none"
  | "numeric"
  | "decimal";

export type InputFieldNewProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;

  placeholder?: string;
  type?: InputFieldNewType;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;

  name?: string;
  id?: string;

  inputMode?: InputMode;

  min?: string;
  max?: string;
  step?: string;

  showPasswordToggle?: boolean;
  passwordShownLabel?: string;
  passwordHiddenLabel?: string;

  onEnter?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;

  rootClassName?: string;
  fieldClassName?: string;
  inputClassName?: string;
  rightAddonClassName?: string;
  toggleButtonClassName?: string;
  iconClassName?: string;
};

export default function InputFieldNew(props: InputFieldNewProps) {
  const {
    value,
    defaultValue,
    onChange,

    placeholder,
    type = "password",
    disabled = false,
    readOnly = false,
    required = false,

    name,
    id,

    inputMode,

    min,
    max,
    step,

    showPasswordToggle,
    passwordShownLabel = "Hide password",
    passwordHiddenLabel = "Show password",

    onEnter,
    onBlur,
    onFocus,

    rootClassName,
    fieldClassName,
    inputClassName,
    rightAddonClassName,
    toggleButtonClassName,
    iconClassName,
  } = props;

  const isControlled = typeof value !== "undefined";
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const currentValue = isControlled ? (value ?? "") : internal;

  const isPassword = type === "password";
  const allowToggle = (showPasswordToggle ?? isPassword) && isPassword;

  const [showPw, setShowPw] = React.useState(false);
  const effectiveType: InputFieldNewType = isPassword
    ? showPw
      ? "text"
      : "password"
    : type;

  function setValue(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  // ✅ sensible autocomplete defaults (always enabled)
  // - password: browser password manager
  // - email: email suggestions
  // - everything else: allow browser suggestions
  const autoComplete =
    effectiveType === "password"
      ? "current-password"
      : effectiveType === "email"
        ? "email"
        : "username";

  // ✅ Kill native browser UI (blue focus ring, default border, inner shadow, etc.)
  const suppressNativeStyles: React.CSSProperties = {
    outline: "none",
    boxShadow: "none",
    border: "none",
    background: "transparent",
    WebkitAppearance: "none",
    appearance: "none",
  };

  // ✅ stop iOS/macOS "helpful" text transforms / spellcheck in login fields
  const textAssistProps = {
    autoCapitalize: "none" as const,
    autoCorrect: "off" as const,
    spellCheck: false,
  };

  return (
    <div className={rootClassName}>
      <div className={fieldClassName}>
        <input
          id={id}
          name={name}
          value={currentValue}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          type={effectiveType}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          className={inputClassName}
          style={suppressNativeStyles}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
          onBlur={() => onBlur?.()}
          onFocus={() => onFocus?.()}
          {...textAssistProps}
        />

        {allowToggle && (
          <div className={rightAddonClassName}>
            <button
              type="button"
              className={toggleButtonClassName}
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? passwordShownLabel : passwordHiddenLabel}
              disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              style={{ ...suppressNativeStyles, padding: 0, margin: 0 }}
            >
              <span className={iconClassName} aria-hidden="true">
                {showPw ? "🙈" : "👁️"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}