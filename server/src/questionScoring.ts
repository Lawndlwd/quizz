function norm(s: string): string {
  return s.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Parse a JSON value that should be a string array; returns [] on anything else. */
export function parseStringArray(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? '');
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/** Count how many blanks the player got right (case/space-insensitive). */
export function matchFillBlank(
  submitted: string[],
  blanks: string[][],
): { matched: number; total: number } {
  const total = blanks.length;
  let matched = 0;
  for (let i = 0; i < total; i++) {
    const accepted = (blanks[i] ?? []).map(norm).filter((s) => s.length > 0);
    const given = norm(submitted[i] ?? '');
    if (given.length > 0 && accepted.includes(given)) matched++;
  }
  return { matched, total };
}

/**
 * Score an ordering answer. `order[k]` is the display slot the player placed at
 * final position k; `perm[slot]` is the original index shown at that slot. The
 * item is in its correct place when `perm[order[k]] === k`.
 */
export function scoreOrdering(
  order: number[],
  perm: number[],
): { matched: number; total: number } {
  const total = perm.length;
  if (order.length !== total) return { matched: 0, total };
  const seen = new Set<number>();
  let matched = 0;
  for (let k = 0; k < total; k++) {
    const slot = order[k];
    if (!Number.isInteger(slot) || slot < 0 || slot >= total || seen.has(slot)) {
      return { matched: 0, total };
    }
    seen.add(slot);
    if (perm[slot] === k) matched++;
  }
  return { matched, total };
}

interface LatLng {
  lat: number;
  lng: number;
}

export function parseLatLng(raw: string | null | undefined): LatLng | null {
  try {
    const v = JSON.parse(raw ?? '');
    if (v && typeof v.lat === 'number' && typeof v.lng === 'number') {
      return { lat: v.lat, lng: v.lng };
    }
  } catch {
    /* not a lat/lng */
  }
  return null;
}

/** Great-circle distance in kilometres between two lat/lng points. */
export function geoDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Speed bonus for a fully-correct answer. The first correct answerer gets
 * `maxBonus`, the last possible one gets `minBonus`, interpolated linearly by
 * how many players answered correctly before this one (`correctCountBefore`,
 * i.e. read before this answer is counted). The result is clamped at
 * `minBonus`; with a single player the bonus is always `maxBonus`.
 */
export function computeSpeedBonus(
  correctCountBefore: number,
  totalPlayers: number,
  maxBonus: number,
  minBonus: number,
): number {
  const bonus =
    totalPlayers <= 1
      ? maxBonus
      : Math.round(maxBonus - (maxBonus - minBonus) * (correctCountBefore / (totalPlayers - 1)));
  return Math.max(bonus, minBonus);
}

/**
 * GeoGuessr-style scoring by real great-circle distance. A pin within ~50 km is
 * fully correct (base + speed bonus); otherwise the score decays exponentially
 * with distance (~37% of base at 1500 km), so closer always beats farther.
 */
export function scoreGeo(
  guess: LatLng,
  correct: LatLng,
  baseScore: number,
  correctCount: number,
  totalPlayers: number,
  speedBonusMax: number,
  speedBonusMin: number,
): { score: number; isCorrect: boolean; distanceKm: number } {
  const distanceKm = geoDistanceKm(guess, correct);
  const isCorrect = distanceKm <= 50;

  if (isCorrect) {
    const bonus = computeSpeedBonus(correctCount, totalPlayers, speedBonusMax, speedBonusMin);
    return { score: baseScore + bonus, isCorrect: true, distanceKm };
  }

  const score = Math.round(baseScore * Math.exp(-distanceKm / 1500));
  return { score, isCorrect: false, distanceKm };
}
