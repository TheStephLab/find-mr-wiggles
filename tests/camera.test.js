import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, zoomAt, panBy, screenToWorld, resizeCamera, pinTo, centreOn, visibleRect } from '../js/core/camera.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('starts fitted and centred', () => {
  const cam = createCamera({ viewW: 800, viewH: 800, worldW: 1600, worldH: 1000 });
  near(cam.scale, 0.5);
  near(cam.x, 0);
  // vertical slack is centred
  near(cam.y, -(800 / 0.5 - 1000) / 2);
});

test('zoomAt keeps the anchor point fixed', () => {
  const cam = createCamera({ viewW: 800, viewH: 600, worldW: 1600, worldH: 1000 });
  zoomAt(cam, 400, 300, 2);
  const before = screenToWorld(cam, 250, 200);
  zoomAt(cam, 250, 200, 1.7);
  const after = screenToWorld(cam, 250, 200);
  near(before.x, after.x, 1e-3);
  near(before.y, after.y, 1e-3);
});

test('scale is clamped to [min, max]', () => {
  const cam = createCamera({ viewW: 800, viewH: 600, worldW: 1600, worldH: 1000 });
  zoomAt(cam, 0, 0, 0.01);
  near(cam.scale, cam.minScale);
  zoomAt(cam, 0, 0, 1e6);
  near(cam.scale, cam.maxScale);
});

test('panning cannot leave the world', () => {
  const cam = createCamera({ viewW: 800, viewH: 600, worldW: 1600, worldH: 1000 });
  zoomAt(cam, 400, 300, 3);
  panBy(cam, 1e6, 1e6);
  near(cam.x, 0);
  near(cam.y, 0);
  panBy(cam, -1e7, -1e7);
  const r = visibleRect(cam);
  near(r.x + r.w, 1600, 1e-3);
  near(r.y + r.h, 1000, 1e-3);
});

test('pinTo pins a world point under the fingers', () => {
  const cam = createCamera({ viewW: 400, viewH: 800, worldW: 1600, worldH: 1000 });
  const wp = { x: 800, y: 500 };
  pinTo(cam, wp, 200, 400, 2);
  const back = screenToWorld(cam, 200, 400);
  near(back.x, 800, 1e-3);
  near(back.y, 500, 1e-3);
});

test('resize keeps the centre and refits when fitted', () => {
  const cam = createCamera({ viewW: 800, viewH: 600, worldW: 1600, worldH: 1000 });
  resizeCamera(cam, 400, 300);
  near(cam.scale, cam.minScale);
  centreOn(cam, 600, 400, 2);
  resizeCamera(cam, 500, 500);
  const c = screenToWorld(cam, 250, 250);
  near(c.x, 600, 1e-3);
  near(c.y, 400, 1e-3);
});
