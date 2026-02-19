"use client";

import React, { useEffect, useMemo, useState } from "react";

export type UnitSystem = "metric" | "imperial";

export type UnitSystemRadioProps = {
  // Controlled / uncontrolled
  value?: UnitSystem;               // controlled
  defaultValue?: UnitSystem;        // fallback
  disabled?: boolean;

  metricLabel?: string;
  imperialLabel?: string;

  // Events
  onChange?: (value: UnitSystem) => void;

  // Optional HTML
  wrapperId?: string;

  // Styling (simplified)
  wrapperClassName?: string;
  buttonClassName?: string;
  activeButtonClassName?: string;
  textClassName?: string;
  activeTextClassName?: string;
};

export function UnitSystemRadio(props: UnitSystemRadioProps) {
  const {
    value,
    defaultValue = "imperial",
    disabled = false,
    metricLabel = "Metric",
    imperialLabel = "Imperial",
    onChange,
    wrapperId,
    wrapperClassName,
    buttonClassName,
    activeButtonClassName,
    textClassName,
    activeTextClassName,
  } = props;

  const isControlled = typeof value !== "undefined";

  const [internal, setInternal] = useState<UnitSystem>(defaultValue);

  // Sync internal state when controlled value changes
  useEffect(() => {
    if (isControlled) {
      setInternal(value as UnitSystem);
    }
  }, [isControlled, value]);

  const selected: UnitSystem = isControlled ? (value as UnitSystem) : internal;

  const buttons = useMemo(
    () => [
      { key: "metric" as const, label: metricLabel },
      { key: "imperial" as const, label: imperialLabel },
    ],
    [metricLabel, imperialLabel]
  );

  function select(next: UnitSystem) {
    if (disabled) return;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  return (
    <div id={wrapperId} className={wrapperClassName} role="radiogroup" aria-disabled={disabled}>
      {buttons.map((b) => {
        const active = selected === b.key;

        return (
          <button
            key={b.key}
            type="button"
            disabled={disabled}
            aria-checked={active}
            role="radio"
            className={[buttonClassName, active ? activeButtonClassName : ""].filter(Boolean).join(" ")}
            onClick={() => select(b.key)}
          >
            <span
              className={[textClassName, active ? activeTextClassName : ""].filter(Boolean).join(" ")}
            >
              {b.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default UnitSystemRadio;