import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../js/scenes/index.js';
import { createWorld } from '../js/game/world.js';
import { getDifficulty, crowdSize } from '../js/core/difficulty.js';
import { traitsOf } from '../js/game/people.js';

const MAX_HIDDEN_STREAK_S = 10;

for (const scene of SCENES) {
  test(`${scene.title}: scenery hides people, but never where they stop`, () => {
    const world = createWorld(scene, { level: 3, seed: 21 });
    assert.ok(world.occluders.length > 10, 'solid 3D props exist');
    assert.ok(world.walkNodes.some((n) => n.hidden), 'some walkways pass behind things');
    for (const poi of world.pois) {
      if (!poi.queue) assert.ok(!world.isHiddenSpot(poi.x, poi.y), `activity spot ${poi.x},${poi.y} is hidden`);
    }
    const w = world.wiggles;
    assert.ok(world.visibility(w.x, w.y, w.z) >= 0.5, 'Mr. Wiggles starts in view');
  });

  test(`${scene.title}: Mr. Wiggles always reappears from behind obstacles`, () => {
    let hidden = 0;
    let samples = 0;
    for (const seed of [3, 7, 11]) {
      const world = createWorld(scene, { level: 3, seed });
      let streak = 0;
      for (let i = 0; i < 150 * 20; i++) {
        world.update(0.05);
        if (i % 5) continue;
        const g = world.wiggles;
        samples++;
        if (world.visibility(g.x, g.y, g.z) < 0.5) {
          hidden++;
          streak += 0.25;
          assert.ok(streak <= MAX_HIDDEN_STREAK_S, `hidden for ${streak}s (${g.state}) at ${g.x.toFixed(0)},${g.y.toFixed(0)}`);
        } else {
          streak = 0;
        }
      }
    }
    assert.ok(hidden / samples < 0.12, `hidden ${(100 * hidden / samples).toFixed(1)}% of the time`);
  });

  test(`${scene.title}: nobody idles out of sight`, () => {
    const world = createWorld(scene, { level: 4, seed: 5 });
    const streaks = new Map();
    for (let i = 0; i < 90 * 20; i++) {
      world.update(0.05);
      if (i % 10) continue;
      for (const a of world.agents) {
        if (a.state !== 'idle' && a.state !== 'activity') {
          streaks.set(a, 0);
          continue;
        }
        const s = world.isHiddenSpot(a.x, a.y, a.z) ? (streaks.get(a) ?? 0) + 0.5 : 0;
        streaks.set(a, s);
        assert.ok(s <= 2, `${a.role} ${a.state} hidden for ${s}s`);
      }
    }
  });
}

test('Normal is a genuine challenge', () => {
  const normal = getDifficulty(3);
  assert.ok(crowdSize(normal) >= 250, 'big crowd');
  assert.equal(normal.maxDecoyTraits, 2);
  assert.ok(normal.decoyRate >= 0.2);
  const world = createWorld(SCENES[0], { level: 3, seed: 9 });
  const decoys = world.agents.filter((a) => !a.isWiggles && traitsOf(a.look).length > 0);
  const doubles = decoys.filter((a) => traitsOf(a.look).length === 2);
  assert.ok(decoys.length >= 40, `only ${decoys.length} look-alikes`);
  assert.ok(doubles.length >= 10, `only ${doubles.length} two-trait look-alikes`);
  const hats = world.agents.filter((a) => !a.isWiggles && traitsOf(a.look).includes('hat')).length;
  assert.ok(hats >= 5, 'several people wear his striped hat');
});
