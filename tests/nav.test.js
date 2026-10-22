import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavGraph, Queue } from '../js/core/nav.js';
import { segmentIntersectsRect } from '../js/core/geometry.js';

test('segmentIntersectsRect', () => {
  const r = { x: 10, y: 10, w: 10, h: 10 };
  assert.equal(segmentIntersectsRect(0, 15, 30, 15, r), true);
  assert.equal(segmentIntersectsRect(0, 0, 30, 0, r), false);
  assert.equal(segmentIntersectsRect(0, 0, 9, 9, r), false);
  assert.equal(segmentIntersectsRect(12, 12, 13, 13, r), true);
});

test('finds the shortest path', () => {
  const g = new NavGraph();
  const a = g.addNode(0, 0);
  const b = g.addNode(100, 0);
  const c = g.addNode(50, 10);
  const d = g.addNode(200, 0);
  g.link(a, b);
  g.link(a, c);
  g.link(c, b);
  g.link(b, d);
  assert.deepEqual(g.findPath(a, d), [a, b, d]);
});

test('one-way escalators are respected', () => {
  const g = new NavGraph();
  const bottom = g.addNode(0, 100);
  const top = g.addNode(0, 0);
  g.link(bottom, top, { type: 'escalator' });
  assert.deepEqual(g.findPath(bottom, top), [bottom, top]);
  assert.equal(g.findPath(top, bottom), null);
  assert.equal(g.stronglyConnectedWith(bottom).has(top), false);
});

test('grid avoids blockers and prune removes islands', () => {
  const g = new NavGraph();
  const wall = { x: 95, y: -10, w: 10, h: 220 };
  const grid = g.addGrid({ x: 0, y: 0, w: 200, h: 200 }, 50, { blockers: [wall], margin: 2 });
  const left = grid[0][0];
  const right = grid[0][4];
  assert.equal(g.findPath(left, right), null);
  g.pruneTo(left);
  assert.equal(g.nodes[right].removed, true);
  assert.ok(g.liveNodes().length > 0);
});

test('queue serves first-come-first-served and extends past its slots', () => {
  const q = new Queue({ slots: [{ x: 0, y: 0 }, { x: 0, y: 10 }], serviceTime: [1, 1] });
  q.join('a');
  q.join('b');
  q.join('c');
  assert.deepEqual(q.slotPosition(2), { x: 0, y: 20 });
  assert.equal(q.update(0.5), null);
  assert.equal(q.update(0.6), 'a');
  assert.equal(q.indexOf('b'), 0);
  assert.equal(q.update(5, () => false), null, 'waits until the front member is ready');
});
