import { NavGraph, Queue } from '../core/nav.js';
import { inflate, pointInRect, rectsOverlap, segmentIntersectsRect } from '../core/geometry.js';
import { createProjection, projectBox } from '../core/projection.js';
import { drawEscalator, drawTravelator } from './props.js';

/**
 * The scene toolkit. A scene's `build(kit)` lays out floors, 3D props,
 * walkable areas, points of interest and moving stairways in world space
 * (x across, y depth, z height). Nothing here touches a canvas at build time,
 * so scenes are testable in Node.
 *
 * Draw layers, in order:
 *  - backdrop + floor: static, rendered once in perspective and cached
 *  - underlay: animated things on the ground that people stand on (escalators…)
 *  - props, dynamic parts and people: depth-sorted by their nearest ground y
 */
export function createKit({ rng, width, height, difficulty, view = {}, mode = 'animated' }) {
  const nav = new NavGraph();
  const P = createProjection({ width, height, ...view });
  const pending = [];

  const kit = {
    rng,
    mode,
    clock: mode === 'classic' ? new Date('2026-10-24T10:08:00Z') : undefined,
    W: width,
    H: height,
    d: difficulty,
    P,
    nav,
    background: '#d9d4c7',
    backdrop: null,
    floor: [],
    dynamic: [],
    props: [],
    occluders: [],
    ramps: [],
    pois: [],
    queues: [],
    stations: [],
    blockers: [],
    levels: [],
    roles: [{ role: 'commuter', weight: 1 }],

    /** Scale a base count by the difficulty's prop density. */
    count(base, min = 0) {
      return Math.max(min, Math.round(base * difficulty.propDensity));
    },

    /** A walkable level. `z` raises the whole level (e.g. an upper concourse). */
    defineLevel(name, rect, { z = 0 } = {}) {
      kit.levels.push({ name, rect, z });
    },

    levelAt(x, y) {
      const level = kit.levels.find((l) => pointInRect(x, y, l.rect));
      return level ? level.name : kit.levels[0]?.name ?? 'main';
    },

    /** Ground height at (x, y), including escalator and travelator ramps. */
    zAt(x, y) {
      for (const r of kit.ramps) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          return r.z0 + ((y - r.y) / r.h) * (r.z1 - r.z0);
        }
      }
      return kit.floorZ(x, y);
    },

    /** Floor height ignoring ramps. */
    floorZ(x, y) {
      const level = kit.levels.find((l) => pointInRect(x, y, l.rect));
      return level ? level.z : 0;
    },

    addFloor(bounds, draw) {
      kit.floor.push({ bounds, draw });
    },

    /**
     * Something animated. Give it `draw(ctx, t, P)` to draw under people, or
     * `parts()` returning [{ sortY, bounds, draw }] to be depth-sorted with them.
     */
    addDynamic(obj) {
      if (!obj.bounds && obj.box) obj.bounds = projectBox(P, obj.box, 6);
      kit.dynamic.push(obj);
      return obj;
    },

    /**
     * A depth-sorted prop. `y` is its nearest ground line (used for sorting).
     * `box` ({x, y, w, d, h, z}) sizes it for culling; `solid` boxes also hide
     * whoever is behind them (used for the "always reappears" checks).
     */
    addProp({ y, box, bounds, draw, block = null, solid = null }) {
      const picture = bounds ?? projectBox(P, box, 6);
      const prop = { sortY: y, bounds: picture, draw };
      kit.props.push(prop);
      if (block) kit.block(block);
      const solids = solid === true ? [box] : solid ? [].concat(solid) : [];
      for (const b of solids) kit.occluders.push({ sortY: y, rect: projectBox(P, b, 0) });
      return prop;
    },

    block(rect) {
      kit.blockers.push(rect);
    },

    isFree(rect, pad = 0) {
      const r = inflate(rect, pad);
      return !kit.blockers.some((b) => rectsOverlap(b, r));
    },

    grid(rect, spacing = 64, { level, tags = [] } = {}) {
      const lvl = level ?? kit.levelAt(rect.x + rect.w / 2, rect.y + rect.h / 2);
      return nav.addGrid(rect, spacing, {
        level: lvl,
        tags,
        blockers: kit.blockers.filter((b) => rectsOverlap(b, inflate(rect, 20))),
        margin: 8,
      });
    },

    node(x, y, { level, exact = false, tags = [] } = {}) {
      return nav.addNode(x, y, { level: level ?? kit.levelAt(x, y), exact, tags });
    },

    link(a, b, opts) {
      nav.link(a, b, opts);
    },

    /** Join `nodeId` to its nearest walkable neighbours once all grids exist. */
    connectLater(nodeId, count = 2) {
      pending.push({ nodeId, count });
    },

    poi(opts) {
      const poi = {
        node: -1,
        occupants: 0,
        capacity: 1,
        weight: 1,
        duration: [4, 12],
        mode: 'stand',
        facing: 'up',
        actions: [null],
        sortBias: 0,
        ...opts,
      };
      poi.level = opts.level ?? kit.levelAt(poi.x, poi.y);
      kit.pois.push(poi);
      return poi;
    },

    /** A queue you join as an activity (check-in desk, coffee counter …). */
    queue({ slots, facing = 'up', serviceTime = [3, 6], action = 'reach', exit, weight = 1.5, onServed, requires }) {
      const q = new Queue({ slots, facing, serviceTime, action, rng });
      kit.queues.push(q);
      const tail = q.slotPosition(slots.length);
      return kit.poi({ x: tail.x, y: tail.y, queue: q, exit, weight, onServed, requires, level: kit.levelAt(slots[0].x, slots[0].y) });
    },

    /** A queue that gates a one-way passage (e.g. airport security). */
    gateQueue({ slots, entry, exit, facing = 'up', serviceTime = [1.5, 3], action = null }) {
      const q = new Queue({ slots, facing, serviceTime, action, rng });
      kit.queues.push(q);
      const a = kit.node(entry.x, entry.y, { exact: true });
      const b = kit.node(exit.x, exit.y, { exact: true });
      nav.link(a, b, { type: 'walk', oneWay: true, queue: q });
      kit.connectLater(a, 3);
      kit.connectLater(b, 3);
      return { queue: q, entryNode: a, exitNode: b };
    },

    /** A permanently stationed character (shopkeeper, busker, desk staff …). */
    station(opts) {
      kit.stations.push({ dir: 'down', mode: 'stand', action: null, sortBias: 0, ...opts });
    },

    /** A moving stairway between the near (bottom) end and the far (top) end. */
    escalator({ x, yTop, yBottom, width = 26, dir = 'up', connect = 'both' }) {
      const rect = { x: x - width / 2, y: yTop, w: width, h: yBottom - yTop };
      const zTop = kit.floorZ(x, yTop - 12);
      const zBottom = kit.floorZ(x, yBottom + 12);
      kit.block(inflate(rect, 4));
      kit.ramps.push({ x: rect.x - 6, y: rect.y, w: rect.w + 12, h: rect.h, z0: zTop, z1: zBottom });
      const top = kit.node(x, yTop - 8, { exact: true });
      const bottom = kit.node(x, yBottom + 8, { exact: true });
      if (dir === 'up') nav.link(bottom, top, { type: 'escalator' });
      else nav.link(top, bottom, { type: 'escalator' });
      if (connect !== 'bottom') kit.connectLater(top, 3);
      if (connect !== 'top') kit.connectLater(bottom, 3);
      kit.addDynamic({
        bounds: projectBox(P, { x: rect.x - 6, y: rect.y - 10, w: rect.w + 12, d: rect.h + 20, h: Math.max(zTop, zBottom) + 30, z: 0 }, 6),
        draw: (ctx, t) => drawEscalator(ctx, P, rect, dir, zTop, zBottom, t),
      });
      return { top, bottom, rect };
    },

    travelator({ x1, x2, y, dir = 'right', height: h = 22 }) {
      const rect = { x: Math.min(x1, x2), y: y - h / 2, w: Math.abs(x2 - x1), h };
      const z = kit.floorZ(rect.x, y);
      kit.block(inflate(rect, 3));
      kit.ramps.push({ x: rect.x - 12, y: rect.y, w: rect.w + 24, h: rect.h, z0: z + 3, z1: z + 3 });
      const left = kit.node(rect.x - 10, y, { exact: true });
      const right = kit.node(rect.x + rect.w + 10, y, { exact: true });
      if (dir === 'right') nav.link(left, right, { type: 'travelator' });
      else nav.link(right, left, { type: 'travelator' });
      kit.connectLater(left, 3);
      kit.connectLater(right, 3);
      kit.addDynamic({ bounds: projectBox(P, { x: rect.x, y: rect.y, w: rect.w, d: rect.h, h: 16, z }, 6), draw: (ctx, t) => drawTravelator(ctx, P, rect, dir, z, t) });
      return rect;
    },

    /**
     * Fraction (0..1) of a standing person at (x, y) the camera can see,
     * taking solid props in front of them into account.
     */
    visibility(x, y, z = kit.zAt(x, y), height = 40) {
      const s = P.s(y);
      const px = P.X(x, y);
      const base = P.Y(y, z);
      const k = (height / 40) * s;
      let seen = 0;
      for (const [dx, dz] of VIS_SAMPLES) {
        const sx = px + dx * k;
        const sy = base - dz * k;
        let covered = false;
        for (const o of kit.occluders) {
          if (o.sortY > y + 1 && sx >= o.rect.x && sx <= o.rect.x + o.rect.w && sy >= o.rect.y && sy <= o.rect.y + o.rect.h) {
            covered = true;
            break;
          }
        }
        if (!covered) seen++;
      }
      return seen / VIS_SAMPLES.length;
    },

    isHiddenSpot(x, y, z) {
      return kit.visibility(x, y, z) < 0.5;
    },

    /** Resolve deferred links, prune unreachable nodes and attach POIs to the graph. */
    finalize() {
      for (const { nodeId, count } of pending) {
        const node = nav.nodes[nodeId];
        const blockers = kit.blockers.filter((b) => !pointInRect(node.x, node.y, b, 1));
        const candidates = nav
          .liveNodes((n) => n.level === node.level && n.id !== nodeId && !n.exact)
          .map((n) => ({ n, d: (n.x - node.x) ** 2 + (n.y - node.y) ** 2 }))
          .sort((a, b) => a.d - b.d);
        let linked = 0;
        for (const { n, d } of candidates) {
          if (linked >= count || d > 260 ** 2) break;
          if (blockers.some((b) => segmentIntersectsRect(node.x, node.y, n.x, n.y, b))) continue;
          nav.link(nodeId, n.id);
          linked++;
        }
      }
      const main = kit.levels[0]?.rect ?? { x: 0, y: 0, w: width, h: height };
      const root = nav.nearest(main.x + main.w / 2, main.y + main.h / 2, { filter: (n) => !n.exact });
      nav.pruneTo(root);

      const attach = (x, y, level) => {
        const filter = (n) => n.level === level && !n.exact;
        const blockers = kit.blockers.filter((b) => !pointInRect(x, y, b, 1));
        const id = nav.nearest(x, y, { filter, blockers });
        return id >= 0 ? id : nav.nearest(x, y, { filter });
      };
      for (const poi of kit.pois) {
        poi.node = attach(poi.x, poi.y, poi.level);
        if (poi.exit) poi.exitNode = attach(poi.exit.x, poi.exit.y, poi.level);
      }
      // Nobody may linger where the camera can't see them: drop hidden activity spots.
      kit.pois = kit.pois.filter((p) => p.node >= 0 && (p.queue || !kit.isHiddenSpot(p.x, p.y)));
      for (const node of nav.nodes) {
        if (!node.removed) node.hidden = kit.isHiddenSpot(node.x, node.y);
      }
      // Routes avoid long stretches out of sight: walking behind things is allowed but brief.
      for (const edges of nav.adj) {
        for (const e of edges) if (nav.nodes[e.to].hidden) e.cost *= 3;
      }
      return kit;
    },
  };
  return kit;
}

/** Sample points (x offset, height) over a 40-unit person, head first. */
const VIS_SAMPLES = [[0, 46], [0, 38], [-4, 31], [4, 31], [0, 23], [0, 12]];
