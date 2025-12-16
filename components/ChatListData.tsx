// components/ChatListData.tsx
import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";

export type ChatListItem = {
  conversation_id: string;
  other_user_id: string;
  username: string | null;
  thumb_url: string | null;
  updated_at: string | null;
};

const STUDIO_DUMMY: ChatListItem[] = [
  {
    conversation_id: "demo-1",
    other_user_id: "user-123",
    username: "Demo User",
    thumb_url: "https://placehold.co/64x64?text=BM",
    updated_at: new Date().toISOString(),
  },
  {
    conversation_id: "demo-2",
    other_user_id: "user-456",
    username: "Another Demo",
    thumb_url: "https://placehold.co/64x64?text=BM",
    updated_at: new Date().toISOString(),
  },
];

export function ChatListData(props: {
  children?: React.ReactNode;
  endpoint?: string;
  dataName?: string;
}) {
  const { children, endpoint = "/api/chat/chatlistquery", dataName = "chatList" } = props;

  // ✅ Das ist der zuverlässige Studio-Check
  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const [items, setItems] = React.useState<ChatListItem[]>(
    inStudio ? STUDIO_DUMMY : []
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (inStudio) {
      // ✅ Studio immer Dummy, damit der Repeater sichtbar ist
      setItems(STUDIO_DUMMY);
      setError(null);
      return;
    }

    let cancelled = false;

    fetch(endpoint, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setItems(Array.isArray(json?.items) ? json.items : []);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setItems([]);
        setError(String(e?.message ?? e));
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio]);

    void error;

  return (
    <DataProvider name={dataName} data={items}>
      {children}
    </DataProvider>
  );
}