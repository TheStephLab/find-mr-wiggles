import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProjection, projectBox } from '../js/core/projection.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const P = createProjection({ width: 2000, height: 1600, sFar: 0.64, tilt: 0.86, topPad: 200, bottomPad: 20 });

test('scale is 1 at the near edge and sFar at the far edge', () => {
  near(P.s(1600), 1);
  near(P.s(0), 0.64);
  assert.ok(P.s(800) > 0.64 && P.s(800) < 1);
});

test('far things converge towards the centre line', () => {
  near(P.X(1000, 0), 1000);
  near(P.X(0, 1600), 0);
  assert.ok(P.X(0, 0) > 0, 'far-left corner is pulled inwards');
  assert.ok(P.X(2000, 0) < 2000, 'far-right corner is pulled inwards');
});

test('ground rows are foreshortened, more so further away', () => {
  const nearRow = P.Y(1600) - P.Y(1590);
  const farRow = P.Y(10) - P.Y(0);
  near(nearRow / 10, 0.86, 0.01);
  assert.ok(farRow < nearRow * 0.5);
  assert.ok(P.Y(0) >= 200 - 1e-6);
  assert.ok(P.height >= P.Y(1600) + 20);
});

test('heights rise upwards in proportion to depth scale', () => {
  near(P.Y(1600, 40), P.Y(1600) - 40);
  near(P.Y(0, 40), P.Y(0) - 40 * 0.64);
});

test('yAt and xAt invert the projection', () => {
  for (const z of [0, 56]) {
    for (const y of [0, 300, 900, 1600]) near(P.yAt(P.Y(y, z), z), y, 1e-6);
  }
  near(P.xAt(P.X(321, 777), 777), 321);
});

test('projectBox covers every projected corner', () => {
  const r = projectBox(P, { x: 100, y: 200, w: 50, d: 30, h: 80, z: 10 });
  for (const [x, y, z] of [[100, 200, 10], [150, 230, 90]]) {
    const [px, py] = P.pt(x, y, z);
    assert.ok(px >= r.x - 1e-9 && px <= r.x + r.w + 1e-9 && py >= r.y - 1e-9 && py <= r.y + r.h + 1e-9);
  }
});
