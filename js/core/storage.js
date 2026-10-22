import { clampLevel, DEFAULT_LEVEL } from './difficulty.js';

/**
 * Local-only progress persistence (no accounts). Everything lives under one
 * versioned localStorage key and degrades to in-memory storage when
 * localStorage is unavailable (e.g. private browsing or blocked cookies).
 */
export const STORAGE_KEY = 'find-mr-wiggles:progress';
export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    settings: { difficulty: DEFAULT_LEVEL, reducedMotion: false },
    scenes: {},
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    const ls = globalThis.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

function sanitiseSceneRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const best = {};
  if (raw.best && typeof raw.best === 'object') {
    for (const [level, ms] of Object.entries(raw.best)) {
      const lv = clampLevel(level);
      if (Number.isFinite(ms) && ms > 0) best[lv] = Math.round(ms);
    }
  }
  return {
    completed: Boolean(raw.completed),
    plays: Number.isFinite(raw.plays) && raw.plays >= 0 ? Math.floor(raw.plays) : 0,
    best,
    stars: Number.isFinite(raw.stars) ? Math.min(3, Math.max(0, Math.floor(raw.stars))) : 0,
    lastCompletedAt: typeof raw.lastCompletedAt === 'string' ? raw.lastCompletedAt : null,
  };
}

/** Parse + validate unknown JSON into a well-formed state. Never throws. */
export function parseState(json) {
  const state = defaultState();
  if (!json) return state;
  let raw;
  try {
    raw = JSON.parse(json);
  } catch {
    return state;
  }
  if (!raw || typeof raw !== 'object' || raw.version !== SCHEMA_VERSION) return state;
  if (raw.settings && typeof raw.settings === 'object') {
    state.settings.difficulty = clampLevel(raw.settings.difficulty ?? DEFAULT_LEVEL);
    state.settings.reducedMotion = Boolean(raw.settings.reducedMotion);
  }
  if (raw.scenes && typeof raw.scenes === 'object') {
    for (const [id, rec] of Object.entries(raw.scenes)) {
      const clean = sanitiseSceneRecord(rec);
      if (clean) state.scenes[id] = clean;
    }
  }
  return state;
}

export function starsFor({ hintsUsed = 0, misses = 0 } = {}) {
  if (hintsUsed === 0 && misses <= 2) return 3;
  if (hintsUsed <= 1 && misses <= 6) return 2;
  return 1;
}

export function createProgressStore({ storage, key = STORAGE_KEY } = {}) {
  const backend = resolveStorage(storage);
  let state = parseState(safeGet(backend, key));

  function persist() {
    try {
      backend.setItem(key, JSON.stringify(state));
    } catch {
      /* Quota or privacy errors: keep playing with in-memory state. */
    }
  }

  return {
    getState: () => structuredClone(state),
    getSettings: () => ({ ...state.settings }),

    setDifficulty(level) {
      state.settings.difficulty = clampLevel(level);
      persist();
      return state.settings.difficulty;
    },

    setReducedMotion(on) {
      state.settings.reducedMotion = Boolean(on);
      persist();
    },

    getScene(id) {
      return state.scenes[id] ? structuredClone(state.scenes[id]) : null;
    },

    isCompleted: (id) => Boolean(state.scenes[id]?.completed),

    /** Scenes unlock in order: the first is always open; each completion opens the next. */
    isUnlocked(sceneIds, id) {
      const index = sceneIds.indexOf(id);
      if (index < 0) return false;
      if (index === 0 || state.scenes[id]?.completed) return true;
      return Boolean(state.scenes[sceneIds[index - 1]]?.completed);
    },

    /** The scene "Play" should launch: first incomplete unlocked scene, else the first. */
    nextSceneId(sceneIds) {
      for (const id of sceneIds) {
        if (!state.scenes[id]?.completed) return this.isUnlocked(sceneIds, id) ? id : sceneIds[0];
      }
      return sceneIds[0];
    },

    recordCompletion(id, { timeMs, difficulty, hintsUsed = 0, misses = 0, now = new Date() }) {
      const level = clampLevel(difficulty);
      const rec = state.scenes[id] ?? { completed: false, plays: 0, best: {}, stars: 0, lastCompletedAt: null };
      const previousBest = rec.best[level];
      const isBest = !previousBest || timeMs < previousBest;
      const stars = starsFor({ hintsUsed, misses });
      rec.completed = true;
      rec.plays += 1;
      if (isBest) rec.best[level] = Math.round(timeMs);
      rec.stars = Math.max(rec.stars, stars);
      rec.lastCompletedAt = now.toISOString();
      state.scenes[id] = rec;
      persist();
      return { isBest, stars, previousBest: previousBest ?? null };
    },

    reset() {
      const { settings } = state;
      state = defaultState();
      state.settings = { ...settings };
      persist();
    },
  };
}

function safeGet(backend, key) {
  try {
    return backend.getItem(key);
  } catch {
    return null;
  }
}

export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
