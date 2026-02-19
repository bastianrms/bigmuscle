// components/ChatMessagesShell.tsx
import * as React from "react";
import { DataProvider, usePlasmicCanvasContext } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type ChatMessageItem = {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  created_at_relative: string;
};

export type ChatOtherUser = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;
} | null;

type ChatComposerCtx = {
  draft: string;
  setDraft: (v: string) => void;
  send: () => Promise<void>;
  isSending: boolean;
  error: string | null;
};

type ChatMessagesQueryResponse = {
  conversation_id: string | null;
  other_user: ChatOtherUser;
  items: ChatMessageItem[] | null;
};

type SendResponse = {
  ok?: boolean;
  message?: {
    id?: string;
    sender_id?: string;
    content?: string | null;
    created_at?: string;
  };
};

const STUDIO_DUMMY_MESSAGES: ChatMessageItem[] = [
  {
    id: "demo-msg-1",
    sender_id: "user-123",
    content: "Hello from Studio dummy 🙂",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    created_at_relative: "2 minutes ago",
  },
  {
    id: "demo-msg-2",
    sender_id: "user-456",
    content: "Second message (dummy)",
    created_at: new Date(Date.now() - 60 * 1000).toISOString(),
    created_at_relative: "1 minute ago",
  },
];

const STUDIO_DUMMY_OTHER: ChatOtherUser = {
  user_id: "user-456",
  username: "Another Demo",
  thumb_url: "https://placehold.co/64x64?text=BM",
};

function formatRelativeTime(dateIso: string) {
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  const diffSec = Math.round((then - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diffSec);

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffSec / 3600);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffSec / (86400 * 30));
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffSec / (86400 * 365));
  return rtf.format(diffYear, "year");
}

export function ChatMessagesShell(props: {
  children?: React.ReactNode;
  enabled?: boolean;

  endpoint?: string;
  sendEndpoint?: string;
  markAsReadEndpoint?: string;

  dataName?: string;
  otherUserDataName?: string;
  composerDataName?: string;

  otherUserId?: string;     // optional (wenn du es aus der Liste hast)
  otherUsername?: string;   // ✅ neu (für /inbox/[username])
  limit?: number;
}) {
  const {
    children,
    enabled = true,
    endpoint = "/api/chat/ChatMessagesQuery",
    sendEndpoint = "/api/chat/send",
    markAsReadEndpoint = "/api/chat/markAsRead",
    dataName = "chatMessages",
    otherUserDataName = "chatOtherUser",
    composerDataName = "chatComposer",
    otherUserId,
    otherUsername,
    limit = 30,
  } = props;

  const canvasCtx = usePlasmicCanvasContext();
  const inStudio = !!canvasCtx;

  const router = useRouter();

  const [items, setItems] = React.useState<ChatMessageItem[]>(
    inStudio ? STUDIO_DUMMY_MESSAGES : []
  );
  const [otherUser, setOtherUser] = React.useState<ChatOtherUser>(
    inStudio ? STUDIO_DUMMY_OTHER : null
  );
  const [conversationId, setConversationId] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const lastLoadedKeyRef = React.useRef<string | null>(null);

  // 1) Messages laden
  React.useEffect(() => {
    if (inStudio) {
      setItems(STUDIO_DUMMY_MESSAGES);
      setOtherUser(STUDIO_DUMMY_OTHER);
      setConversationId("studio-conv");
      return;
    }

    if (!enabled) return;

    const fromRoute =
      typeof router.query.username === "string" ? router.query.username : null;

    const effectiveUsername = (otherUsername ?? fromRoute)?.trim() ?? null;

    const key = otherUserId
      ? `id:${otherUserId}`
      : effectiveUsername
        ? `u:${effectiveUsername}`
        : null;

    if (!key) {
      setItems([]);
      setOtherUser(null);
      setConversationId(null);
      lastLoadedKeyRef.current = null;
      return;
    }

    if (lastLoadedKeyRef.current && lastLoadedKeyRef.current !== key) {
      setItems([]);
      setOtherUser(null);
      setConversationId(null);
    }

    let cancelled = false;

    const qs = new URLSearchParams();
    if (otherUserId) qs.set("other_user_id", otherUserId);
    else qs.set("other_username", effectiveUsername as string);
    qs.set("limit", String(limit));

    fetch(`${endpoint}?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as ChatMessagesQueryResponse;
      })
      .then((json) => {
        if (cancelled) return;

        setItems(Array.isArray(json?.items) ? json.items : []);
        setOtherUser((json?.other_user ?? null) as ChatOtherUser);
        setConversationId(typeof json?.conversation_id === "string" ? json.conversation_id : null);

        lastLoadedKeyRef.current = key;
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setOtherUser(null);
        setConversationId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, inStudio, enabled, otherUserId, otherUsername, router.query.username, limit]);

  // 1.5) Nach erfolgreichem GET: markAsRead + ChatList refresh
  React.useEffect(() => {
    if (inStudio) return;
    if (!enabled) return;
    if (!conversationId) return;

    fetch(markAsReadEndpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ conversation_id: conversationId }),
    })
      .then(() => {
        window.dispatchEvent(new Event("chatlist:refresh"));
      })
      .catch(() => {});
  }, [inStudio, enabled, conversationId, markAsReadEndpoint]);

  // 2) Send Handler
  const send = React.useCallback(async () => {
    if (!enabled) return;

    const text = draft.trim();
    if (!text) return;

    if (inStudio) {
      const createdAt = new Date().toISOString();
      setItems((prev) => [
        {
          id: `studio-${Date.now()}`,
          sender_id: "me",
          content: text,
          created_at: createdAt,
          created_at_relative: "now",
        },
        ...prev,
      ]);
      setDraft("");
      return;
    }

    // ✅ wichtig für /inbox/[username]
    const receiverId = otherUser?.user_id ?? otherUserId;
    if (!receiverId) return;
    if (isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const r = await fetch(sendEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ receiverId, content: text }),
      });

      if (!r.ok) throw new Error(await r.text());
      const json = (await r.json()) as SendResponse;

      const msg = json?.message;
      const createdAt = msg?.created_at ?? new Date().toISOString();

      setItems((prev) => [
        {
          id: msg?.id ?? String(Date.now()),
          sender_id: msg?.sender_id ?? "me",
          content: msg?.content ?? text,
          created_at: createdAt,
          created_at_relative: formatRelativeTime(createdAt),
        },
        ...prev,
      ]);

      setDraft("");
      window.dispatchEvent(new Event("chatlist:refresh"));
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setSendError(m);
    } finally {
      setIsSending(false);
    }
  }, [enabled, draft, inStudio, isSending, otherUser?.user_id, otherUserId, sendEndpoint]);

  const composer: ChatComposerCtx = React.useMemo(
    () => ({ draft, setDraft, send, isSending, error: sendError }),
    [draft, send, isSending, sendError]
  );

  return (
    <DataProvider name={otherUserDataName} data={otherUser}>
      <DataProvider name={dataName} data={items}>
        <DataProvider name={composerDataName} data={composer}>
          {children}
        </DataProvider>
      </DataProvider>
    </DataProvider>
  );
}

export default ChatMessagesShell;