import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawSuitcase } from '../js/game/figure/items.js';
import { createAgent, updateAgent, travelFacing, startVisit } from '../js/game/agents.js';
import { drawPerson, spriteFrame, spriteBounds } from '../js/game/draw-person.js';
import { createRng } from '../js/core/rng.js';
import { createProjection } from '../js/core/projection.js';
import { WIGGLES_LOOK } from '../js/game/people.js';
import { createWorld } from '../js/game/world.js';
import { clockFace } from '../js/scenes/props.js';
import { trainStation } from '../js/scenes/train-station.js';
import { fakeContext } from './helpers/fake-canvas.js';
import { gaitOf, rigOf } from '../js/game/figure/core.js';

function recordingContext() {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [], points = [], wheels = [];
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const ctx = new Proxy(fakeContext(), {
    get(target, name) {
      if (name === 'save') return () => stack.push([...matrix]);
      if (name === 'restore') return () => { matrix = stack.pop(); };
      if (name === 'translate') return (x, y) => { const p = point(x, y); matrix[4] = p[0]; matrix[5] = p[1]; };
      if (name === 'rotate') return a => {
        const [A, B, C, D] = matrix, c = Math.cos(a), s = Math.sin(a);
        matrix = [A * c + C * s, B * c + D * s, C * c - A * s, D * c - B * s, matrix[4], matrix[5]];
      };
      if (name === 'scale') return (x, y) => { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; };
      if (name === 'transform') return (a, b, c, d, e, f) => {
        const [A, B, C, D, E, F] = matrix;
        matrix = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F];
      };
      if (name === 'moveTo' || name === 'lineTo') return (x, y) => points.push(point(x, y));
      if (name === 'ellipse') return (x, y, rx, ry) => wheels.push({ centre: point(x, y), radius: Math.max(rx, ry), rx, ry });
      return target[name];
    },
  });
  return { ctx, points, wheels };
}

test('real drawing attaches luggage to the transformed hand in all eight views and poses', () => {
    const look = { ...WIGGLES_LOOK, height: 40, carry: { type: 'suitcase', color: '#284b68' } };
    for (const dir of ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']) {
      for (const mode of ['stand', 'walk', 'jog', 'sit']) for (const phase of [0, 1, 2.4, 4]) {
        const { ctx, points, wheels } = recordingContext();
        drawPerson(ctx, look, { dir, mode, phase }, 0, 0);
        const hands = wheels.filter(w => w.rx === 1 && w.ry === .66);
        assert.ok(hands.some(h => points.some(p => Math.hypot(p[0] - h.centre[0], p[1] - h.centre[1]) < .001)), `${dir}/${mode}/${phase} detached`);
        const rolling = wheels.filter(w => w.rx === .65 && w.ry === .65);
        assert.ok(rolling.every(w => Math.abs(w.centre[1] + w.radius) < .001));
        const bounds = spriteBounds(look);
        assert.ok(rolling.every(w => w.centre[0] - w.radius >= bounds.L && w.centre[0] + w.radius <= bounds.R));
      }
    }
  });

  test('eight travel directions share only five canonical sprite orientations', () => {
    const dirs = Array.from({ length: 8 }, (_, i) => travelFacing(Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)));
    assert.equal(new Set(dirs).size, 8);
    assert.equal(new Set(dirs.map(dir => spriteFrame(WIGGLES_LOOK, { dir, mode: 'walk', phase: 1 }).key)).size, 5);
    assert.equal(spriteFrame(WIGGLES_LOOK, { dir: 'up-left' }).mirror, true);
  });

  test('diagonal overtakes yield locally without off-walkable pushes or crowd tunnelling', () => {
    const world = createWorld(emptyScene, { level: 1, seed: 2 });
    const pair = world.agents.slice(0, 2);
    world.agents = pair;
    for (const [i, a] of pair.entries()) Object.assign(a, {
      x: 300 + i * 30, y: 300 + i * 30, z: 0, walkSpeed: i ? 25 : 70, jogging: !i,
      state: 'travel', pathIndex: 0, path: [{ x: 650, y: 650, node: a.nodeId }],
    });
    let minimum = Infinity;
    for (let frame = 0; frame < 60; frame++) {
      world.update(.15); // Runtime subdivides large calls into safe simulation steps.
      minimum = Math.min(minimum, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
      assert.ok(pair.every(a => a.x > 8 && a.y > 8 && a.x < world.width - 8 && a.y < world.height - 8));
    }
    assert.ok(minimum > 11.5);
    assert.ok(pair[0].x > pair[1].x, 'faster walker overtakes');
    assert.ok(world.crowd.stats.maxNeighbours <= 24);
  });
for (const view of ['side', 'front', 'back']) {
  test(`wheeled luggage handle meets its supplied hand and wheels touch ground: ${view}`, () => {
    for (const [hx, hy] of [[-4, -19], [6, -21], [-3.6, -17.5]]) {
      const { ctx, points, wheels } = recordingContext();
      drawSuitcase(ctx, { carry: { type: 'suitcase', color: '#284b68' } }, hx, hy, view);
      assert.ok(points.some(p => Math.hypot(p[0] - hx, p[1] - hy) < .05), 'actual drawn handle is attached to the hand');
      assert.ok(wheels.length > 0);
      for (const w of wheels) assert.ok(Math.abs(w.centre[1] + w.radius) < .05, 'rolling wheels stay on y=0');
      if (view === 'side') assert.ok(wheels.every(w => w.centre[0] < hx), 'luggage trails the pulling hand');
    }
  });
}

test('diagonal travel faces the final projected velocity instead of a sideways profile', () => {
  const rng = createRng(7), P = createProjection({ width: 1000, height: 1000 });
  const agent = createAgent({ look: WIGGLES_LOOK, x: 500, y: 500, nodeId: 0, rng, jogging: true });
  Object.assign(agent, { state: 'travel', pathIndex: 0, path: [{ x: 700, y: 700, node: 1 }] });
  updateAgent(agent, { rng, P, zAt: () => 0 }, .05);
  assert.equal(agent.dir, 'down-right');
  assert.ok(agent.x > 500 && agent.y > 500);
  assert.equal(agent.mode, 'jog');
});

const emptyScene = {
  id: 'test-square', aspect: 1, build(kit) {
    kit.defineLevel('ground', { x: 0, y: 0, w: kit.W, h: kit.H });
    kit.grid({ x: 20, y: 20, w: kit.W - 40, h: kit.H - 40 }, 50);
  },
};

test('head-on walkers pass without walking through each other or deadlocking', () => {
  const world = createWorld(emptyScene, { level: 1, seed: 2 });
  const pair = world.agents.slice(0, 2);
  world.agents = pair;
  for (const [i, a] of pair.entries()) Object.assign(a, {
    x: 400 + i * 120, y: 400, z: 0, walkSpeed: 40, jogging: false,
    state: 'travel', pathIndex: 0, path: [{ x: i ? 350 : 570, y: 400, node: a.nodeId }],
  });
  let minimum = Infinity;
  for (let frame = 0; frame < 100; frame++) {
    world.update(.05);
    minimum = Math.min(minimum, Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y));
  }
  assert.ok(minimum >= 11.5, `body centres overlapped at ${minimum.toFixed(2)} world units`);
  assert.ok(pair[0].x > pair[1].x, 'both walkers eventually pass');
});

test('analogue clock hands use smooth supplied simulation time, independent of wall clock', () => {
  const a = recordingContext(), b = recordingContext();
  clockFace(a.ctx, 0, 0, 26, 0);
  clockFace(b.ctx, 0, 0, 26, 1);
  assert.notDeepEqual(a.points, b.points);
  const c = recordingContext();
  clockFace(c.ctx, 0, 0, 26, 1);
  assert.deepEqual(b.points, c.points);
});

test('both station clocks live in time-driven depth layers, not a cached backdrop', () => {
  const world = createWorld(trainStation, { level: 3, seed: 12 });
  const clocks = world.props.filter(p => p.kind === 'clock');
  assert.equal(clocks.length, 2);
  for (const clock of clocks) {
    const a = recordingContext(), b = recordingContext();
    clock.draw(a.ctx, 0, world.P);
    clock.draw(b.ctx, 1, world.P);
    assert.notDeepEqual(a.points, b.points);
  }
});

test('a grounded foot always travels backwards through the figure frame, never moonwalks', () => {
  const R = rigOf(WIGGLES_LOOK);
  for (const mode of ['walk', 'jog']) for (let phase = .01; phase < Math.PI * 2; phase += .03) {
    const now = gaitOf(R, { mode, phase }), next = gaitOf(R, { mode, phase: phase + .001 });
    for (let i = 0; i < 2; i++) {
      if (now.legs[i].lift < .01 && next.legs[i].lift < .01) {
        assert.ok(next.legs[i].ax <= now.legs[i].ax + .00001, `${mode} grounded foot moves forwards at ${phase}`);
      }
    }
  }
});

test('busy navigation keeps flowing after two minutes instead of freezing a collision-separated crowd', () => {
  const world = createWorld(trainStation, { seed: 33, level: 3 });
  let moving = 0, travelling = 0;
  for (let frame = 0; frame < 2400; frame++) {
    world.update(.05);
    if (frame < 1800 || frame % 10) continue;
    for (const a of world.agents) if (a.state === 'travel') {
      travelling++;
      if (Math.hypot(a.vx ?? 0, a.vy ?? 0) > 5) moving++;
    }
  }
  assert.ok(moving / travelling >= .3, `only ${(100 * moving / travelling).toFixed(1)}% of travelling bodies still moving`);
});

test('off-scene travellers reenter only at an unoccupied exit, not inside another person', () => {
  const world = createWorld(emptyScene, { level: 1, seed: 2 });
  const [a, b] = world.agents;
  world.agents = [a, b];
  Object.assign(a, { x: 200, y: 200, z: 0 });
  Object.assign(b, { x: 700, y: 700, z: 0, state: 'fixed', timer: 100 });
  startVisit(a, world, { enter: [{ x: 200, y: 200 }], exit: [{ x: 700, y: 650 }], duration: 0, controller: { inside: new Set(), completed: 0 }, returnAt: { x: 700, y: 700 } });
  world.update(.1);
  assert.ok(a.hidden || Math.hypot(a.x - b.x, a.y - b.y) >= 12, 'occupied door must not produce body overlap');
  b.x = 800;
  world.update(.1);
  assert.equal(a.hidden, false, 'traveller returns promptly once the real doorway clears');
  for (let i = 0; i < 80; i++) world.update(.05);
  assert.equal(a.visit, null);
});
