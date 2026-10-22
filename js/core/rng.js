/**
 * Small, fast, seedable PRNG (mulberry32) with convenience helpers.
 * Seeding lets a scene be reproduced exactly (useful for tests and thumbnails),
 * while gameplay uses a fresh random seed so Mr. Wiggles moves every time.
 */
export function createRng(seed = randomSeed()) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed: seed >>> 0,
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max] (inclusive). */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    /** entries: Array<[item, weight]> */
    weighted(entries) {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [item, weight] of entries) {
        roll -= weight;
        if (roll < 0) return item;
      }
      return entries[entries.length - 1][0];
    },
    /** Returns a shuffled copy. */
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}
