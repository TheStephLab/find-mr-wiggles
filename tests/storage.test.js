import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore, parseState, defaultState, STORAGE_KEY, SCHEMA_VERSION, formatTime, starsFor } from '../js/core/storage.js';
import { DEFAULT_LEVEL } from '../js/core/difficulty.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

const IDS = ['station', 'airport', 'fair'];

test('defaults when storage is empty', () => {
  const storage = fakeStorage();
  const store = createProgressStore({ storage });
  assert.deepEqual(store.getState(), {
    version: 3, settings: { difficulty: DEFAULT_LEVEL, reducedMotion: false }, scenes: {},
  });
  assert.equal(SCHEMA_VERSION, 3);
  assert.deepEqual(defaultState(), store.getState());
  assert.equal(store.getSettings().difficulty, DEFAULT_LEVEL);
  assert.equal(store.isUnlocked(IDS, 'station'), true);
  assert.equal(store.isUnlocked(IDS, 'airport'), false);
  assert.equal(store.nextSceneId(IDS), 'station');
  store.setDifficulty(2);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), store.getState());
});

test('corrupt or foreign data falls back to defaults', () => {
  const errors = [];
  const options = { onError: error => errors.push(error) };
  assert.deepEqual(parseState('{not json', options), defaultState());
  assert.deepEqual(parseState(JSON.stringify({ version: 99, scenes: { x: {} } }), options), defaultState());
  assert.equal(errors.length, 2, 'invalid saves are reported, not silently reset');
  assert.ok(errors.every(error => error instanceof Error));
  const s = parseState(JSON.stringify({ version: 1, settings: { difficulty: 42 }, scenes: { station: { completed: 'yes', best: { 3: -5, 2: 1234 } } } }));
  assert.equal(s.settings.difficulty, 5);
  assert.equal(s.scenes.station.completed, true);
  assert.deepEqual(s.scenes.station.best, { 2: 1234 });
});

test('completing a scene unlocks the next and persists', () => {
  const storage = fakeStorage();
  const store = createProgressStore({ storage });
  const res = store.recordCompletion('station', { timeMs: 60000, difficulty: 3 });
  assert.equal(res.isBest, true);
  assert.equal(store.isUnlocked(IDS, 'airport'), true);
  assert.equal(store.isUnlocked(IDS, 'fair'), false);
  assert.equal(store.nextSceneId(IDS), 'airport');
  const reloaded = createProgressStore({ storage });
  assert.equal(reloaded.isCompleted('station'), true);
  assert.equal(reloaded.getScene('station').best[3], 60000);
  assert.ok(storage.map.has(STORAGE_KEY));
});

test('best times are tracked per difficulty', () => {
  const store = createProgressStore({ storage: fakeStorage() });
  store.recordCompletion('station', { timeMs: 50000, difficulty: 3 });
  assert.equal(store.recordCompletion('station', { timeMs: 70000, difficulty: 3 }).isBest, false);
  assert.equal(store.recordCompletion('station', { timeMs: 40000, difficulty: 3 }).isBest, true);
  assert.equal(store.recordCompletion('station', { timeMs: 90000, difficulty: 5 }).isBest, true);
  const rec = store.getScene('station');
  assert.equal(rec.best[3], 40000);
  assert.equal(rec.best[5], 90000);
  assert.equal(rec.plays, 4);
});

test('completed scenes stay replayable and "Play" wraps to the first when all done', () => {
  const store = createProgressStore({ storage: fakeStorage() });
  for (const id of IDS) store.recordCompletion(id, { timeMs: 1000, difficulty: 1 });
  assert.ok(IDS.every((id) => store.isUnlocked(IDS, id)));
  assert.equal(store.nextSceneId(IDS), 'station');
});

test('reset clears progress but keeps settings', () => {
  const store = createProgressStore({ storage: fakeStorage() });
  store.setDifficulty(5);
  store.recordCompletion('station', { timeMs: 1000, difficulty: 5 });
  store.reset();
  assert.equal(store.isCompleted('station'), false);
  assert.equal(store.getSettings().difficulty, 5);
});

test('survives a storage backend that throws', () => {
  const errors = [];
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const store = createProgressStore({ storage: broken, onError: error => errors.push(error) });
  store.recordCompletion('station', { timeMs: 1000, difficulty: 2 });
  assert.equal(store.isCompleted('station'), true);
  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /read/i);
  assert.match(errors[1].message, /save/i);
});

test('unavailable localStorage reports the problem and keeps in-memory play functional', t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('privacy'); } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  });
  const errors = [];
  const store = createProgressStore({ onError: error => errors.push(error) });
  store.setReducedMotion(true);
  store.recordCompletion('station', { timeMs: 1000, difficulty: 2 });
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /unavailable/i);
  assert.equal(store.getSettings().reducedMotion, true);
  assert.equal(store.isUnlocked(IDS, 'airport'), true);
});

test('formatTime and stars', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65_400), '1:05');
  assert.equal(starsFor({ hintsUsed: 0, misses: 0 }), 3);
  assert.equal(starsFor({ hintsUsed: 1, misses: 3 }), 2);
  assert.equal(starsFor({ hintsUsed: 3, misses: 0 }), 1);
});

test('v1 pre-mode progress migrates losslessly and is persisted immediately', () => {
  const record = { completed: true, plays: 7, stars: 3, best: { 1: 1500, 3: 67890 }, lastCompletedAt: '2026-10-22T10:00:00.000Z' };
  const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings: { difficulty: 4, reducedMotion: true }, scenes: { station: record } }) });
  const store = createProgressStore({ storage });
  assert.deepEqual(store.getSettings(), { difficulty: 4, reducedMotion: true });
  assert.deepEqual(store.getScene('station'), record);
  assert.equal(store.nextSceneId(IDS), 'airport');
  assert.equal(store.isUnlocked(IDS, 'airport'), true);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), store.getState());
  const reload = createProgressStore({ storage });
  assert.deepEqual(reload.getState(), store.getState());
});

// Historical strings below only model discarded v2 saves, never playable features.
for (const selected of ['classic', 'animated']) {
  test(`v2 migration preserves only the moving-game history when ${selected} was last selected`, () => {
    const record = { completed: true, plays: 7, stars: 2, best: { 1: 1500, 2: 12345, 3: 67890, 4: 90123, 5: 123456 }, lastCompletedAt: '2026-10-22T10:00:00.000Z' };
    const discarded = { completed: true, plays: 99, stars: 3, best: { 1: 1, 3: 2, 5: 3 }, lastCompletedAt: '2026-10-24T11:00:00.000Z' };
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({
      version: 2,
      settings: { difficulty: 4, reducedMotion: true, mode: selected, obsolete: 'discard' },
      scenes: { fair: discarded },
      modes: { animated: { scenes: { station: record } }, classic: { scenes: { station: discarded, airport: discarded, fair: discarded } } },
    }) });
    const store = createProgressStore({ storage });
    assert.deepEqual(store.getState(), { version: 3, settings: { difficulty: 4, reducedMotion: true }, scenes: { station: record } });
    assert.equal(store.isUnlocked(IDS, 'airport'), true);
    assert.equal(store.isUnlocked(IDS, 'fair'), false);
    assert.equal(store.isCompleted('airport'), false);
    assert.equal(store.nextSceneId(IDS), 'airport');
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), store.getState(), 'no persisted archive or obsolete preferences');
    assert.deepEqual(createProgressStore({ storage }).getState(), store.getState());
    store.recordCompletion('station', { timeMs: 70000, difficulty: 3 });
    assert.equal(store.getScene('station').best[3], 67890);
    assert.equal(store.getScene('station').plays, 8);
    store.reset();
    assert.deepEqual(store.getState(), { version: 3, settings: { difficulty: 4, reducedMotion: true }, scenes: {} });
  });
}

test('v2 missing moving-game records never borrows the discarded history', () => {
  const s = parseState(JSON.stringify({
    version: 2, settings: { mode: 'classic' },
    modes: { classic: { scenes: { station: { completed: true, best: { 3: 1 } } } } },
  }));
  assert.deepEqual(s, defaultState());
});

test('v3 strips obsolete fields instead of resurrecting old histories or preferences', () => {
  const record = { completed: true, plays: 1, stars: 3, best: { 3: 1000 }, lastCompletedAt: null };
  const state = parseState(JSON.stringify({
    version: 3, settings: { difficulty: 2, reducedMotion: false, mode: 'classic' },
    scenes: { station: record }, modes: { animated: { scenes: { fair: record } } },
  }));
  assert.deepEqual(state, { version: 3, settings: { difficulty: 2, reducedMotion: false }, scenes: { station: record } });
});

test('failed migration persistence reports the error and retains the original durable save for retry', () => {
  const original = JSON.stringify({ version: 1, scenes: { station: { completed: true } } });
  const storage = fakeStorage({ [STORAGE_KEY]: original });
  storage.setItem = () => { throw new Error('quota'); };
  const errors = [];
  const store = createProgressStore({ storage, onError: error => errors.push(error) });
  assert.equal(store.isCompleted('station'), true);
  assert.equal(storage.getItem(STORAGE_KEY), original);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /save/i);
});

test('malformed saves are reported without overwriting the original on load', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: '{broken' });
  const errors = [];
  const store = createProgressStore({ storage, onError: error => errors.push(error) });
  assert.deepEqual(store.getState(), defaultState());
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  assert.equal(errors.length, 1);
});

test('settings and records returned to callers cannot mutate saved progress', () => {
  const store = createProgressStore({ storage: fakeStorage() });
  store.recordCompletion('station', { timeMs: 9000, difficulty: 3 });
  store.getSettings().difficulty = 5;
  store.getScene('station').best[3] = 1;
  store.getState().scenes.airport = { completed: true };
  assert.equal(store.getSettings().difficulty, DEFAULT_LEVEL);
  assert.equal(store.getScene('station').best[3], 9000);
  assert.equal(store.isUnlocked(IDS, 'fair'), false);
});
