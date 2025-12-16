"use client";

import React from "react";

export type LazyMountProps = {
  /** Wenn false → rendert gar nichts, Kinder werden nicht gemountet */
  active?: boolean;
  /** Optional: Klasse für Wrapper, z.B. für Animation / Layout */
  className?: string;
  /** Inhalt, der nur bei active=true gemountet wird */
  children?: React.ReactNode;
};

export function LazyMount({ active, className, children }: LazyMountProps) {
  if (!active) {
    // 💡 Nichts im DOM → keine Queries in diesem Subtree, keine Effekte
    return null;
  }

  return <div className={className}>{children}</div>;
}