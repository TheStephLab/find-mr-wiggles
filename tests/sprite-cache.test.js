import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fakeContext } from './helpers/fake-canvas.js';
import { WIGGLES_LOOK, createCrowdLook } from '../js/game/people.js';
import { createRng } from '../js/core/rng.js';

let createSpriteCache;
before(async () => {
  globalThis.OffscreenCanvas = class {
    constructor(w, h) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return fakeContext();
    }
  };
  ({ createSpriteCache } = await import('../js/game/sprite-cache.js'));
});

const walk = (phase, dir = 'right') => ({ dir, mode: 'walk', phase, t: 0 });

test('no budget means no new sprites, then a cached sprite is reused', () => {
  const cache = createSpriteCache({ maxPages: 2 });
  cache.beginFrame(0);
  assert.equal(cache.get(WIGGLES_LOOK, walk(0), 2), null, 'nothing cached and no time to render');
  cache.beginFrame(1000);
  const made = cache.get(WIGGLES_LOOK, walk(0), 2);
  assert.ok(made?.entry);
  cache.beginFrame(0);
  const again = cache.get(WIGGLES_LOOK, walk(0), 2);
  assert.equal(again.entry, made.entry);
  assert.equal(cache.stats.rendered, 1);
});

test('left-facing poses mirror the right-facing sprite', () => {
  const cache = createSpriteCache({ maxPages: 2 });
  cache.beginFrame(1000);
  const right = cache.get(WIGGLES_LOOK, walk(0, 'right'), 2);
  const left = cache.get(WIGGLES_LOOK, walk(0, 'left'), 2);
  assert.equal(left.entry, right.entry);
  assert.equal(left.mirror, true);
});

test('over budget, the nearest cached scale or animation frame stands in', () => {
  const cache = createSpriteCache({ maxPages: 2 });
  cache.beginFrame(1000);
  const small = cache.get(WIGGLES_LOOK, walk(0), 1);
  cache.beginFrame(0);
  assert.equal(cache.get(WIGGLES_LOOK, walk(0), 1.6).entry, small.entry, 'different scale bucket');
  assert.equal(cache.get(WIGGLES_LOOK, walk(3), 1).entry, small.entry, 'different walk frame');
  assert.equal(cache.stats.fallbacks, 2);
});

test('very large figures are drawn directly instead of cached', () => {
  const cache = createSpriteCache({ maxPages: 2 });
  cache.beginFrame(1000);
  assert.deepEqual(cache.get(WIGGLES_LOOK, walk(0), 40), { direct: true });
});

test('pages are recycled least-recently-used first, invalidating old sprites', () => {
  const cache = createSpriteCache({ maxPages: 1 });
  const rng = createRng(4);
  cache.beginFrame(1000);
  const first = cache.get(WIGGLES_LOOK, walk(0), 4).entry;
  for (let i = 0; i < 120; i++) cache.get(createCrowdLook(rng, { role: 'commuter' }), walk(i), 4);
  assert.equal(cache.pageCount, 1);
  assert.notEqual(first.page.gen, first.gen, 'the original sprite was evicted');
  const fresh = cache.get(WIGGLES_LOOK, walk(0), 4);
  assert.ok(fresh.entry && fresh.entry.gen === fresh.entry.page.gen, 're-rendered on demand');
});
