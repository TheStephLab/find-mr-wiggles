/**
 * Difficulty presets. Higher levels mean a bigger scene, a bigger crowd,
 * more props, more look-alikes (people sharing some of Mr. Wiggles' traits),
 * more people dressed in his colours and a slower hint. Crowd sizes are capped
 * so the game stays smooth on mid-range phones.
 */
export const BASE_WORLD = Object.freeze({ width: 1440, height: 1250 });

export const DIFFICULTIES = Object.freeze([
  { level: 1, id: 'relaxed', label: 'Relaxed', description: 'Small scene, a light crowd and hardly any look-alikes.', sizeScale: 1.0, crowd: 70, propDensity: 0.7, decoyRate: 0.04, maxDecoyTraits: 1, paletteBias: 0.05, hintCooldown: 6000, tapTolerance: 1.4 },
  { level: 2, id: 'easy', label: 'Easy', description: 'Busier, with a few people dressed a bit like him.', sizeScale: 1.25, crowd: 150, propDensity: 0.9, decoyRate: 0.12, maxDecoyTraits: 1, paletteBias: 0.2, hintCooldown: 9000, tapTolerance: 1.1 },
  { level: 3, id: 'normal', label: 'Normal', description: 'Packed, colourful and full of copy-cats. A proper challenge.', sizeScale: 1.55, crowd: 260, propDensity: 1.1, decoyRate: 0.24, maxDecoyTraits: 2, paletteBias: 0.4, hintCooldown: 15000, tapTolerance: 0.85 },
  { level: 4, id: 'tricky', label: 'Tricky', description: 'Huge, heaving and swarming with look-alikes.', sizeScale: 1.8, crowd: 350, propDensity: 1.25, decoyRate: 0.3, maxDecoyTraits: 2, paletteBias: 0.5, hintCooldown: 20000, tapTolerance: 0.75 },
  { level: 5, id: 'expert', label: 'Expert', description: 'Vast crowds where some copy-cats share three of his traits.', sizeScale: 2.0, crowd: 430, propDensity: 1.4, decoyRate: 0.36, maxDecoyTraits: 3, paletteBias: 0.6, hintCooldown: 25000, tapTolerance: 0.65 },
].map(Object.freeze));

export const MIN_LEVEL = 1;
export const MAX_LEVEL = DIFFICULTIES.length;
export const DEFAULT_LEVEL = 3;
export const MAX_CROWD = 480;

export function clampLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return DEFAULT_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n));
}

export function getDifficulty(level) {
  return DIFFICULTIES[clampLevel(level) - 1];
}

/** World dimensions (in world units) for a difficulty and scene aspect (width / depth). */
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
  return Math.max(10, Math.min(MAX_CROWD, Math.round(d.crowd * crowdFactor * perfFactor)));
}
