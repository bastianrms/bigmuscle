// lib/photo/cards.ts

export type PhotoCard = {
  id: string;
  user_id: string;
  username: string | null;

  thumb_url: string | null;
  medium_url: string | null;
  xl_url: string | null;

  like_count: number;
  created_at: string;
};

export type PhotoRowForCard = {
  id: string;
  user_id: string;

  thumb_url: string | null;
  medium_url: string | null;
  xl_url: string | null;

  like_count: number | null;
  created_at: string;
};

export function applyThumbFallback(url: string | null, fallbackUrl?: string): string | null {
  if (url && url.trim()) return url;
  if (fallbackUrl && fallbackUrl.trim()) return fallbackUrl;
  return null;
}

export function mapPhotoRowToPhotoCard(args: {
  row: PhotoRowForCard;
  username: string | null;
  fallbackThumbUrl?: string;
}): PhotoCard {
  const { row, username, fallbackThumbUrl } = args;

  return {
    id: row.id,
    user_id: row.user_id,
    username,

    thumb_url: applyThumbFallback(row.thumb_url, fallbackThumbUrl),
    medium_url: row.medium_url ?? null,
    xl_url: row.xl_url ?? null,

    like_count: Number.isFinite(row.like_count as number) ? (row.like_count as number) : 0,
    created_at: row.created_at,
  };
}