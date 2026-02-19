// components/PhotoModalDataShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type PhotoModalPhoto = {
  id: string;
  xl_url: string | null;
  created_at: string;
  created_at_relative: string;
  caption: string | null;
  like_count: number;
  owner: {
    user_id: string;
    username: string | null;
    thumb_url: string | null;
  };
};

export type PhotoModalComment = {
  id: string;
  content: string;
  created_at: string;
  created_at_relative: string;
  is_mine?: boolean; // optional (kommt aus API)
  user: {
    user_id: string;
    username: string | null;
    thumb_url: string | null;
  };
};

type ApiResponse = {
  photo: PhotoModalPhoto | null;
  liked_by_me: boolean;
  comments: PhotoModalComment[];
};

const DUMMY_IMG =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY_PHOTO: PhotoModalPhoto = {
  id: "demo-photo-1",
  xl_url: DUMMY_IMG,
  created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  created_at_relative: "10 days ago",
  caption: "Flexfriday for the pals. What have you been up to?",
  like_count: 24,
  owner: { user_id: "demo-user-1", username: "bulgebr", thumb_url: DUMMY_IMG },
};

const STUDIO_DUMMY_COMMENTS: PhotoModalComment[] = [
  {
    id: "demo-c-1",
    content: "Looking huge man!! 😏",
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    created_at_relative: "5 days ago",
    is_mine: true,
    user: { user_id: "demo-user-2", username: "bulgebr", thumb_url: DUMMY_IMG },
  },
];

function toTrimmedString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function PhotoModalDataShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;
  endpoint?: string;
  photoId?: unknown; // Plasmic: kann auch nicht-string sein
  commentsLimit?: number;
  photoDataName?: string;
  commentsDataName?: string;
  stateDataName?: string;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/photos/PhotoModalQuery",
    photoId,
    commentsLimit = 30,
    photoDataName = "photoModalPhoto",
    commentsDataName = "photoModalComments",
    stateDataName = "photoModalState",
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [photo, setPhoto] = React.useState<PhotoModalPhoto | null>(
    inStudio ? STUDIO_DUMMY_PHOTO : null
  );
  const [comments, setComments] = React.useState<PhotoModalComment[]>(
    inStudio ? STUDIO_DUMMY_COMMENTS : []
  );

  const [likedByMe, setLikedByMeState] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // optional: verhindert Double-Click-Spam und hält Button ruhig
  const [liking, setLiking] = React.useState(false);

  // ✅ NEU: Delete state
  const [deletingCommentId, setDeletingCommentId] = React.useState<string | null>(null);

  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const refresh = React.useCallback(() => setRefreshNonce((n) => n + 1), []);

  // ✅ (optional) globaler Refresh-Listener bleibt drin, aber NICHT nötig für delete
  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;

    let t: number | null = null;

    const onRefresh = () => {
      if (t !== null) window.clearTimeout(t);
      t = window.setTimeout(() => {
        refresh();
        t = null;
      }, 50);
    };

    window.addEventListener("photomodal:refresh", onRefresh);
    return () => {
      window.removeEventListener("photomodal:refresh", onRefresh);
      if (t !== null) window.clearTimeout(t);
    };
  }, [inStudio, enabled, refresh]);

  // ✅ Setter für optimistic UI
  const setLikedByMe = React.useCallback((v: boolean) => {
    setLikedByMeState(!!v);
  }, []);

  const setLikeCount = React.useCallback((n: number) => {
    const next = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    setPhoto((prev) => (prev ? { ...prev, like_count: next } : prev));
  }, []);

  const runFetch = React.useCallback(
    async (id: string) => {
      const qs = new URLSearchParams();
      qs.set("photo_id", id);
      qs.set("comments_limit", String(commentsLimit));

      const r = await fetch(`${endpoint}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const text = await r.text();
      if (!r.ok) throw new Error(text);
      return JSON.parse(text) as ApiResponse;
    },
    [endpoint, commentsLimit]
  );

  // ✅ NEU: deleteComment in der Shell (kein $currentItem / kein window nötig)
  const deleteComment = React.useCallback(
    async (commentId: unknown): Promise<unknown> => {
      if (inStudio) return;
      const cid = typeof commentId === "string" ? commentId.trim() : "";
      if (!cid) return;
      if (deletingCommentId) return;

      setDeletingCommentId(cid);
      setError(null);

      // optimistic: sofort aus UI entfernen
      setComments((prev) => prev.filter((c) => c.id !== cid));

      try {
        const resp = await fetch("/api/photos/deleteComment", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          cache: "no-store",
          body: JSON.stringify({ comment_id: cid }),
        });

        const text = await resp.text();

        let data: Record<string, unknown> = {};
        try {
          const parsed: unknown = text ? JSON.parse(text) : {};
          if (isObject(parsed)) data = parsed;
        } catch {
          // ignore
        }

        if (!resp.ok) {
          refresh();

          const errVal = data["error"];
          const msg =
            typeof errVal === "string" ? errVal : text || "Delete failed";

          throw new Error(msg);
        }

        // reconcile
        refresh();
        return data;
        return data;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setDeletingCommentId(null);
      }
    },
    [inStudio, deletingCommentId, refresh]
  );

  // A) PhotoId change => sofort leeren + loading
  React.useEffect(() => {
    if (inStudio) {
      setPhoto(STUDIO_DUMMY_PHOTO);
      setComments(STUDIO_DUMMY_COMMENTS);
      setLikedByMeState(false);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setLiking(false);
      setDeletingCommentId(null);
      return;
    }

    if (!enabled) return;

    const id = toTrimmedString(photoId);

    if (!id) {
      setPhoto(null);
      setComments([]);
      setLikedByMeState(false);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setLiking(false);
      setDeletingCommentId(null);
      return;
    }

    let cancelled = false;

    setPhoto(null);
    setComments([]);
    setLikedByMeState(false);
    setError(null);
    setLiking(false);
    setDeletingCommentId(null);

    setLoading(true);
    setRefreshing(false);

    runFetch(id)
      .then((json) => {
        if (cancelled) return;
        setPhoto(json?.photo ?? null);
        setComments(Array.isArray(json?.comments) ? json.comments : []);
        setLikedByMeState(!!json?.liked_by_me);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPhoto(null);
        setComments([]);
        setLikedByMeState(false);
        setLoading(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [photoId, enabled, inStudio, runFetch]);

  // B) Background Refresh (UI bleibt stehen)
  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;

    const id = toTrimmedString(photoId);
    if (!id) return;

    if (loading) return;

    let cancelled = false;
    setRefreshing(true);
    setError(null);

    runFetch(id)
      .then((json) => {
        if (cancelled) return;
        setPhoto(json?.photo ?? null);
        setComments(Array.isArray(json?.comments) ? json.comments : []);
        setLikedByMeState(!!json?.liked_by_me);
        setRefreshing(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRefreshing(false);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce, enabled, inStudio, runFetch, photoId, loading]);

  const state = React.useMemo(
    () => ({
      liked_by_me: likedByMe,
      loading,
      refreshing,
      error,
      liking,

      deletingCommentId,

      refresh,

      setLikedByMe,
      setLikeCount,
      setLiking,

      // ✅ expose to Plasmic
      deleteComment,
    }),
    [
      likedByMe,
      loading,
      refreshing,
      error,
      liking,
      deletingCommentId,
      refresh,
      setLikedByMe,
      setLikeCount,
      deleteComment,
    ]
  );

  return (
    <DataProvider name={stateDataName} data={state}>
      <DataProvider name={photoDataName} data={photo}>
        <DataProvider name={commentsDataName} data={comments}>
          {children}
        </DataProvider>
      </DataProvider>
    </DataProvider>
  );
}

export default PhotoModalDataShell;