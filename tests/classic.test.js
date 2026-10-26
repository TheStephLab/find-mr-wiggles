import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_IDS } from '../js/scenes/index.js';
import { createWorld } from '../js/game/world.js';
import { agentPose } from '../js/game/agents.js';
import { traitsOf } from '../js/game/people.js';
import { spriteBounds } from '../js/game/draw-person.js';

test('five locations have a stable unlock order in both modes', () => {
  assert.deepEqual(SCENE_IDS, ['whistlebury-junction', 'skyhaven-international', 'copperleaf-galleria', 'little-lantern-market', 'bramblewick-fairground']);
});

for (const scene of SCENES) {
  test(`${scene.title}: Classic is a composed illustration with expressive frozen poses and a safe target at every difficulty`, () => {
    for (let level = 1; level <= 5; level++) {
      for (const seed of [1, 21, 97]) {
        const world = createWorld(scene, { level, seed, mode: 'classic' });
        assert.equal(world.mode, 'classic');
        assert.ok(world.tableaux.length >= 8);
        assert.ok(world.agents.length >= 850, 'even Relaxed has a dense illustrated crowd');
        assert.ok(world.classicPlacements.length >= 8, 'multiple fair composed target placements');
        const point = world.wigglesPoint();
        assert.ok(world.isWigglesAt(point.x, point.y), 'the guaranteed visible target point is clickable');
        assert.equal(world.agentAt(point.x, point.y), world.wiggles);
        const contains = b => point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h;
        assert.ok(!world.props.some(p => p.sortY > world.wiggles.sortY && contains(p.bounds)), 'target point is outside all foreground art bounds, including non-solid decoration');
        assert.ok(!world.agents.some(a => {
          if (a === world.wiggles || a.sortY <= world.wiggles.sortY) return false;
          const b = spriteBounds(a.look), k = world.P.s(a.y);
          return contains({ x: world.P.X(a.x, a.y) + b.L * k, y: world.P.Y(a.y, a.z) + b.T * k, w: (b.R - b.L) * k, h: (b.B - b.T) * k });
        }), 'foreground arms, hats and carried objects cannot cover the guaranteed target point');
        assert.ok(world.targetVisibility >= .6, `target sample coverage ${world.targetVisibility}`);
        const snapshot = JSON.stringify(world.agents);
        const poses = world.agents.map(a => agentPose(a, world.time));
        const dynamic = world.dynamic.flatMap(d => d.parts?.().map(p => p.bounds) ?? []);
        const time = world.time;
        for (let i = 0; i < 30; i++) world.update(1);
        assert.equal(world.time, time);
        assert.equal(JSON.stringify(world.agents), snapshot);
        assert.deepEqual(world.agents.map(a => agentPose(a, 999)), poses, 'pose time ignores gameplay time');
        assert.deepEqual(world.dynamic.flatMap(d => d.parts?.().map(p => p.bounds) ?? []), dynamic);
        const modes = new Set(world.agents.map(a => a.mode));
        for (const mode of ['walk', 'jog', 'sit', 'stand']) assert.ok(modes.has(mode));
        assert.ok(new Set(world.agents.map(a => a.action)).size >= 5);
        for (const a of world.agents) if (!a.isWiggles) assert.ok(traitsOf(a.look).length <= world.difficulty.maxDecoyTraits);
      }
    }
  });

  test(`${scene.title}: Classic replays vary placement without camera-dependent state`, () => {
    const spots = new Set();
    for (let seed = 1; seed <= 10; seed++) {
      const w = createWorld(scene, { seed, level: 3, mode: 'classic' });
      spots.add(`${Math.round(w.wiggles.x)},${Math.round(w.wiggles.y)}`);
    }
    assert.ok(spots.size >= 8);
  });
}
