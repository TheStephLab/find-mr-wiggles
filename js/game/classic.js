import { createCrowdLook, WIGGLES_LOOK, pickName } from './people.js';
import { agentBounds } from './agents.js';
import { spriteBounds } from './draw-person.js';
import { box, text, OUT } from '../scenes/props.js';
import { onFront, poly } from '../scenes/draw3d.js';
import { circle } from '../scenes/venue-props.js';

// Each location has its own visual vocabulary, not a random paused crowd.
const STORIES = {
  'whistlebury-junction': ['cases', 'music', 'maps', 'picnic', 'toys', 'books'],
  'skyhaven-international': ['maps', 'cases', 'planes', 'portrait', 'balloons', 'picnic'],
  'copperleaf-galleria': ['hats', 'toys', 'books', 'portrait', 'picnic', 'shoes'],
  'little-lantern-market': ['fruit', 'pies', 'flowers', 'music', 'books', 'cases'],
  'bramblewick-fairground': ['ducks', 'balloons', 'hats', 'music', 'picnic', 'toys'],
};
const COLOURS = ['#cc805b', '#5b9690', '#d9b04f', '#81789f', '#b5677e', '#72945c'];
const POSES = [
  { mode: 'walk', dir: 'right' }, { mode: 'walk', dir: 'left' }, { mode: 'jog', dir: 'right' },
  { mode: 'stand', dir: 'down', action: 'wave' }, { mode: 'stand', dir: 'left', action: 'phone' },
  { mode: 'stand', dir: 'down', action: 'read' }, { mode: 'stand', dir: 'right', action: 'drink' },
  { mode: 'stand', dir: 'up', action: 'reach' }, { mode: 'stand', dir: 'down', action: 'clap' },
];

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** True when foreground scenery or another figure hides this picture-space point. */
export function classicPointVisible(world, actor, x, y) {
  if ((world.classicOccluders ?? world.occluders).some(o => o.sortY > actor.sortY && contains(o.rect, x, y))) return false;
  const neighbours = world.classicIndex?.get(`${Math.floor(x / 64)},${Math.floor(y / 64)}`) ?? world.agents;
  return !neighbours.some(a => a !== actor && a.sortY > actor.sortY && contains(world.classicFigureBounds?.get(a) ?? world.boundsOf(a), x, y));
}

function targetSamples(world, actor) {
  const k = world.P.s(actor.y), x = world.P.X(actor.x, actor.y), y = world.P.Y(actor.y, actor.z);
  return [[0, 45], [-3, 39], [3, 39], [0, 33], [-3, 25], [3, 25], [0, 18], [0, 10]]
    .map(([dx, dy]) => ({ x: x + dx * k, y: y - dy * k }))
    .filter(p => classicPointVisible(world, actor, p.x, p.y));
}

/**
 * Compose a reproducible still picture: narrative islands, browsing clusters,
 * seated groups and crossing streams. All figure and decoration times are fixed.
 * No animation simulation is needed after this function returns.
 */
export function composeClassic(world, kit) {
  const { rng, P, difficulty: d } = world;
  const fixedTime = 12.5;
  world.time = fixedTime;
  // Pick a useful transport tableau once (docked trains, passing aircraft, rides).
  for (let i = 0; i < 250; i++) for (const obj of world.dynamic) obj.update?.(.05, i * .05);
  world.dynamic = world.dynamic.map(obj => {
    if (obj.parts) {
      const parts = obj.parts();
      return { parts: () => parts };
    }
    return { bounds: obj.bounds, draw: ctx => obj.draw(ctx, fixedTime, P) };
  });
  world.agents = [];
  world.tableaux = [];
  const stories = STORIES[world.scene.id];
  const occupied = [];
  let serial = 0;
  const add = (x, y, pose, { role, carry, uniform } = {}) => {
    if (x < 24 || x > world.width - 24 || y < 26 || y > world.height - 26) return null;
    const chosen = role ?? rng.weighted(kit.roles.map(r => [r.role, r.weight]));
    const look = createCrowdLook(rng, { role: chosen, uniform, decoyRate: d.decoyRate, maxDecoyTraits: d.maxDecoyTraits, paletteBias: d.paletteBias });
    if (carry) look.carry = { type: carry, color: rng.pick(COLOURS) };
    const a = {
      id: ++serial, name: pickName(rng), role: chosen, look, x, y, z: kit.zAt(x, y), sortY: y,
      state: 'illustration', phase: rng.range(0, Math.PI * 2), seed: rng.range(0, 10),
      poseTime: fixedTime + rng.range(0, 8), action: null, ...pose,
    };
    world.agents.push(a);
    occupied.push({ x, y });
    return a;
  };
  const anchors = rng.shuffle(world.openNodes).filter(n => kit.isFree({ x: n.x - 62, y: n.y - 35, w: 124, h: 75 }));
  for (const n of anchors) {
    if (world.tableaux.length >= 22 + d.level * 6) break;
    if (world.tableaux.some(g => Math.hypot(n.x - g.x, n.y - g.y) < 125)) continue;
    const kind = stories[world.tableaux.length % stories.length];
    const group = { kind, x: n.x, y: n.y, z: kit.zAt(n.x, n.y) };
    world.tableaux.push(group);
    kit.addProp({
      y: n.y, box: { x: n.x - 47, y: n.y - 12, w: 94, d: 24, h: 83, z: group.z },
      solid: { x: n.x - 35, y: n.y, w: 70, h: 42, z: group.z },
      draw: ctx => onFront(ctx, P, n.x, n.y, group.z, c => drawTableau(c, kind, world.tableaux.indexOf(group))),
    });
    for (const [i, [dx, dy]] of [[-54, 0], [53, 0], [-28, 31], [5, 37], [35, 30], [-18, -22]].entries()) {
      if (kit.isFree({ x: n.x + dx - 4, y: n.y + dy - 3, w: 8, h: 6 }) && kit.visibility(n.x + dx, n.y + dy) >= .5) {
        const seated = i === 2 && ['picnic', 'books', 'portrait'].includes(kind);
        if (seated) kit.addProp({
          y: n.y + dy - 1,
          box: { x: n.x + dx - 8, y: n.y + dy - 4, w: 16, d: 8, h: 13, z: group.z },
          draw: ctx => onFront(ctx, P, n.x + dx, n.y + dy, group.z, c => {
            box(c, -8, -15, 16, 4, '#b78a58', OUT, .6, 2);
            for (const x of [-6, 5]) box(c, x, -11, 2, 11, '#876645', OUT, .4);
          }),
        });
        add(n.x + dx, n.y + dy, {
          mode: seated ? 'sit' : 'stand',
          dir: i < 2 ? (i ? 'left' : 'right') : i === 5 ? 'down' : 'up',
          action: kind === 'music' ? (i < 2 ? 'guitar' : 'clap') : ['read', 'reach', 'wave', null, 'phone', 'reach'][i],
        }, { role: i === 4 ? 'child' : 'tourist', carry: kind === 'music' && i < 2 ? 'guitar' : undefined });
      }
    }
  }
  // Keep shopkeepers and genuine seats/counter groupings from the architecture.
  for (const station of kit.stations) add(station.x, station.y, { mode: station.mode, dir: station.dir, action: station.action ?? rng.pick(station.fixedActions ?? [null]) }, { role: 'staff', uniform: station.uniform });
  for (const poi of kit.pois) {
    if (poi.queue || rng.chance(.42)) continue;
    if (occupied.some(p => Math.hypot(p.x - poi.x, p.y - poi.y) < 13)) continue;
    add(poi.x, poi.y, { mode: poi.mode, dir: poi.facing, action: rng.pick(poi.actions) });
  }
  // Jittered crossing streams and family groups fill the lanes without rigid rows.
  const slots = [];
  const step = 22;
  for (let y = 42; y < world.height - 32; y += step) {
    for (let x = 34; x < world.width - 32; x += step) {
      const px = x + rng.range(-8, 8), py = y + rng.range(-8, 8);
      if (!kit.isFree({ x: px - 5, y: py - 4, w: 10, h: 8 }) || kit.visibility(px, py) < .5) continue;
      if (world.tableaux.some(g => Math.abs(px - g.x) < 50 && Math.abs(py - g.y) < 24)) continue;
      slots.push({ x: px, y: py });
    }
  }
  const wanted = [900, 1450, 2100, 2800, 3500][d.level - 1];
  for (const p of rng.shuffle(slots)) {
    if (world.agents.length >= wanted) break;
    if (occupied.some(o => Math.abs(o.x - p.x) < 16 && Math.abs(o.y - p.y) < 19)) continue;
    add(p.x, p.y, POSES[serial % POSES.length]);
  }
  // The same full figure model and density rules apply to every possible target.
  // Conservative artwork extents include non-solid signs, tall tableaux, arms
  // and carried items: a static target must never rely on a gap inside a prop.
  world.classicOccluders = [...world.occluders, ...world.props.map(p => ({ sortY: p.sortY, rect: p.bounds })),
    ...world.dynamic.flatMap(d => d.parts?.().map(p => ({ sortY: p.sortY, rect: p.bounds })) ?? [])];
  world.classicFigureBounds = new WeakMap();
  world.classicIndex = new Map();
  for (const a of world.agents) {
    const extents = spriteBounds(a.look), k = P.s(a.y);
    const b = { x: P.X(a.x, a.y) + extents.L * k, y: P.Y(a.y, a.z) + extents.T * k, w: (extents.R - extents.L) * k, h: (extents.B - extents.T) * k };
    world.classicFigureBounds.set(a, b);
    for (let x = Math.floor(b.x / 64); x <= Math.floor((b.x + b.w) / 64); x++) {
      for (let y = Math.floor(b.y / 64); y <= Math.floor((b.y + b.h) / 64); y++) {
        const key = `${x},${y}`;
        if (!world.classicIndex.has(key)) world.classicIndex.set(key, []);
        world.classicIndex.get(key).push(a);
      }
    }
  }
  const candidates = [];
  for (const a of world.agents) {
    if (a.role === 'staff' || a.role === 'child' || a.dir === 'up' || a.mode === 'sit') continue;
    const samples = targetSamples(world, a);
    if (samples.length >= 5 && world.visibility(a.x, a.y, a.z) >= .75) candidates.push({ actor: a, samples });
  }
  if (candidates.length < 8) throw new Error(`Classic composition ${world.scene.id} has only ${candidates.length} safe target placements`);
  // Require safety for the actual reference outfit's height before choosing.
  const safe = candidates.filter(({ actor }) => {
    const look = actor.look;
    actor.look = WIGGLES_LOOK;
    const visible = targetSamples(world, actor);
    actor.look = look;
    return visible.length >= 5;
  });
  if (safe.length < 8) throw new Error(`Classic composition ${world.scene.id} needs more reference-height target placements`);
  world.classicPlacements = safe.map(({ actor }) => ({ x: actor.x, y: actor.y }));
  const { actor } = rng.pick(safe);
  Object.assign(actor, { look: WIGGLES_LOOK, isWiggles: true, name: 'Mr. Wiggles', role: 'wiggles', action: null });
  world.wiggles = actor;
  // Recheck with Wiggles' actual height and bounds, not the previous person's.
  const visible = targetSamples(world, actor);
  world.targetVisibility = visible.length / 8;
  if (visible.length < 5) throw new Error(`Classic target is insufficiently visible in ${world.scene.id}`);
  const target = visible.find(p => p.y > P.Y(actor.y, actor.z) - 34 * P.s(actor.y)) ?? visible[0];
  world.wigglesPoint = () => ({ ...target });
  world.isWigglesAt = (x, y, tolerance = 0) => {
    const b = agentBounds(actor, P);
    return x >= b.x - tolerance && x <= b.x + b.w + tolerance && y >= b.y - tolerance && y <= b.y + b.h + tolerance
      && classicPointVisible(world, actor, x, y);
  };
}

function drawTableau(c, kind, index) {
  const colour = COLOURS[index % COLOURS.length];
  c.lineWidth = .7;
  c.lineJoin = 'round';
  if (index % 3 === 0) {
    poly(c, [[-42, 4], [36, 4], [44, 27], [-48, 27]], '#d3a575', OUT, .5);
    c.strokeStyle = '#f0d5a5'; c.lineWidth = 1;
    for (let x = -35; x < 35; x += 10) { c.beginPath(); c.moveTo(x, 7); c.lineTo(x + 2, 23); c.stroke(); }
  }
  if (index % 3 === 1) {
    for (let i = 0; i < 3; i++) {
      const x = 38 + i % 2 * 9, y = 8 + i * 5;
      poly(c, [[x - 5, y], [x + 5, y - 2], [x + 6, y + 5], [x - 4, y + 6]], '#f1e3bc', OUT, .4);
      c.strokeStyle = colour; c.beginPath(); c.moveTo(x - 2, y + 2); c.lineTo(x + 3, y + 1); c.stroke();
    }
  }
  if (['cases', 'books', 'shoes', 'hats'].includes(kind)) {
    for (let i = 0; i < 9; i++) {
      const x = -30 + i % 3 * 22 + (Math.floor(i / 3) % 2) * 4, y = -7 - Math.floor(i / 3) * 13;
      const fill = COLOURS[(i + index) % COLOURS.length];
      if (kind === 'books') {
        box(c, x, y - 7, 22, 7, fill, OUT, .5, 1); c.fillStyle = '#f5e5c2'; c.fillRect(x + 2, y - 5, 17, 3);
      } else if (kind === 'hats') {
        box(c, x + 4, y - 17, 13, 17, fill, OUT, .6, 3); box(c, x, y - 4, 23, 4, '#e2bc68', OUT, .6, 2);
      } else if (kind === 'shoes') {
        box(c, x, y - 7, 20, 7, fill, OUT, .6, 3); box(c, x + 3, y - 13, 8, 8, fill, OUT, .6, 2);
      } else {
        box(c, x, y - 15, 23, 17, fill, OUT, .7, 3);
        box(c, x + 7, y - 18, 8, 3, '#eed9ab', OUT, .5, 1);
        c.fillStyle = '#ebd0a1'; c.fillRect(x + 5, y - 13, 2, 13); c.fillRect(x + 16, y - 13, 2, 13);
        box(c, x + 9, y - 7, 6, 5, '#f3e3bc', OUT, .3);
      }
    }
    if (kind === 'cases') {
      c.strokeStyle = '#bd9c6c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-36, 0); c.lineTo(34, 0); c.lineTo(42, -36); c.stroke();
      circle(c, -24, 5, 4, '#394e50'); circle(c, 28, 5, 4, '#394e50');
    }
  } else if (['fruit', 'pies', 'picnic', 'ducks', 'flowers'].includes(kind)) {
    box(c, -33, -7, 66, 8, '#a47d52', OUT, .6, 2);
    for (const x of [-26, 25]) box(c, x, 0, 3, 13, '#795940', OUT, .5);
    for (let i = 0; i < 8; i++) {
      const x = -27 + i % 4 * 17, y = -13 - Math.floor(i / 4) * 11;
      if (kind === 'fruit') {
        circle(c, x, y, 6, i % 2 ? '#bc6550' : '#d2b653', OUT);
        c.fillStyle = '#5e8652'; c.fillRect(x, y - 8, 1, 4);
      } else if (kind === 'ducks') {
        c.beginPath(); c.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2); c.fillStyle = '#dfb84b'; c.fill(); c.strokeStyle = OUT; c.stroke();
        circle(c, x + 4, y - 5, 4, '#efce66', OUT); poly(c, [[x + 7, y - 6], [x + 12, y - 4], [x + 7, y - 3]], '#ce7b4b', OUT, .4);
      } else if (kind === 'flowers') {
        box(c, x - 4, y, 9, 7, '#b88958', OUT, .4, 1);
        for (let f = 0; f < 3; f++) { c.strokeStyle = '#4f805b'; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 5 + f * 5, y - 16); c.stroke(); circle(c, x - 5 + f * 5, y - 17, 3.6, COLOURS[(i + f) % 6], OUT); }
      } else {
        box(c, x - 6, y - 2, 14, 4, '#f2e4bf', OUT, .4, 2);
        if (kind === 'pies') {
          box(c, x - 5, y - 8, 12, 7, '#c99955', OUT, .5, 4);
          c.strokeStyle = '#f0d58c'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x - 3, y - 6); c.lineTo(x + 3, y - 3); c.moveTo(x + 3, y - 6); c.lineTo(x - 3, y - 3); c.stroke();
        } else box(c, x - 4, y - 12, 7, 10, colour, OUT, .5, 2);
      }
    }
    if (kind === 'fruit') for (const [x, y] of [[-35, 12], [32, 15], [41, 7], [21, 24]]) circle(c, x, y, 4, '#bc6550', OUT);
  } else if (kind === 'portrait' || kind === 'maps') {
    poly(c, [[-22, 10], [0, -65], [23, 10]], '#ad8957', OUT, .7);
    box(c, -26, -60, 52, 40, '#f3e3bd', OUT, .8, 2);
    if (kind === 'portrait') {
      circle(c, 0, -47, 8, '#d4a67f', OUT);
      box(c, -12, -40, 24, 16, colour, OUT, .5, 4);
      box(c, -9, -57, 18, 4, '#54847b', OUT, .5, 2);
    } else {
      c.strokeStyle = '#799886'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -49); c.lineTo(-3, -35); c.lineTo(12, -52); c.lineTo(21, -34); c.stroke();
      for (const [x, y] of [[-11, -42], [14, -39], [0, -54]]) circle(c, x, y, 3, '#c98061', OUT);
    }
  } else if (kind === 'balloons') {
    for (let i = 0; i < 7; i++) {
      const x = Math.sin(i * 2) * 23, y = -47 - (i % 3) * 13;
      c.strokeStyle = '#877557'; c.lineWidth = .5; c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(x - 10, -20, x, y); c.stroke();
      c.beginPath(); c.ellipse(x, y, 10, 13, .1 * i, 0, Math.PI * 2); c.fillStyle = COLOURS[i % 6]; c.fill(); c.strokeStyle = OUT; c.stroke();
      circle(c, x - 3, y - 5, 2, '#f2dcae');
    }
    box(c, -12, -4, 24, 17, '#b78a56', OUT, .7, 2);
  } else if (kind === 'music') {
    box(c, -31, -3, 62, 7, '#a77952', OUT, .7, 3);
    box(c, -25, -11, 50, 8, '#533a32', OUT, .6, 2);
    c.fillStyle = '#dbb75e';
    for (let i = 0; i < 7; i++) circle(c, -18 + i * 6, -7, 1.4, '#dfc779');
    poly(c, [[15, -12], [22, -58], [30, -12]], '#455b59', OUT, .6);
    box(c, 9, -61, 28, 18, '#edddb4', OUT, .6);
    text(c, '♪', 23, -52, { size: 11, colour: '#425b59' });
  } else if (kind === 'planes') {
    for (let i = 0; i < 9; i++) {
      const x = -33 + i % 3 * 24, y = -9 - Math.floor(i / 3) * 19;
      poly(c, [[x - 10, y], [x + 16, y - 9], [x + 4, y + 5], [x + 1, y - 2]], '#f5e9cd', '#617e82', .6);
    }
  } else {
    box(c, -34, -14, 68, 16, '#60948c', OUT, .7, 3);
    for (const x of [-23, 23]) circle(c, x, 6, 6, '#415b5b', OUT);
    for (let i = 0; i < 6; i++) {
      const x = -25 + i % 3 * 21, y = -22 - Math.floor(i / 3) * 17;
      box(c, x, y, 16, 14, COLOURS[i], OUT, .7, 2);
      text(c, ['A', 'B', 'C'][i % 3], x + 8, y + 7, { size: 8, colour: '#f7e9c5' });
    }
  }
}
