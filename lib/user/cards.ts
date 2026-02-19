// lib/user/cards.ts

export type UnitSystem = "metric" | "imperial";

export type UserCard = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;

  country: string | null;
  city: string | null;

  height_cm: number | null;
  weight_kg: number | null;

  // Viewer bestimmt Anzeige:
  unit_system: UnitSystem;
  height_display: string | null;
  weight_display: string | null;
};

export type UserRowForCard = {
  user_id: string;
  username: string | null;
  thumb_url: string | null;

  country: string | null;
  city: string | null;

  height_cm: number | null;
  weight_kg: number | null;

  // Optional in Selects – wird nicht fürs Display benutzt, weil Viewer entscheidet.
  unit_system?: UnitSystem | null;
};

export function normalizeUnitSystem(v: unknown): UnitSystem {
  return v === "imperial" ? "imperial" : "metric";
}

export function toWeightDisplay(unit: UnitSystem, weightKg: number | null): string | null {
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null;

  if (unit === "imperial") {
    const lbs = Math.round(weightKg * 2.2046226218);
    return `${lbs} lb`;
  }

  return `${Math.round(weightKg)} kg`;
}

export function toHeightDisplay(unit: UnitSystem, heightCm: number | null): string | null {
  if (heightCm == null || !Number.isFinite(heightCm) || heightCm <= 0) return null;

  if (unit === "imperial") {
    const totalIn = heightCm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    return `${ft}'${inch}"`;
  }

  return `${Math.round(heightCm)} cm`;
}

export function mapUserRowToUserCard(row: UserRowForCard, viewerUnit: UnitSystem): UserCard {
  return {
    user_id: row.user_id,
    username: row.username ?? null,
    thumb_url: row.thumb_url ?? null,

    country: row.country ?? null,
    city: row.city ?? null,

    height_cm: row.height_cm ?? null,
    weight_kg: row.weight_kg ?? null,

    unit_system: viewerUnit,
    height_display: toHeightDisplay(viewerUnit, row.height_cm ?? null),
    weight_display: toWeightDisplay(viewerUnit, row.weight_kg ?? null),
  };
}

export function applyThumbFallback(card: UserCard, fallbackThumbUrl?: string): UserCard {
  const fb = (fallbackThumbUrl ?? "").trim();
  if (!fb) return card;

  const current = (card.thumb_url ?? "").trim();
  if (current) return card;

  return { ...card, thumb_url: fb };
}

export function applyThumbFallbackList(items: UserCard[], fallbackThumbUrl?: string): UserCard[] {
  const fb = (fallbackThumbUrl ?? "").trim();
  if (!fb) return items;
  return items.map((it) => applyThumbFallback(it, fb));
}