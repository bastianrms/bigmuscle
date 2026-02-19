// components/PhotoCommentComposerShell.tsx
"use client";

import * as React from "react";
import { DataProvider } from "@plasmicapp/host";

type ComposerData = {
  draft: string;
  sending: boolean;
  error: string | null;
  setDraft: (v: string) => void;
  send: () => Promise<unknown> | void;
};

type Props = {
  children?: React.ReactNode;
  photoId?: string | null; // -> gibst du aus $ctx.photoModal?.photoId rein
  endpoint?: string;       // default: /api/photos/comment
  dataName?: string;       // default: photoCommentComposerShell
};

type CommentResponse = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function PhotoCommentComposerShell({
  children,
  photoId,
  endpoint = "/api/photos/comment",
  dataName = "photoCommentComposerShell",
}: Props) {
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = React.useCallback(async (): Promise<unknown> => {
    const pid = (photoId ?? "").trim();
    const content = draft.trim();
    if (!pid || !content || sending) return;

    setSending(true);
    setError(null);

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_id: pid, content }),
      });

      let data: CommentResponse = {};
      try {
        const json = (await resp.json()) as unknown;
        if (isObject(json)) data = json as CommentResponse;
      } catch {
        // ignore json parse
      }

      if (!resp.ok) {
        const msg = typeof data.error === "string" ? data.error : "Comment failed";
        throw new Error(msg);
      }

      setDraft("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("photomodal:refresh"));
      }

      return data;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSending(false);
    }
  }, [photoId, draft, sending, endpoint]);

  const ctxValue: ComposerData = React.useMemo(
    () => ({
      draft,
      sending,
      error,
      setDraft,
      send,
    }),
    [draft, sending, error, send]
  );

  return (
    <DataProvider name={dataName} data={ctxValue}>
      {children}
    </DataProvider>
  );
}

export default PhotoCommentComposerShell;