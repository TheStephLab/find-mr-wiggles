import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fakeContext } from './helpers/fake-canvas.js';
import { createProjection } from '../js/core/projection.js';
import { drawAircraft, drawMainlineCar, drawMetroCar, AIRCRAFT_BOUNDS } from '../js/scenes/transport.js';
import { SCENES } from '../js/scenes/index.js';
import { createWorld } from '../js/game/world.js';

const rasters = [];
before(() => {
  globalThis.OffscreenCanvas = class {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.ctx = fakeContext();
      rasters.push(this);
    }
    getContext() { return this.ctx; }
  };
});

function record() {
  const calls = [];
  const ctx = fakeContext();
  return {
    calls,
    ctx: new Proxy(ctx, {
      get(target, name) {
        const value = target[name];
        return typeof value === 'function' ? (...args) => {
          calls.push([name, ...args]);
          return value(...args);
        } : value;
      },
    }),
  };
}

const P = createProjection({ width: 1600, height: 1400 });

test('aircraft reuse static artwork with a separate correctly lettered mirrored view', () => {
  const airline = { name: 'Puffin Air', body: '#fffaf0', stripe: '#2d6b87', tail: '#e79b47' };
  const { ctx, calls } = record();
  const count = rasters.length;
  drawAircraft(ctx, .8, 1, airline);
  const raster = rasters.at(-1);
  assert.ok(raster.ctx.calls > 200, 'full fuselage, wings, gear, windows and engine artwork');
  drawAircraft(ctx, .95, 1, airline);
  assert.equal(rasters.length, count + 1, 'moving/rescaling the plane does not repaint it');
  assert.equal(calls.filter(([name]) => name === 'drawImage').length, 2);
  assert.equal(calls[0][1], calls[1][1], 'both draws use the same raster');
  drawAircraft(ctx, .95, -1, airline);
  assert.equal(rasters.length, count + 2, 'opposite view has independently readable lettering');
  assert.ok(AIRCRAFT_BOUNDS.x <= -131 && AIRCRAFT_BOUNDS.y <= -88);
  assert.ok(AIRCRAFT_BOUNDS.y + AIRCRAFT_BOUNDS.h >= 14, 'near wing and wheels fit');
});

test('metro body stays cached while both pairs of doors slide independently of the artwork', () => {
  const args = { x: 200, y0: 1300, y1: 1370, z: -24, lead: true, number: 2 };
  const closed = record();
  drawMetroCar(closed.ctx, P, { ...args, doors: 0 });
  const count = rasters.length;
  const open = record();
  drawMetroCar(open.ctx, P, { ...args, doors: 1 });
  assert.equal(rasters.length, count, 'door animation does not rebuild body artwork');
  const blit = (r) => r.calls.find(([name]) => name === 'drawImage')[1];
  assert.equal(blit(closed), blit(open));
  const panels = (r) => r.calls.filter(([name]) => name === 'fillRect').map((a) => a.slice(1));
  assert.notDeepEqual(panels(closed), panels(open), 'door panels move');
  assert.equal(closed.calls.filter(([name]) => name === 'clip').length, 2, 'two door pockets');
});

test('mainline cabs, coach ends, doors and bogies draw at either side of the vanishing point', () => {
  for (const x of [200, 777, 1300]) {
    for (const lead of [false, true]) {
      for (const doors of [0, .5, 1]) {
        for (const length of [6, 104]) {
          const c = fakeContext();
          drawMainlineCar(c, P, {
            x, y0: 200, y1: 200 + length, w: 46, h: 48, z: 42, lead, doors,
            livery: { roof: '#2f7d4f', stripe: '#f2e3b3', front: '#f2c230' },
          });

          assert.ok(c.calls > 40);
        }
      }
    }
  }
});

test('metro edge clipping includes the side body, not just its roof', () => {
  const world = createWorld(SCENES[0], { level: 3, seed: 20261022 });
  for (let i = 0; i < 150; i++) world.dynamic.forEach(d => d.update?.(.1, i * .1));
  const part = world.dynamic.flatMap(d => d.parts?.() ?? []).find(p => p.sortY > world.height * .9);
  assert.ok(part);
  const { ctx, calls } = record();
  part.draw(ctx);
  const clip = calls.slice(0, calls.findIndex(([name]) => name === 'clip'))
    .filter(([name]) => name === 'moveTo' || name === 'lineTo').map(([, x, y]) => [x, y]);
  const point = world.P.pt(world.width / 2, world.height - 10, -4);
  let inside = false;
  for (let i = 0, j = clip.length - 1; i < clip.length; j = i++) {
    const [xi, yi] = clip[i], [xj, yj] = clip[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  assert.ok(inside, 'passenger windows and doors must not be clipped away');
});

for (const scene of SCENES.slice(0, 2)) {
  test(`${scene.title}: transport keeps moving, culling and drawing through arrival/dwell/departure cycles`, () => {
    const world = createWorld(scene, { level: 3, seed: 20261022 });
    const seen = new Set();
    const c = fakeContext();
    for (let step = 0; step < 2400; step++) {
      for (const dynamic of world.dynamic) dynamic.update?.(.05, step * .05);
      if (step % 20 !== 0) continue;
      for (const dynamic of world.dynamic) {
        for (const part of dynamic.parts?.() ?? []) {
          for (const value of Object.values(part.bounds)) assert.ok(Number.isFinite(value));
          assert.ok(part.bounds.w > 0 && part.bounds.h > 0);
          assert.ok(Number.isFinite(part.sortY));
          seen.add(`${Math.round(part.bounds.x)},${Math.round(part.bounds.y)}`);
          part.draw(c, step * .05, world.P);
        }
      }
    }
    assert.ok(seen.size > 100, 'transport moves rather than becoming static decoration');
  });
}
