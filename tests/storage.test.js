import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore, parseState, STORAGE_KEY, formatTime, starsFor } from '../js/core/storage.js';
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
  const store = createProgressStore({ storage: fakeStorage() });
  assert.equal(store.getSettings().difficulty, DEFAULT_LEVEL);
  assert.equal(store.isUnlocked(IDS, 'station'), true);
  assert.equal(store.isUnlocked(IDS, 'airport'), false);
  assert.equal(store.nextSceneId(IDS), 'station');
});

test('corrupt or foreign data falls back to defaults', () => {
  assert.equal(parseState('{not json').version, 1);
  assert.deepEqual(parseState(JSON.stringify({ version: 99, scenes: { x: {} } })).scenes, {});
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
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  const store = createProgressStore({ storage: broken });
  store.recordCompletion('station', { timeMs: 1000, difficulty: 2 });
  assert.equal(store.isCompleted('station'), true);
});

test('formatTime and stars', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65_400), '1:05');
  assert.equal(starsFor({ hintsUsed: 0, misses: 0 }), 3);
  assert.equal(starsFor({ hintsUsed: 1, misses: 3 }), 2);
  assert.equal(starsFor({ hintsUsed: 3, misses: 0 }), 1);
});
