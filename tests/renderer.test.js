import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fakeContext } from './helpers/fake-canvas.js';
import { createProjection } from '../js/core/projection.js';
import { createCamera, centreOn } from '../js/core/camera.js';
import { createRenderer } from '../js/game/renderer.js';
import { WIGGLES_LOOK } from '../js/game/people.js';
import { SCENES } from '../js/scenes/index.js';
import { createWorld } from '../js/game/world.js';

before(() => {
  Object.defineProperty(globalThis.navigator, 'deviceMemory', { value: 2, configurable: true });
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext() { return fakeContext(); }
  };
});

test('every moving Expert scene stays within the low-memory eight-page atlas limit', () => {
  for (const scene of SCENES) {
    const world = createWorld(scene, { level: 5, seed: 20261024 });
    const canvas = { width: 390, height: 844, getContext: () => fakeContext() };
    const camera = createCamera({ viewW: 390, viewH: 844, worldW: world.pictureWidth, worldH: world.pictureHeight });
    centreOn(camera, world.pictureWidth / 2, world.pictureHeight / 2, camera.minScale * 2.6);
    const renderer = createRenderer(canvas, world, { dpr: 2 });
    renderer.setSpriteBudget(1000, 4);
    for (let frame = 0; frame < 40; frame++) {
      world.update(.05);
      const before = renderer.sprites.stats.rendered;
      renderer.render(camera, world.time);
      assert.ok(renderer.sprites.stats.rendered - before <= 4, 'normal per-frame preparation remains bounded');
    }
    assert.ok(renderer.sprites.stats.rendered > 0);
    assert.ok(renderer.sprites.pageCount <= 8);
    assert.ok(renderer.cachePixels <= 9_010_000 + 6_010_000 + 8 * 1024 ** 2);
  }
});

test('depth sorting does not starve late gameplay figures, including Wiggles', () => {
  const P = createProjection({ width: 400, height: 300, topPad: 80 });
  const world = {
    P, background: '#eadfc4', floor: [], props: [], dynamic: [], floorZ: () => 0,
    agents: Array.from({ length: 12 }, (_, i) => ({
      x: 40 + i * 25, y: 150 + i * 5, z: 0, sortY: 150 + i * 5,
      look: i === 11 ? WIGGLES_LOOK : { ...WIGGLES_LOOK },
      dir: 'right', mode: 'walk', phase: 0, action: null,
    })),
  };
  const canvas = { width: 800, height: 600, getContext: () => fakeContext() };
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  const camera = createCamera({ viewW: 800, viewH: 600, worldW: P.width, worldH: P.height });
  renderer.setSpriteBudget(1000, 1);
  for (let frame = 0; frame < world.agents.length; frame++) {
    for (const agent of world.agents) agent.phase = frame * .9;
    renderer.render(camera, frame / 60);
  }
  renderer.setSpriteBudget(0, 0);
  const misses = renderer.sprites.stats.misses;
  renderer.render(camera, 1);
  assert.equal(renderer.sprites.stats.misses, misses, 'all visible figures have a detailed fallback');
  assert.equal(renderer.sprites.stats.rendered, world.agents.length, 'one shared bounded preparation pass');
});

test('tiny gameplay figures and thumbnails deliberately skip sprite preparation', () => {
  const P = createProjection({ width: 4000, height: 3000, topPad: 80 });
  const world = {
    P, background: '#eadfc4', floor: [], props: [], dynamic: [], floorZ: () => 0,
    agents: [{ x: 2000, y: 1500, sortY: 1500, look: WIGGLES_LOOK, dir: 'down', mode: 'stand', phase: 0 }],
  };
  const canvas = { width: 200, height: 150, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 200, viewH: 150, worldW: P.width, worldH: P.height });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  renderer.render(camera, 0);
  assert.equal(renderer.sprites.stats.rendered, 0);
  const thumb = createRenderer(canvas, world, { dpr: 1, people: 'simple' });
  thumb.render(camera, 0);
  assert.equal(thumb.sprites, null);
  assert.ok(thumb.cachePixels < 502_000, 'five scene-card floors do not allocate full-size gameplay caches');
});

test('scenery receives live simulation time and depth-sorted parts are rebuilt each frame', () => {
  const P = createProjection({ width: 400, height: 300, topPad: 80 });
  const times = [];
  const order = [];
  let partY = 100;
  const world = {
    P, background: '#eadfc4', floor: [], floorZ: () => 0,
    props: [{ sortY: 150, bounds: { x: 0, y: 0, w: P.width, h: P.height }, draw: () => order.push('prop') }],
    dynamic: [
      { draw: (_ctx, time) => times.push(time) },
      { parts: () => [{ sortY: partY, bounds: { x: 0, y: 0, w: P.width, h: P.height }, draw: () => order.push('vehicle') }] },
    ],
    agents: [],
  };
  const canvas = { width: 800, height: 600, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 800, viewH: 600, worldW: P.width, worldH: P.height });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  renderer.render(camera, 1);
  partY = 200;
  renderer.render(camera, 2);
  assert.deepEqual(times, [1, 2]);
  assert.deepEqual(order, ['vehicle', 'prop', 'prop', 'vehicle']);
});

test('moving multi-facing close-up crowds sustain sharp coverage with a slow-frame budget', () => {
  const world = createWorld(SCENES[0], { level: 5, seed: 33 });
  const canvas = { width: 1280, height: 900, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 1280, viewH: 900, worldW: world.pictureWidth, worldH: world.pictureHeight });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  renderer.setSpriteBudget(1000, 48);
  for (let frame = 0; frame < 12; frame++) {
    world.update(.05);
    renderer.render(camera, world.time);
  }
  const point = world.wigglesPoint();
  centreOn(camera, point.x, point.y, 3.5);
  renderer.setSpriteBudget(1000, 1);
  const facings = new Set();
  let visible = 0, degraded = 0;
  for (let frame = 0; frame < 600; frame++) {
    world.update(.05);
    const before = { ...renderer.sprites.stats };
    renderer.render(camera, world.time);
    for (const agent of world.agents) if (agent.state === 'travel') facings.add(agent.dir);
    if (frame >= 240) {
      visible += renderer.sprites.stats.hits - before.hits + renderer.sprites.stats.fallbacks - before.fallbacks + renderer.sprites.stats.misses - before.misses;
      degraded += renderer.sprites.stats.coarseFallbacks - before.coarseFallbacks + renderer.sprites.stats.misses - before.misses;
    }
  }
  assert.ok(facings.size >= 7, 'actual crowd keeps walking and turning');
  assert.ok(visible > 1000, 'measure real on-camera figure draws');
  assert.ok(degraded / visible < .02, `${degraded}/${visible} close-up draws remain coarse or missing`);
  assert.ok(renderer.sprites.pageCount <= 8);
});

for (const [label, dpr, edge] of [['pixel-capped', 2.5, false], ['picture-edge', 1, true]]) {
  test(`settled ${label} floors do not rasterize again every frame`, t => {
    let now = 0, backdropDraws = 0;
    t.mock.method(performance, 'now', () => now);
    const P = createProjection({ width: 4000, height: 3000, topPad: 80 });
    const world = {
      P, background: '#eadfc4', floor: [], props: [], dynamic: [], agents: [], floorZ: () => 0,
      backdrop: () => backdropDraws++,
    };
    const canvas = { width: 1280 * dpr, height: 900 * dpr, getContext: () => fakeContext() };
    const renderer = createRenderer(canvas, world, { dpr });
    const camera = createCamera({ viewW: 1280, viewH: 900, worldW: P.width, worldH: P.height });
    centreOn(camera, edge ? 0 : P.width / 2, edge ? 0 : P.height / 2, 3);
    renderer.render(camera, 0);
    now = 200;
    renderer.render(camera, 1);
    const settled = backdropDraws;
    assert.equal(settled, 2, 'base and one sharp visible-region floor');
    for (let frame = 0; frame < 20; frame++) {
      now += 50;
      renderer.render(camera, frame + 2);
    }
    assert.equal(backdropDraws, settled);
  });
}

test('explicitly static props reuse sharp artwork while live props keep animating', () => {
  const P = createProjection({ width: 400, height: 300, topPad: 80 });
  let staticDraws = 0;
  const liveTimes = [];
  const world = {
    P, background: '#eadfc4', floor: [], dynamic: [], agents: [], floorZ: () => 0,
    props: [
      { cache: true, bounds: { x: 100, y: 100, w: 40, h: 60 }, sortY: 120, draw: () => staticDraws++ },
      { bounds: { x: 100, y: 100, w: 40, h: 60 }, sortY: 150, draw: (_ctx, t) => liveTimes.push(t) },
    ],
  };
  const canvas = { width: 800, height: 600, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 800, viewH: 600, worldW: P.width, worldH: P.height });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  for (let frame = 0; frame < 10; frame++) renderer.render(camera, frame);
  assert.equal(staticDraws, 1, 'unchanged structures do not repeat vector fills every frame');
  assert.deepEqual(liveTimes, Array.from({ length: 10 }, (_, i) => i), 'clock/booth/gate state remains live by default');
  camera.scale *= 2;
  renderer.render(camera, 10);
  assert.equal(staticDraws, 2, 'zooming regenerates sufficient pixel density');
  renderer.invalidate();
  renderer.render(camera, 11);
  assert.equal(staticDraws, 3, 'invalidation discards static artwork too');
});

test('static scenery preparation is bounded and does not evict other visible props in a loop', () => {
  const P = createProjection({ width: 4000, height: 3000, topPad: 80 });
  const world = {
    P, background: '#eadfc4', floor: [], dynamic: [], agents: [], floorZ: () => 0,
    props: Array.from({ length: 20 }, (_, i) => ({
      cache: true, bounds: { x: 20, y: 20, w: 400, h: 400 }, sortY: i, draw() {},
    })),
  };
  const canvas = { width: 1200, height: 1000, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 1200, viewH: 1000, worldW: P.width, worldH: P.height });
  camera.scale = 1;
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  let settled;
  for (let frame = 0; frame < 30; frame++) {
    const before = renderer.stats.propRasters;
    renderer.render(camera, frame);
    assert.ok(renderer.stats.propRasters - before <= 2);
    assert.ok(renderer.propCachePixels <= 2_000_000);
    if (frame === 15) settled = renderer.stats.propRasters;
  }
  assert.ok(settled > 0);
  assert.equal(renderer.stats.propRasters, settled, 'visible cache entries remain pinned when capacity is full');
});

test('static text artwork is not retained while its first draw starts a font load', t => {
  const original = globalThis.document;
  const document = { fonts: { status: 'loaded' } };
  globalThis.document = document;
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
  const P = createProjection({ width: 400, height: 300, topPad: 80 });
  let draws = 0;
  const world = {
    P, background: '#eadfc4', floor: [], dynamic: [], agents: [], floorZ: () => 0,
    props: [{
      cache: true, bounds: { x: 100, y: 100, w: 40, h: 60 }, sortY: 120,
      draw() { if (++draws === 1) document.fonts.status = 'loading'; },
    }],
  };
  const canvas = { width: 800, height: 600, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 800, viewH: 600, worldW: P.width, worldH: P.height });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  renderer.render(camera, 0);
  assert.equal(renderer.propCachePixels, 0, 'fallback lettering is not frozen into a bitmap');
  document.fonts.status = 'loaded';
  renderer.render(camera, 1);
  assert.ok(renderer.propCachePixels > 0);
  renderer.render(camera, 2);
  assert.equal(draws, 3, 'loaded artwork is reused');
});
