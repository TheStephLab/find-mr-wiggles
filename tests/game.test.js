import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../js/game/game.js';
import { centreOn, worldToScreen } from '../js/core/camera.js';
import { SCENES } from '../js/scenes/index.js';
import { fakeContext } from './helpers/fake-canvas.js';

function platform(t) {
  let now = 0, serial = 0;
  const frames = new Map(), timers = [];
  t.mock.method(performance, 'now', () => now);
  t.mock.method(globalThis, 'setTimeout', fn => { timers.push(fn); return timers.length; });
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.document = new EventTarget();
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { this.width = width; this.height = height; }
    getContext() { return fakeContext(); }
  };
  globalThis.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const canvas = Object.assign(new EventTarget(), {
    width: 800, height: 600, getContext: () => fakeContext(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), focus() {},
  });
  const step = (ms = 16) => {
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(fn => fn(now));
  };
  return { canvas, step, timers, frames };
}

test('Classic skips simulation and unchanged rendering, but keeps timer, camera, pause and finding responsive', t => {
  const p = platform(t);
  let result;
  const game = createGame({ canvas: p.canvas, scene: SCENES[4], level: 3, seed: 19, mode: 'classic', onFound: r => { result = r; } });
  let updates = 0;
  game.world.update = () => { updates++; };
  for (let i = 0; i < 200; i++) p.step();
  assert.equal(game.renderStats.needsRefine, false);
  const prepared = game.sprites.stats.rendered;
  const drawn = game.renderStats.frames;
  const target = game.world.wigglesPoint();
  game.start();
  p.step(500);
  assert.equal(game.elapsed, 500, 'wall-clock timer does not discard slow-frame time');
  for (let i = 0; i < 20; i++) p.step();
  assert.equal(game.renderStats.frames, drawn, 'no redraws for an unchanged illustration');
  assert.equal(game.sprites.stats.rendered, prepared, 'no ongoing pose rasterization');
  assert.equal(updates, 0, 'the runtime never calls Classic world simulation');
  game.pause();
  const elapsed = game.elapsed;
  p.step(10000);
  assert.equal(game.elapsed, elapsed);
  game.resume();
  game.zoomBy(2);
  for (let i = 0; i < 200; i++) p.step();
  assert.ok(game.renderStats.frames > drawn, 'camera changes redraw and refine');
  assert.deepEqual(game.world.wigglesPoint(), target, 'camera actions never relocate the target');
  const pose = JSON.stringify(game.world.wiggles);
  centreOn(game.camera, target.x, target.y, 2);
  const point = worldToScreen(game.camera, target.x, target.y);
  for (const type of ['pointerdown', 'pointerup']) p.canvas.dispatchEvent(Object.assign(new Event(type), {
    pointerId: 1, pointerType: 'touch', clientX: point.x, clientY: point.y,
  }));
  assert.equal(game.state, 'found');
  assert.equal(JSON.stringify(game.world.wiggles), pose, 'finding cannot change a frozen pose');
  p.timers.forEach(fn => fn());
  assert.equal(result.mode, 'classic');
  assert.equal(result.difficulty, 3);
  game.destroy();
  assert.equal(p.frames.size, 0);
});

test('Animated gameplay retains live simulation and redraws', t => {
  const p = platform(t);
  const game = createGame({ canvas: p.canvas, scene: SCENES[2], level: 1, seed: 7 });
  let updates = 0;
  game.world.update = () => { updates++; };
  game.start();
  for (let i = 0; i < 10; i++) p.step();
  assert.equal(updates, 10);
  assert.equal(game.renderStats.frames, 10);
  game.destroy();
});

test('keyboard crosshair reaches an illustration edge without changing camera limits or target placement', t => {
  const p = platform(t);
  const game = createGame({ canvas: p.canvas, scene: SCENES[3], level: 1, seed: 1, mode: 'classic' });
  game.start();
  const target = game.world.wigglesPoint();
  centreOn(game.camera, game.camera.worldW, game.camera.worldH / 2, game.camera.maxScale);
  let guessed;
  game.world.isWigglesAt = (x, y) => { guessed = { x, y }; return false; };
  const centre = game.camera.x + game.camera.viewW / game.camera.scale / 2;
  for (const key of ['ArrowRight', 'Enter']) p.canvas.dispatchEvent(Object.assign(new Event('keydown'), { key }));
  assert.ok(guessed.x > centre, 'crosshair can leave the centre when panning reaches the edge');
  assert.equal(game.camera.x, game.camera.worldW - game.camera.viewW / game.camera.scale);
  assert.deepEqual(game.world.wigglesPoint(), target);
  game.destroy();
});
