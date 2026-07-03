// Deterministic shuffle used to present `ordering` questions without leaking the
// correct sequence. The permutation is derived purely from the question id, so it
// is stable across reconnects and re-scoring without any per-session state.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Permutation for `n` items seeded by `seed`. Returns an array `perm` where
 * `perm[displaySlot]` is the original index shown at that slot. For n > 1 the
 * result is guaranteed to differ from the identity so the answer isn't revealed
 * by leaving items in place.
 */
export function seededPerm(n: number, seed: number): number[] {
  if (n <= 1) return Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32(seed + 1);
  for (let attempt = 0; attempt < 8; attempt++) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.some((v, i) => v !== i)) return a;
  }
  // Fallback: rotate by one so it is never the identity.
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}
