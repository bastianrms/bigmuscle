// components/ChatListData.tsx
"use client";

import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type ChatListItem = {
  conversation_id: string;
  other_user_id: string;
  username: string | null;
  thumb_url: string | null;
  last_message_created_at?: string | null;
  has_unread?: boolean;
  is_self?: boolean;
};

const STUDIO_DUMMY: ChatListItem[] = [
  {
    conversation_id: "demo-1",
    other_user_id: "user-123",
    username: "Demo User",
    thumb_url: "https://placehold.co/64x64?text=BM",
    last_message_created_at: new Date().toISOString(),
    has_unread: true,
    is_self: false,
  },
];

export function ChatListData(props: {
  children?: React.ReactNode;
  endpoint?: string;
  dataName?: string;
}) {
  const { children, endpoint = "/api/chat/chatlistquery", dataName = "chatList" } = props;

  const inStudio = !!usePlasmicCanvasContext();
  const router = useRouter();
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [items, setItems] = React.useState<ChatListItem[]>(inStudio ? STUDIO_DUMMY : []);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (inStudio) return;

    const bump = () => setRefreshNonce((n) => n + 1);
    router.events.on("routeChangeComplete", bump);
    window.addEventListener("chatlist:refresh", bump);

    return () => {
      router.events.off("routeChangeComplete", bump);
      window.removeEventListener("chatlist:refresh", bump);
    };
  }, [inStudio, router.events]);

  React.useEffect(() => {
    if (inStudio) {
      setItems(STUDIO_DUMMY);
      setError(null);
      return;
    }

    let cancelled = false;

    fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as { items?: ChatListItem[] };
      })
      .then((json) => {
        if (cancelled) return;

        const raw = Array.isArray(json?.items) ? json.items : [];

        // ✅ Backup-Filter (sollte serverseitig eh schon sauber sein)
        const filtered = raw.filter(
          (it) => it && it.is_self !== true && typeof it.other_user_id === "string" && it.other_user_id.trim()
        );

        setItems(filtered);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio, refreshNonce]);

  void error;

  return <DataProvider name={dataName} data={items}>{children}</DataProvider>;
}

export default ChatListData;