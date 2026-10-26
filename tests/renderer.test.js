import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fakeContext } from './helpers/fake-canvas.js';
import { createProjection } from '../js/core/projection.js';
import { createCamera } from '../js/core/camera.js';
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

test('every Expert Classic overview converges with the low-memory eight-page atlas limit', () => {
  for (const scene of SCENES) {
    const world = createWorld(scene, { mode: 'classic', level: 5, seed: 20261024 });
    const canvas = { width: 390, height: 844, getContext: () => fakeContext() };
    const camera = createCamera({ viewW: 390, viewH: 844, worldW: world.pictureWidth, worldH: world.pictureHeight });
    const renderer = createRenderer(canvas, world, { dpr: 2 });
    renderer.setSpriteBudget(1000, 48);
    for (let frame = 0; frame < 200; frame++) {
      renderer.render(camera, world.time);
      if (!renderer.needsRefine) break;
    }
    assert.equal(renderer.needsRefine, false, `${scene.id} fits the bounded atlas without indefinite cache churn`);
    assert.ok(renderer.sprites.pageCount <= 8);
    const rendered = renderer.sprites.stats.rendered;
    renderer.render(camera, 999);
    assert.equal(renderer.sprites.stats.rendered, rendered);
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

test('Classic keeps full-detail tiny figures and passes frozen time to scenery even when UI time changes', () => {
  const P = createProjection({ width: 4000, height: 3000, topPad: 80 });
  const times = [];
  const world = {
    mode: 'classic', time: 12.5, P, background: '#eadfc4', floor: [], props: [], floorZ: () => 0,
    dynamic: [{ draw: (_ctx, time) => times.push(time) }],
    agents: [{ x: 2000, y: 1500, sortY: 1500, look: WIGGLES_LOOK, dir: 'down', mode: 'stand', phase: 0, poseTime: 15 }],
  };
  const canvas = { width: 200, height: 150, getContext: () => fakeContext() };
  const camera = createCamera({ viewW: 200, viewH: 150, worldW: P.width, worldH: P.height });
  const renderer = createRenderer(canvas, world, { dpr: 1 });
  renderer.setSpriteBudget(1000, 10);
  renderer.render(camera, 0);
  const rendered = renderer.sprites.stats.rendered;
  assert.equal(rendered, 1, 'Classic never switches the crowd to block figures at overview scale');
  assert.equal(renderer.needsRefine, false);
  renderer.render(camera, 9999);
  assert.deepEqual(times, [12.5, 12.5]);
  assert.equal(renderer.sprites.stats.rendered, rendered, 'unchanged poses do not rasterize new frames');
  assert.ok(renderer.cachePixels <= 9_010_000 + 20 * 1024 ** 2);
});
