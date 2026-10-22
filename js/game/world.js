import { createRng } from '../core/rng.js';
import { getDifficulty, worldSize, crowdSize } from '../core/difficulty.js';
import { createKit } from '../scenes/kit.js';
import { createAgent, updateAgent, servedByQueue, agentBounds, planPath } from './agents.js';
import { createCrowdLook, WIGGLES_LOOK, pickName } from './people.js';

/**
 * Build a playable world from a scene definition.
 * Everything is derived from `seed`, so a seed reproduces the same scene,
 * and a fresh seed puts Mr. Wiggles somewhere new.
 */
export function createWorld(scene, { level = 3, seed, perfFactor = 1 } = {}) {
  const difficulty = getDifficulty(level);
  const { width, height } = worldSize(difficulty, scene.aspect);
  const rng = createRng(seed);
  const kit = createKit({ rng, width, height, difficulty });
  scene.build(kit);
  kit.finalize();

  const { nav } = kit;
  const walkNodes = nav.liveNodes((n) => !n.exact);
  if (!walkNodes.length) throw new Error(`Scene ${scene.id} has no walkable area`);

  const world = {
    scene,
    seed: rng.seed,
    difficulty,
    width,
    height,
    background: kit.background,
    nav,
    rng,
    floor: kit.floor,
    dynamic: kit.dynamic,
    props: kit.props,
    pois: kit.pois,
    queues: kit.queues,
    walkNodes,
    agents: [],
    wiggles: null,
    time: 0,
  };

  const homeRadius = Math.max(width, height) * 0.28;
  const placeAgent = (agent, { allowPoi = true } = {}) => {
    const free = kit.pois.filter((p) => !p.queue && p.occupants < p.capacity && (!p.roles || p.roles.includes(agent.role)));
    if (allowPoi && free.length && rng.chance(0.55)) {
      const poi = rng.pick(free);
      poi.occupants++;
      agent.x = poi.x;
      agent.y = poi.y;
      agent.nodeId = poi.node;
      agent.home = { x: poi.x, y: poi.y };
      agent.task = { type: 'poi', poi };
      agent.state = 'activity';
      agent.poi = poi;
      agent.timer = rng.range(1, poi.duration[1]);
      agent.mode = poi.mode;
      agent.dir = poi.facing;
      agent.action = rng.pick(poi.actions);
      agent.sortBias = poi.sortBias;
      return;
    }
    const node = rng.pick(walkNodes);
    agent.x = node.x + rng.range(-10, 10);
    agent.y = node.y + rng.range(-8, 8);
    agent.nodeId = node.id;
    agent.home = { x: node.x, y: node.y };
    // Start some people mid-journey so the scene is moving from the first frame.
    if (rng.chance(0.5)) planPath(agent, world, rng.pick(walkNodes).id);
  };

  const count = crowdSize(difficulty, { crowdFactor: scene.crowdFactor ?? 1, perfFactor });
  for (let i = 0; i < count; i++) {
    const role = rng.weighted(kit.roles.map((r) => [r, r.weight]));
    const look = createCrowdLook(rng, { role: role.role, uniform: role.uniform, decoyRate: difficulty.decoyRate, maxDecoyTraits: difficulty.maxDecoyTraits });
    const agent = createAgent({ look, x: 0, y: 0, nodeId: walkNodes[0].id, rng, homeRadius, role: role.role, jogging: role.role === 'jogger', name: pickName(rng) });
    placeAgent(agent);
    world.agents.push(agent);
  }

  for (const s of kit.stations) {
    const look = createCrowdLook(rng, { role: 'staff', uniform: s.uniform });
    const agent = createAgent({ look, x: s.x, y: s.y, nodeId: -1, rng, role: 'staff', name: pickName(rng) });
    Object.assign(agent, { state: 'fixed', dir: s.dir, mode: s.mode, action: s.action, sortBias: s.sortBias, fixedActions: s.fixedActions ?? null, timer: rng.range(0, 4) });
    world.agents.push(agent);
  }

  // Mr. Wiggles: a uniformly random walkable node or free activity spot.
  const wiggles = createAgent({ look: WIGGLES_LOOK, x: 0, y: 0, nodeId: walkNodes[0].id, rng, homeRadius: Math.max(width, height) * 0.16, isWiggles: true, role: 'wiggles', name: 'Mr. Wiggles' });
  placeAgent(wiggles);
  world.agents.splice(rng.int(0, world.agents.length), 0, wiggles);
  world.wiggles = wiggles;

  world.update = (dt) => {
    world.time += dt;
    for (const d of world.dynamic) d.update?.(dt, world.time);
    for (const q of world.queues) {
      const done = q.update(dt, (m) => m.atFront);
      if (done) servedByQueue(done, world);
    }
    for (const a of world.agents) updateAgent(a, world, dt);
  };

  /** Topmost agent whose bounds contain (x, y), expanded by `tolerance`. */
  world.agentAt = (x, y, tolerance = 0) => {
    let hit = null;
    for (const a of world.agents) {
      const b = agentBounds(a);
      if (x >= b.x - tolerance && x <= b.x + b.w + tolerance && y >= b.y - tolerance && y <= b.y + b.h + tolerance) {
        if (!hit || a.sortY > hit.sortY) hit = a;
      }
    }
    return hit;
  };

  world.isWigglesAt = (x, y, tolerance = 0) => {
    const b = agentBounds(wiggles);
    return x >= b.x - tolerance && x <= b.x + b.w + tolerance && y >= b.y - tolerance && y <= b.y + b.h + tolerance;
  };

  for (const a of world.agents) a.sortY = a.y + a.sortBias;
  return world;
}
