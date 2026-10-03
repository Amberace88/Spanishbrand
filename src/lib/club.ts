/** Club rules (shown on /club and enforced server-side). */
export const SIGNUP_POINTS = 50;
export const POINTS_PER_EURO = 1;
export const REDEEM_POINTS = 100;
export const REDEEM_VALUE = 5;

/* ---------------- Member tiers (display only) ----------------
 * Tiers are a recognition level shown on the member card; they unlock no extra
 * discount. They are based on LIFETIME earned points (signup + orders + birthday +
 * adjustments, net of refunds) so redeeming never drops a member a tier. */
export type TierId = "SOCIO" | "ORO" | "HONOR";
export type Tier = { id: TierId; min: number; label: { es: string; en: string; de: string } };

export const TIERS: readonly Tier[] = [
  { id: "SOCIO", min: 0, label: { es: "Socio", en: "Member", de: "Mitglied" } },
  { id: "ORO", min: 300, label: { es: "Socio de Oro", en: "Gold Member", de: "Gold-Mitglied" } },
  { id: "HONOR", min: 1000, label: { es: "Socio de Honor", en: "Honorary Member", de: "Ehrenmitglied" } },
] as const;

export function tierFor(lifetime: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (lifetime >= x.min) t = x;
  return t;
}

/** Next tier and progress (0..1) towards it; null `next` at the top tier. */
export function tierProgress(lifetime: number): { tier: Tier; next: Tier | null; toNext: number; progress: number } {
  const tier = tierFor(lifetime);
  const idx = TIERS.findIndex((t) => t.id === tier.id);
  const next = TIERS[idx + 1] ?? null;
  if (!next) return { tier, next: null, toNext: 0, progress: 1 };
  const span = next.min - tier.min;
  const done = Math.max(0, lifetime - tier.min);
  return { tier, next, toNext: Math.max(0, next.min - lifetime), progress: Math.min(1, done / span) };
}

/** Progress towards the next redeemable reward. */
export function redeemProgress(points: number): { canRedeem: boolean; rewards: number; value: number; toNext: number; progress: number } {
  const p = Math.max(0, Math.floor(points));
  const rewards = Math.floor(p / REDEEM_POINTS);
  const rem = p % REDEEM_POINTS;
  return {
    canRedeem: rewards > 0,
    rewards,
    value: rewards * REDEEM_VALUE,
    toNext: rewards > 0 ? 0 : REDEEM_POINTS - rem,
    progress: rewards > 0 ? 1 : rem / REDEEM_POINTS,
  };
}

export type LedgerReason = "ORDER" | "REFUND" | "SIGNUP" | "BIRTHDAY" | "ADJUSTMENT" | "REDEEM";

/** Lifetime earned points from ledger rows (redemptions excluded). Falls back to the balance. */
export function lifetimePoints(rows: { points: number; reason: string }[] | null | undefined, balance: number): number {
  if (!rows?.length) return Math.max(0, balance);
  const earned = rows.filter((r) => r.reason !== "REDEEM").reduce((s, r) => s + Number(r.points || 0), 0);
  return Math.max(earned, balance, 0);
}

/** Deterministic decorative pattern for the member card (NOT a scannable code). */
export function memberPattern(seed: string, size = 13): boolean[][] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, size - 5], [size - 5, 0]]) {
      if (r >= fr && r < fr + 5 && c >= fc && c < fc + 5) {
        const rr = r - fr, cc = c - fc;
        return rr === 0 || rr === 4 || cc === 0 || cc === 4 || (rr === 2 && cc === 2);
      }
    }
    return null;
  };
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => finder(r, c) ?? rnd() > 0.52));
}
