/**
 * Crowd behaviour. Each agent runs a tiny state machine:
 *   idle → (choose task) → travel → activity | queue → idle …
 * Stationed agents (shopkeepers, buskers, desk staff) stay in a 'fixed' state.
 */
import { spriteBounds } from './draw-person.js';
import { pointInRect, segmentIntersectsRect } from '../core/geometry.js';
export const ESCALATOR_SPEED = 30;
export const TRAVELATOR_SPEED = 42;
const ARRIVE_EPS = 0.75;

let nextId = 1;

export function createAgent({ look, x, y, nodeId, rng, home, homeRadius = 500, isWiggles = false, name = null, role = 'commuter', jogging = false }) {
  const child = role === 'child';
  const elderly = role === 'elderly';
  const base = jogging ? rng.range(85, 105) : elderly ? rng.range(20, 27) : child ? rng.range(30, 42) : rng.range(32, 46);
  return {
    id: nextId++,
    look,
    name,
    role,
    isWiggles,
    x,
    y,
    nodeId,
    home: home ?? { x, y },
    homeRadius,
    jogging,
    walkSpeed: base,
    escalatorWalker: rng.chance(0.25),
    laneOffset: rng.range(-4, 4),
    dir: rng.pick(['down', 'left', 'right', 'up']),
    mode: 'stand',
    action: null,
    phase: rng.range(0, Math.PI * 2),
    seed: rng.range(0, 10),
    state: 'idle',
    timer: rng.range(0, 3),
    path: null,
    pathIndex: 0,
    task: null,
    poi: null,
    queue: null,
    atFront: false,
    sortBias: 0,
    fixedActions: null,
  };
}

export function travelFacing(dx, dy) {
  const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
  return directions[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
}

/** Move towards (tx, ty). Returns true on arrival. */
function stepTowards(agent, tx, ty, speed, dt, world, constrained = false) {
  const dx = tx - agent.x;
  const dy = ty - agent.y;
  const d = Math.hypot(dx, dy);
  if (d <= ARRIVE_EPS) {
    agent.x = tx;
    agent.y = ty;
    return true;
  }
  const oldX = agent.x, oldY = agent.y;
  const z = world.zAt?.(oldX, oldY) ?? 0;
  const move = Math.min(speed * dt, d);
  const next = world.crowd ? world.crowd.move(agent, tx, ty, move, dt, constrained) :
    { x: oldX + dx / d * move, y: oldY + dy / d * move };
  agent.x = next.x; agent.y = next.y;
  const travelled = Math.hypot(agent.x - oldX, agent.y - oldY);
  if (travelled > .001) {
    const P = world.P;
    const px = P ? P.X(agent.x, agent.y) - P.X(oldX, oldY) : agent.x - oldX;
    const py = P ? P.Y(agent.y, world.zAt?.(agent.x, agent.y) ?? 0) - P.Y(oldY, z) : agent.y - oldY;
    agent.dir = travelFacing(px, py);
    agent.phase += travelled * .21;
  } else {
    agent.mode = 'stand';
  }
  return Math.hypot(tx - agent.x, ty - agent.y) <= ARRIVE_EPS;
}

// ------------------------------------------------------------ task choice
function choosePoi(agent, world) {
  const { pois } = world;
  if (!pois.length) return null;
  const { rng } = world;
  let best = null;
  let bestScore = -1;
  for (let k = 0; k < 10; k++) {
    const poi = pois[Math.floor(rng.next() * pois.length)];
    if (poi.node < 0) continue;
    if (!poi.queue && poi.occupants >= poi.capacity) continue;
    if (poi.queue && poi.queue.length > poi.queue.slots.length + 2) continue;
    if (poi.roles && !poi.roles.includes(agent.role)) continue;
    if (poi.requires && !poi.requires(agent)) continue;
    const d = Math.hypot(poi.x - agent.home.x, poi.y - agent.home.y) / agent.homeRadius;
    const score = (poi.weight ?? 1) * (0.25 + rng.next()) / (1 + d * d);
    if (score > bestScore) {
      bestScore = score;
      best = poi;
    }
  }
  return best;
}

function chooseRoamNode(agent, world, far = false) {
  const { rng } = world;
  // Prefer destinations in plain view so wanderers end up somewhere visible.
  const walkNodes = world.openNodes?.length ? world.openNodes : world.walkNodes;
  let best = walkNodes[Math.floor(rng.next() * walkNodes.length)];
  if (far) return best.id;
  for (let k = 0; k < 6; k++) {
    const n = walkNodes[Math.floor(rng.next() * walkNodes.length)];
    const d = Math.hypot(n.x - agent.home.x, n.y - agent.home.y);
    if (d < agent.homeRadius) {
      best = n;
      break;
    }
  }
  return best.id;
}

export function planPath(agent, world, goalNode, finalPoint = null) {
  const ids = world.nav.findPath(agent.nodeId, goalNode);
  if (!ids) return false;
  const { nav, rng } = world;
  const steps = [];
  for (let i = 0; i < ids.length; i++) {
    const node = nav.nodes[ids[i]];
    const edgeIn = i > 0 ? nav.edge(ids[i - 1], ids[i]) : null;
    const edgeOut = i < ids.length - 1 ? nav.edge(ids[i], ids[i + 1]) : null;
    const special = (edgeIn && edgeIn.type !== 'walk') || (edgeOut && edgeOut.type !== 'walk');
    let jx = 0;
    let jy = 0;
    if (special) {
      const e = edgeIn && edgeIn.type !== 'walk' ? edgeIn : edgeOut;
      const a = nav.nodes[e.from];
      const b = nav.nodes[e.to];
      const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      const lane = agent.laneOffset ?? 0;
      if (vertical) jx = lane;
      else jy = lane;
    } else if (!node.exact && !(edgeIn?.queue || edgeOut?.queue)) {
      jx = rng.range(-8, 8);
      jy = rng.range(-6, 6);
      const previous = steps.at(-1) ?? agent;
      const next = nav.nodes[ids[Math.min(i + 1, ids.length - 1)]];
      if (world.blockers?.some(b => pointInRect(node.x + jx, node.y + jy, b) ||
        (!pointInRect(previous.x, previous.y, b, 1) && segmentIntersectsRect(previous.x, previous.y, node.x + jx, node.y + jy, b)) ||
        segmentIntersectsRect(node.x + jx, node.y + jy, next.x, next.y, b))) { jx = 0; jy = 0; }
    }
    steps.push({ x: node.x + jx, y: node.y + jy, node: node.id, edge: edgeIn });
  }
  if (finalPoint) steps.push({ x: finalPoint.x, y: finalPoint.y, node: goalNode, edge: null, final: true });
  agent.path = steps;
  agent.pathIndex = 0;
  agent.state = 'travel';
  return true;
}

function startTask(agent, world) {
  const { rng } = world;
  agent.action = null;
  agent.sortBias = 0;
  if (agent.jogging) {
    if (planPath(agent, world, chooseRoamNode(agent, world, true))) agent.task = { type: 'roam' };
    else agent.timer = 1;
    return;
  }
  const roll = rng.next();
  if (roll < 0.72) {
    const poi = choosePoi(agent, world);
    if (poi) {
      if (!poi.queue) { poi.occupants++; poi.reserve?.(agent); }
      agent.task = { type: poi.queue ? 'queue' : 'poi', poi };
      if (planPath(agent, world, poi.node, poi.entry?.(agent) ?? { x: poi.x, y: poi.y })) return;
      if (!poi.queue) { poi.occupants--; poi.release?.(agent); }
    }
  }
  agent.task = { type: 'roam' };
  if (!planPath(agent, world, chooseRoamNode(agent, world))) {
    agent.state = 'idle';
    agent.timer = rng.range(0.5, 2);
  }
}

function arrive(agent, world) {
  const { rng } = world;
  const task = agent.task;
  agent.path = null;
  if (task?.type === 'poi') {
    const { poi } = task;
    agent.state = 'activity';
    agent.poi = poi;
    agent.timer = rng.range(poi.duration[0], poi.duration[1]);
    agent.mode = poi.mode ?? 'stand';
    agent.dir = poi.facing ?? agent.dir;
    agent.action = poi.actions?.length ? rng.pick(poi.actions) : null;
    agent.sortBias = poi.sortBias ?? 0;
    poi.onArrive?.(agent, world);
    return;
  }
  if (task?.type === 'queue') {
    agent.state = 'queue';
    agent.queue = task.poi.queue;
    agent.queueResume = null;
    agent.queue.join(agent);
    return;
  }
  agent.state = 'idle';
  agent.mode = 'stand';
  agent.timer = rng.range(0.6, 4.5);
  agent.action = rng.chance(0.25) ? rng.pick(['phone', null, 'wave']) : null;
  if (agent.look.carry?.type === 'newspaper' && rng.chance(0.5)) agent.action = 'read';
  // Never pause somewhere the camera can't see: keep walking until back in view.
  if (world.isHiddenSpot?.(agent.x, agent.y)) {
    agent.timer = 0;
    agent.action = null;
  }
}

function travel(agent, world, dt) {
  const step = agent.path[agent.pathIndex];
  const edge = step.edge;
  const next = agent.path[agent.pathIndex + 1];
  const ordinary = !step.final && !world.nav?.nodes[step.node]?.exact && (!edge || edge.type === 'walk') && !edge?.queue && (!next?.edge || next.edge.type === 'walk') && !next?.edge?.queue;
  // Graph vertices are waypoints, not single-file appointments. Cut only a visible, clear corner.
  if (ordinary && Math.hypot(step.x - agent.x, step.y - agent.y) < 16 &&
      (!next || !world.blockers?.some(b => segmentIntersectsRect(agent.x, agent.y, next.x, next.y, b)))) {
    agent.nodeId = step.node; agent.pathIndex++;
    if (agent.pathIndex >= agent.path.length) arrive(agent, world);
    return;
  }
  if (edge?.queue && agent.passedQueue !== edge) {
    agent.state = 'queue';
    agent.queue = edge.queue;
    agent.queueResume = edge;
    agent.queue.join(agent);
    return;
  }
  let speed = agent.jogging ? agent.walkSpeed : agent.walkSpeed;
  let mode = agent.jogging ? 'jog' : 'walk';
  if (edge?.type === 'escalator') {
    speed = ESCALATOR_SPEED + (agent.escalatorWalker ? agent.walkSpeed * 0.6 : 0);
    mode = agent.escalatorWalker ? 'walk' : 'ride';
  } else if (edge?.type === 'travelator') {
    speed = TRAVELATOR_SPEED + (agent.escalatorWalker ? agent.walkSpeed * 0.8 : 0);
    mode = agent.escalatorWalker ? 'walk' : 'ride';
  }
  agent.mode = mode;
  agent.action = mode === 'walk' && agent.look.carry?.type === 'phone' && agent.id % 5 === 0 ? 'phone' : null;
  if (stepTowards(agent, step.x, step.y, speed, dt, world, !!edge && edge.type !== 'walk')) {
    if (!step.final) agent.nodeId = step.node;
    if (edge?.queue) agent.passedQueue = null;
    agent.pathIndex++;
    if (agent.pathIndex >= agent.path.length) arrive(agent, world);
  }
}

function inQueue(agent, world, dt) {
  const q = agent.queue;
  agent.queueWait = (agent.queueWait ?? 0) + dt;
  if (q.maxWait && agent.queueWait > q.maxWait) {
    q.leave(agent); agent.queue = null; agent.queueWait = 0; agent.atFront = false;
    agent.state = 'idle'; agent.timer = .2; agent.task = null;
    return;
  }
  const index = q.indexOf(agent);
  if (index < 0) return;
  const slot = q.slotPosition(index);
  const reached = stepTowards(agent, slot.x, slot.y, agent.walkSpeed * 0.75, dt, world, true);
  if (reached) {
    agent.mode = 'stand';
    agent.dir = q.facing;
    agent.action = index === 0 ? q.action : agent.look.carry?.type === 'phone' && agent.id % 3 === 0 ? 'phone' : null;
  } else {
    agent.mode = 'walk';
  }
  agent.atFront = index === 0 && reached;
}

/** Called by the world when a queue releases its front member. */
export function servedByQueue(agent, world) {
  const q = agent.queue;
  agent.queue = null;
  agent.queueWait = 0;
  agent.atFront = false;
  agent.action = null;
  if (agent.queueResume) {
    agent.passedQueue = agent.queueResume;
    agent.queueResume = null;
    agent.state = 'travel';
    return;
  }
  const poi = agent.task?.poi;
  if (poi?.onServed?.(agent, world) === true) return;
  if (poi?.exitNode >= 0) agent.nodeId = poi.exitNode;
  agent.state = 'idle';
  agent.timer = world.rng.range(0.2, 1);
  void q;
}

export function updateAgent(agent, world, dt) {
  if (agent.state !== 'travel' && agent.state !== 'queue') { agent.vx = 0; agent.vy = 0; }
  switch (agent.state) {
    case 'idle':
      agent.mode = 'stand';
      agent.timer -= dt;
      if (agent.timer <= 0) startTask(agent, world);
      break;
    case 'travel':
      travel(agent, world, dt);
      break;
    case 'activity':
      agent.timer -= dt;
      if (agent.timer <= 0) {
        if (agent.poi) agent.poi.occupants = Math.max(0, agent.poi.occupants - 1);
        agent.poi?.onDone?.(agent, world);
        agent.poi = null;
        agent.sortBias = 0;
        agent.state = 'idle';
        agent.timer = world.rng.range(0.1, 1.2);
      }
      break;
    case 'queue':
      inQueue(agent, world, dt);
      break;
    case 'visit':
      updateVisit(agent, world, dt);
      break;
    case 'fixed':
      agent.timer -= dt;
      if (agent.timer <= 0 && agent.fixedActions) {
        agent.action = world.rng.pick(agent.fixedActions);
        agent.timer = world.rng.range(2, 6);
      }
      break;
    default:
      break;
  }
  agent.sortY = agent.y + agent.sortBias;
  agent.z = world.zAt ? world.zAt(agent.x, agent.y) : 0;
}

/** A finite, reserved interior visit. Search targets never enter hidden interiors. */
export function startVisit(agent, world, { enter, exit, duration, controller, returnAt = null, onUse = null, onComplete = null }) {
  if (agent.isWiggles) throw new Error('Mr. Wiggles cannot enter an off-scene activity');
  agent.state = 'visit';
  agent.mode = 'walk'; agent.action = null;
  agent.visit = { phase: 'enter', points: enter, index: 0, exit, timer: duration, controller, returnAt, onUse, onComplete, elapsed: 0 };
  controller?.inside.add(agent.id);
  void world;
}

function updateVisit(agent, world, dt) {
  const v = agent.visit;
  v.elapsed += dt;
  if (v.phase === 'use') {
    agent.mode = 'sit'; agent.hidden = true;
    v.timer -= dt;
    if (v.timer > 0) return;
    let reentry;
    if (v.returnAt) {
      reentry = (Array.isArray(v.returnAt) ? v.returnAt : [v.returnAt]).find(p => !world.crowd || world.crowd.canPlace(agent, p.x, p.y));
      if (!reentry) return;
      agent.x = reentry.x; agent.y = reentry.y;
      agent.nodeId = world.nav.nearest(agent.x, agent.y);
    }
    v.phase = 'exit'; v.points = reentry?.exit ? [reentry.exit] : v.exit; v.index = 0;
    agent.hidden = false;
  }
  const point = v.points[v.index];
  agent.mode = 'walk';
  if (point && !stepTowards(agent, point.x, point.y, agent.walkSpeed * .75, dt, world, true)) return;
  v.index++;
  if (v.index < v.points.length) return;
  if (v.phase === 'enter') {
    v.phase = 'use'; agent.hidden = true;
    v.onUse?.(agent, world);
  } else {
    v.controller?.inside.delete(agent.id);
    if (v.controller) v.controller.completed++;
    const poi = agent.poi ?? agent.task?.poi;
    if (poi && !poi.queue) { poi.occupants = Math.max(0, poi.occupants - 1); poi.release?.(agent); }
    v.onComplete?.(agent, world);
    agent.visit = null; agent.poi = null; agent.task = null;
    agent.hidden = false; agent.sortBias = 0; agent.state = 'idle'; agent.timer = 1;
    agent.nodeId = world.nav.nearest(agent.x, agent.y, { filter: n => !n.exact && !n.hidden });
  }
}

export function agentPose(agent, t) {
  return { dir: agent.dir, mode: agent.mode, phase: agent.phase, t, action: agent.action, seed: agent.seed };
}

/** Picture-space bounding box covering the head, hat and held items. */
export function agentBounds(agent, P) {
  const s = P.s(agent.y);
  const bounds = spriteBounds(agent.look);
  const px = P.X(agent.x, agent.y);
  const py = P.Y(agent.y, agent.z ?? 0);
  return { x: px + bounds.L * s, y: py + bounds.T * s, w: (bounds.R - bounds.L) * s, h: (bounds.B - bounds.T) * s };
}
