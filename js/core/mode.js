export const MODES = Object.freeze(['animated', 'classic']);
export const normaliseMode = (mode) => mode === 'classic' ? 'classic' : 'animated';
export const modeLabel = (mode) => mode === 'classic' ? 'Classic' : 'Animated';

/** Changing an active puzzle's rules starts a fresh, mode-correct run. */
export function runSettingsKey({ difficulty, reducedMotion, mode }) {
  return `${difficulty}|${Boolean(reducedMotion)}|${normaliseMode(mode)}`;
}
