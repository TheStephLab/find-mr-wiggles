import { createRng } from '../core/rng.js';
import { getDifficulty, worldSize, crowdSize } from '../core/difficulty.js';
import { createKit } from '../scenes/kit.js';
import { createAgent, updateAgent, servedByQueue, agentBounds, planPath } from './agents.js';
import { createCrowdLook, WIGGLES_LOOK, pickName } from './people.js';
import { normaliseMode } from '../core/mode.js';
import { composeClassic } from './classic.js';

/**
 * Build a playable world from a scene definition.
 * Everything is derived from `seed`, so a seed reproduces the same scene,
 * and a fresh seed puts Mr. Wiggles somewhere new.
 *
 * World coordinates are the ground plan (x, y) plus height z; `world.P`
 * projects them into the perspective picture the camera looks at.
 */
export function createWorld(scene, { level = 3, seed, perfFactor = 1, mode = 'animated' } = {}) {
  mode = normaliseMode(mode);
  const difficulty = getDifficulty(level);
  const { width, height } = worldSize(difficulty, scene.aspect);
  const rng = createRng(seed);
  const kit = createKit({ rng, width, height, difficulty, view: scene.view, mode });
  scene.build(kit);
  kit.finalize();

  const { nav, P } = kit;
  const walkNodes = nav.liveNodes((n) => !n.exact);
  if (!walkNodes.length) throw new Error(`Scene ${scene.id} has no walkable area`);
  const openNodes = walkNodes.filter((n) => !n.hidden);

  const world = {
    scene,
    mode,
    seed: rng.seed,
    difficulty,
    width,
    height,
    P,
    pictureWidth: P.width,
    pictureHeight: P.height,
    background: kit.background,
    backdrop: kit.backdrop,
    levels: kit.levels,
    nav,
    rng,
    floor: kit.floor,
    dynamic: kit.dynamic,
    props: kit.props,
    occluders: kit.occluders,
    pois: kit.pois,
    queues: kit.queues,
    walkNodes,
    openNodes,
    agents: [],
    wiggles: null,
    time: 0,
    zAt: kit.zAt,
    floorZ: kit.floorZ,
    visibility: kit.visibility,
    isHiddenSpot: kit.isHiddenSpot,
  };

  const homeRadius = Math.max(width, height) * 0.28;
  const placeAgent = (agent, { visibleOnly = false } = {}) => {
    const free = kit.pois.filter((p) => !p.queue && p.occupants < p.capacity && (!p.roles || p.roles.includes(agent.role)));
    if (free.length && rng.chance(0.55)) {
      const poi = rng.pick(free);
      poi.occupants++;
      Object.assign(agent, {
        x: poi.x,
        y: poi.y,
        nodeId: poi.node,
        home: { x: poi.x, y: poi.y },
        task: { type: 'poi', poi },
        state: 'activity',
        poi,
        timer: rng.range(1, poi.duration[1]),
        mode: poi.mode,
        dir: poi.facing,
        action: rng.pick(poi.actions),
        sortBias: poi.sortBias,
      });
      return;
    }
    const pool = visibleOnly && openNodes.length ? openNodes : walkNodes;
    const node = rng.pick(pool);
    const jitter = visibleOnly ? 0 : 1;
    agent.x = node.x + rng.range(-10, 10) * jitter;
    agent.y = node.y + rng.range(-8, 8) * jitter;
    agent.nodeId = node.id;
    agent.home = { x: node.x, y: node.y };
    // Start some people mid-journey so the scene is moving from the first frame.
    if (rng.chance(0.5)) planPath(agent, world, rng.pick(walkNodes).id);
    else if (kit.isHiddenSpot(agent.x, agent.y)) agent.timer = 0;
  };

  const count = crowdSize(difficulty, { crowdFactor: scene.crowdFactor ?? 1, perfFactor });
  for (let i = 0; i < count; i++) {
    const role = rng.weighted(kit.roles.map((r) => [r, r.weight]));
    const look = createCrowdLook(rng, {
      role: role.role,
      uniform: role.uniform,
      decoyRate: difficulty.decoyRate,
      maxDecoyTraits: difficulty.maxDecoyTraits,
      paletteBias: difficulty.paletteBias ?? 0,
    });
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

  // Mr. Wiggles: a random activity spot or walkable spot that the camera can see.
  const wiggles = createAgent({ look: WIGGLES_LOOK, x: 0, y: 0, nodeId: walkNodes[0].id, rng, homeRadius: Math.max(width, height) * 0.2, isWiggles: true, role: 'wiggles', name: 'Mr. Wiggles' });
  placeAgent(wiggles, { visibleOnly: true });
  world.agents.splice(rng.int(0, world.agents.length), 0, wiggles);
  world.wiggles = wiggles;

  world.update = (dt) => {
    if (mode === 'classic') return;
    world.time += dt;
    for (const d of world.dynamic) d.update?.(dt, world.time);
    for (const q of world.queues) {
      const done = q.update(dt, (m) => m.atFront);
      if (done) servedByQueue(done, world);
    }
    for (const a of world.agents) updateAgent(a, world, dt);
  };

  /** Picture-space bounds of an agent. */
  world.boundsOf = (agent) => agentBounds(agent, P);

  /** Nearest-to-camera agent whose picture bounds contain (px, py), expanded by `tolerance`. */
  world.agentAt = (px, py, tolerance = 0) => {
    let hit = null;
    for (const a of world.agents) {
      const b = agentBounds(a, P);
      if (px >= b.x - tolerance && px <= b.x + b.w + tolerance && py >= b.y - tolerance && py <= b.y + b.h + tolerance) {
        if (!hit || a.sortY > hit.sortY) hit = a;
      }
    }
    return hit;
  };

  world.isWigglesAt = (px, py, tolerance = 0) => {
    const b = agentBounds(wiggles, P);
    return px >= b.x - tolerance && px <= b.x + b.w + tolerance && py >= b.y - tolerance && py <= b.y + b.h + tolerance;
  };

  /** Where Mr. Wiggles' head is in the picture (for hints and the celebration). */
  world.wigglesPoint = () => ({ x: P.X(wiggles.x, wiggles.y), y: P.Y(wiggles.y, wiggles.z) - 26 * P.s(wiggles.y) });

  for (const a of world.agents) {
    a.sortY = a.y + a.sortBias;
    a.z = kit.zAt(a.x, a.y);
  }
  if (mode === 'classic') composeClassic(world, kit);
  return world;
}
