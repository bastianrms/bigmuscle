// components/PhotoManageShell.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type ManagePhoto = {
  id: string;
  user_id: string;
  thumb_url: string | null;
  visibility: "public" | "private";
  created_at: string;
  is_profilephoto: boolean;
};

type ApiListResponse = { ok?: boolean; items?: ManagePhoto[] };
type ApiBatchSaveResponse = { ok?: boolean; updated?: number };
type ApiDeleteResponse = { ok?: boolean; id?: string };
type ApiProfileResponse = { ok?: boolean; id?: string };

const DUMMY_THUMB =
  "https://pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev/bed3882c-9912-42ab-b5ca-625ecb8e14dc/1764967299363-thumb.webp";

const STUDIO_DUMMY: ManagePhoto[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `demo-photo-${i + 1}`,
  user_id: `demo-user`,
  thumb_url: DUMMY_THUMB,
  visibility: i % 2 === 0 ? "public" : "private",
  created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  is_profilephoto: i === 0,
}));

type Visibility = "public" | "private";

type Props = {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string; // /api/photos/myPhotos
  limit?: number;

  saveEndpoint?: string; // /api/photos/saveVisibilityBatch
  deleteEndpoint?: string; // /api/photos/deletePhoto
  profileEndpoint?: string; // /api/photos/setProfilePhoto

  dataName?: string;
  fallbackThumbUrl?: string;

  successHideMs?: number; // 2000
};

type Ctx = {
  items: ManagePhoto[];
  loading: boolean;
  error: string | null;

  // pending visibility
  pendingVisibility: Record<string, Visibility>;
  hasPending: boolean;
  pendingCount: number;

  saveSuccess: boolean;

  refresh: () => void;

  setPendingVisibility: (photoId: string, visibility: Visibility) => void;

  save: () => Promise<boolean>;
  deletePhoto: (photoId: string) => Promise<void>;

  // NEW
  setProfilePhoto: (photoId: string) => Promise<void>;

  getVisibilityLabel: (v: Visibility) => string;
  getToggleLabel: (v: Visibility) => string;
};

function applyFallbackThumb(items: ManagePhoto[], fallbackThumbUrl?: string): ManagePhoto[] {
  if (!fallbackThumbUrl) return items;
  return items.map((it) => ({ ...it, thumb_url: it.thumb_url ?? fallbackThumbUrl }));
}

export function PhotoManageShell(props: Props) {
  const {
    children,
    enabled = true,
    endpoint = "/api/photos/myPhotos",
    limit = 200,
    saveEndpoint = "/api/photos/saveVisibilityBatch",
    deleteEndpoint = "/api/photos/deletePhoto",
    profileEndpoint = "/api/photos/setProfilePhoto",
    dataName = "photoManage",
    fallbackThumbUrl,
    successHideMs = 2000,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [items, setItems] = React.useState<ManagePhoto[]>(inStudio ? STUDIO_DUMMY : []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [pendingVisibility, setPendingVisibilityState] = React.useState<Record<string, Visibility>>(
    {}
  );
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;

    if (inStudio) {
      setItems(applyFallbackThumb(STUDIO_DUMMY, fallbackThumbUrl));
      setPendingVisibilityState({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(limit));

      const r = await fetch(`${endpoint}?${qs.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

      const json = JSON.parse(txt) as ApiListResponse;
      const nextItems = Array.isArray(json?.items) ? (json.items as ManagePhoto[]) : [];

      setItems(applyFallbackThumb(nextItems, fallbackThumbUrl));
      setPendingVisibilityState({});
      setLoading(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      if (msg.toLowerCase().includes("not authenticated")) {
        setItems(applyFallbackThumb(STUDIO_DUMMY, fallbackThumbUrl));
        setPendingVisibilityState({});
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(false);
      setError(msg);
    }
  }, [enabled, inStudio, endpoint, limit, fallbackThumbUrl]);

  // called by toggle
  const setPendingVisibility = React.useCallback((photoId: string, visibility: Visibility) => {
    if (!photoId) return;

    setItems((prev) => prev.map((p) => (p.id === photoId ? { ...p, visibility } : p)));
    setPendingVisibilityState((prev) => ({ ...prev, [photoId]: visibility }));
  }, []);

  const save = React.useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;
    if (inStudio) return true;

    const entries = Object.entries(pendingVisibility);
    if (entries.length === 0) return true;

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updates = entries.map(([id, visibility]) => ({ id, visibility }));

      const r = await fetch(saveEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ updates }),
      });

      const txt = await r.text();
      if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

      const json = JSON.parse(txt) as ApiBatchSaveResponse;
      if (!json?.ok) throw new Error("Save failed");

      setPendingVisibilityState({});
      setLoading(false);

      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), Math.max(500, successHideMs));

      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoading(false);
      setError(msg);
      void refresh();
      return false;
    }
  }, [enabled, inStudio, pendingVisibility, saveEndpoint, refresh, successHideMs]);

  const deletePhoto = React.useCallback(
    async (photoId: string) => {
      if (!enabled) return;
      if (!photoId) return;

      // optimistic remove
      setItems((prev) => prev.filter((p) => p.id !== photoId));

      // remove pending
      setPendingVisibilityState((prev) => {
        const copy = { ...prev };
        delete copy[photoId];
        return copy;
      });

      try {
        const r = await fetch(deleteEndpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id: photoId }),
        });

        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

        const json = JSON.parse(txt) as ApiDeleteResponse;
        if (!json?.ok) throw new Error("Delete failed");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        void refresh();
      }
    },
    [enabled, deleteEndpoint, refresh]
  );

  // NEW: set profile photo (immediate)
  const setProfilePhoto = React.useCallback(
    async (photoId: string) => {
      if (!enabled) return;
      if (!photoId) return;
      if (inStudio) return;

      // optimistic: only one can be true
      setItems((prev) => prev.map((p) => ({ ...p, is_profilephoto: p.id === photoId })));

      try {
        const r = await fetch(profileEndpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ id: photoId }),
        });

        const txt = await r.text();
        if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);

        const json = JSON.parse(txt) as ApiProfileResponse;
        if (!json?.ok) throw new Error("Set profile photo failed");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        void refresh();
      }
    },
    [enabled, inStudio, profileEndpoint, refresh]
  );

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const getVisibilityLabel = React.useCallback((v: Visibility) => v, []);
  const getToggleLabel = React.useCallback(
    (v: Visibility) => (v === "public" ? "Make private" : "Make public"),
    []
  );

  const pendingCount = Object.keys(pendingVisibility).length;
  const hasPending = pendingCount > 0;

  const ctx: Ctx = React.useMemo(
    () => ({
      items,
      loading,
      error,

      pendingVisibility,
      hasPending,
      pendingCount,

      saveSuccess,

      refresh,
      setPendingVisibility,
      save,
      deletePhoto,
      setProfilePhoto,

      getVisibilityLabel,
      getToggleLabel,
    }),
    [
      items,
      loading,
      error,
      pendingVisibility,
      hasPending,
      pendingCount,
      saveSuccess,
      refresh,
      setPendingVisibility,
      save,
      deletePhoto,
      setProfilePhoto,
      getVisibilityLabel,
      getToggleLabel,
    ]
  );

  return (
    <DataProvider name={dataName} data={ctx}>
      {children}
    </DataProvider>
  );
}

export default PhotoManageShell;