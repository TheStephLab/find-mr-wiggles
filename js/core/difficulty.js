/**
 * Difficulty presets. Higher levels mean a bigger scene, a bigger crowd,
 * more props and more "decoys" (people sharing one or two of Mr. Wiggles' traits).
 * Crowd sizes are capped so the game stays smooth on mid-range phones.
 */
export const BASE_WORLD = Object.freeze({ width: 1600, height: 1000 });

export const DIFFICULTIES = Object.freeze([
  { level: 1, id: 'relaxed', label: 'Relaxed', description: 'Small scene, a light crowd and no look-alikes.', sizeScale: 1.0, crowd: 45, propDensity: 0.6, decoyRate: 0, maxDecoyTraits: 0 },
  { level: 2, id: 'easy', label: 'Easy', description: 'A little busier, with the odd look-alike.', sizeScale: 1.2, crowd: 85, propDensity: 0.8, decoyRate: 0.04, maxDecoyTraits: 1 },
  { level: 3, id: 'normal', label: 'Normal', description: 'A proper bustle. Keep your eyes peeled!', sizeScale: 1.45, crowd: 140, propDensity: 1.0, decoyRate: 0.08, maxDecoyTraits: 1 },
  { level: 4, id: 'tricky', label: 'Tricky', description: 'Large, crowded and full of copy-cats.', sizeScale: 1.7, crowd: 210, propDensity: 1.2, decoyRate: 0.12, maxDecoyTraits: 2 },
  { level: 5, id: 'expert', label: 'Expert', description: 'Huge and heaving. Only for master spotters.', sizeScale: 2.0, crowd: 290, propDensity: 1.4, decoyRate: 0.16, maxDecoyTraits: 2 },
].map(Object.freeze));

export const MIN_LEVEL = 1;
export const MAX_LEVEL = DIFFICULTIES.length;
export const DEFAULT_LEVEL = 3;

export function clampLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return DEFAULT_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n));
}

export function getDifficulty(level) {
  return DIFFICULTIES[clampLevel(level) - 1];
}

/** World dimensions (in world units) for a difficulty and optional scene aspect override. */
export function worldSize(difficulty, aspect = BASE_WORLD.width / BASE_WORLD.height) {
  const d = typeof difficulty === 'number' ? getDifficulty(difficulty) : difficulty;
  const height = Math.round(BASE_WORLD.height * d.sizeScale);
  return { width: Math.round(height * aspect), height };
}

/**
 * Crowd size for a scene. `crowdFactor` lets busy scenes ask for more people and
 * `perfFactor` (0..1) lets low-powered devices ask for fewer.
 */
export function crowdSize(difficulty, { crowdFactor = 1, perfFactor = 1 } = {}) {
  const d = typeof difficulty === 'number' ? getDifficulty(difficulty) : difficulty;
  return Math.max(10, Math.min(360, Math.round(d.crowd * crowdFactor * perfFactor)));
}
