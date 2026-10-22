import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_IDS, getScene } from '../js/scenes/index.js';
import { createWorld } from '../js/game/world.js';
import { DIFFICULTIES, crowdSize } from '../js/core/difficulty.js';
import { traitsOf } from '../js/game/people.js';

test('registry has unique ids and required fields', () => {
  assert.equal(new Set(SCENE_IDS).size, SCENES.length);
  for (const s of SCENES) {
    for (const key of ['id', 'title', 'kind', 'blurb', 'build']) assert.ok(s[key], `${s.id} missing ${key}`);
    assert.equal(getScene(s.id), s);
  }
  assert.deepEqual(SCENE_IDS.slice(0, 2), ['whistlebury-junction', 'skyhaven-international']);
});

for (const scene of SCENES) {
  for (const d of DIFFICULTIES) {
    test(`${scene.title} builds a valid world at ${d.label}`, () => {
      const world = createWorld(scene, { level: d.level, seed: 1234 + d.level });
      const { nav } = world;
      const live = nav.liveNodes();
      assert.ok(live.length > 20);
      // every live node can reach every other (strongly connected)
      const scc = nav.stronglyConnectedWith(live[0].id);
      assert.equal(scc.size, live.length);
      for (const poi of world.pois) assert.ok(poi.node >= 0 && !nav.nodes[poi.node].removed, 'poi attached');
      const w = world.wiggles;
      assert.ok(w.isWiggles);
      assert.ok(w.x >= 0 && w.x <= world.width && w.y >= 0 && w.y <= world.height, 'wiggles in bounds');
      assert.equal(world.agents.filter((a) => a.isWiggles).length, 1);
      const crowd = world.agents.filter((a) => !a.isWiggles && a.state !== 'fixed').length;
      assert.equal(crowd, crowdSize(d, { crowdFactor: scene.crowdFactor }));
      for (const a of world.agents) if (!a.isWiggles) assert.ok(traitsOf(a.look).length <= d.maxDecoyTraits);
    });
  }

  test(`${scene.title}: Mr. Wiggles starts somewhere different each game`, () => {
    const spots = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const w = createWorld(scene, { level: 2, seed }).wiggles;
      spots.add(`${Math.round(w.x / 50)},${Math.round(w.y / 50)}`);
    }
    assert.ok(spots.size >= 8, `only ${spots.size} distinct spots`);
  });

  test(`${scene.title}: crowd keeps moving for two simulated minutes`, () => {
    const world = createWorld(scene, { level: 4, seed: 99 });
    const start = new Map(world.agents.map((a) => [a, { x: a.x, y: a.y }]));
    const levelsVisited = new Map();
    const levelOf = (a) => (a.y < world.height * 0.65 ? 'top' : 'bottom');
    for (let i = 0; i < 120 * 20; i++) {
      world.update(1 / 20);
      if (i % 40 === 0) {
        for (const a of world.agents) {
          assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), 'finite position');
          assert.ok(a.x > -20 && a.x < world.width + 20 && a.y > -20 && a.y < world.height + 20, `agent ${a.id} out of bounds`);
          if (!levelsVisited.has(a)) levelsVisited.set(a, new Set());
          levelsVisited.get(a).add(levelOf(a));
        }
      }
    }
    const movers = world.agents.filter((a) => Math.hypot(a.x - start.get(a).x, a.y - start.get(a).y) > 30).length;
    assert.ok(movers > world.agents.length * 0.5, `only ${movers} of ${world.agents.length} moved`);
    const changedLevel = [...levelsVisited.values()].filter((s) => s.size > 1).length;
    assert.ok(changedLevel > 0, 'someone used an escalator');
    const queued = world.queues.reduce((n, q) => n + q.length, 0);
    assert.ok(queued < world.agents.length * 0.5, 'queues are not swallowing the crowd');
  });
}

test('expert worlds build quickly', () => {
  for (const scene of SCENES) {
    const t0 = performance.now();
    createWorld(scene, { level: 5, seed: 7 });
    assert.ok(performance.now() - t0 < 1500, `${scene.id} took too long`);
  }
});
