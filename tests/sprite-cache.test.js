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

test('a positive one-sprite budget cannot permanently reject a large detailed figure', () => {
  const cache = createSpriteCache();
  cache.beginFrame(2, 1);
  assert.ok(cache.get(WIGGLES_LOOK, walk(0), 7)?.entry);
  assert.equal(cache.get({ ...WIGGLES_LOOK }, walk(0), 7), null, 'count limit is still enforced');
});

test('coverage is prepared before early characters consume the budget on animation', () => {
  const cache = createSpriteCache();
  const rng = createRng(21);
  const looks = Array.from({ length: 24 }, () => createCrowdLook(rng, { role: 'commuter' }));
  for (let i = 0; i < looks.length; i++) {
    cache.beginFrame(1000, 1);
    const requests = looks.map((look) => ({ look, pose: walk(i), q: 1 }));
    cache.prepare(requests);
  }
  cache.beginFrame(0);
  for (const look of looks) assert.ok(cache.get(look, walk(24), 1)?.entry, 'every look has detailed coverage');
});

test('preparation rotates equal-priority requests instead of freezing late walkers', () => {
  const cache = createSpriteCache();
  const looks = [WIGGLES_LOOK, { ...WIGGLES_LOOK }, { ...WIGGLES_LOOK }];
  cache.beginFrame(1000);
  for (const look of looks) cache.get(look, walk(0), 1);
  for (let i = 0; i < looks.length; i++) {
    cache.beginFrame(1000, 1);
    cache.prepare(looks.map((look) => ({ look, pose: walk(1 + i * .9), q: 1 })));
  }
  assert.equal(cache.stats.rendered, 6);
  cache.beginFrame(0);
  assert.equal(cache.get(looks[2], walk(2.8), 1).entry.bucket, 0);
  assert.equal(cache.stats.fallbacks, 0, 'the last walker received its current frame');
});

test('fallbacks never restore a removed suitcase or replace the current action', () => {
  const cache = createSpriteCache();
  const look = { ...WIGGLES_LOOK, carry: { type: 'suitcase', color: '#123456' } };
  cache.beginFrame(1000);
  cache.get(look, walk(0), 1);
  look.carry = null;
  cache.beginFrame(0);
  assert.equal(cache.get(look, walk(0), 1), null);
  cache.beginFrame(1000);
  assert.ok(cache.get(look, walk(0), 1)?.entry);
  cache.beginFrame(0);
  assert.equal(cache.get(look, { ...walk(0), action: 'wave' }, 1), null);
});

test('exact sprites never start below the requested pixel density', () => {
  const cache = createSpriteCache();
  cache.beginFrame(1000);
  const hit = cache.get(WIGGLES_LOOK, walk(0), 1.1);
  assert.ok(2 ** (hit.entry.bucket / 3) >= 1.1);
});
