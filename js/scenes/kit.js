import { NavGraph, Queue } from '../core/nav.js';
import { inflate, pointInRect, rectsOverlap, segmentIntersectsRect } from '../core/geometry.js';
import { drawEscalator, drawTravelator } from './props.js';

/**
 * The scene toolkit. A scene's `build(kit)` function uses this API to lay out
 * floors, props, walkable areas, points of interest and moving stairways.
 * Nothing here touches a canvas at build time, so scenes are testable in Node.
 *
 * Layers (drawn in this order):
 *  - floor:   static, cached to an offscreen bitmap
 *  - dynamic: animated, drawn under people (trains, escalator steps …)
 *  - props + agents: depth-sorted by their base y so people walk behind things
 */
export function createKit({ rng, width, height, difficulty }) {
  const nav = new NavGraph();
  const pending = [];

  const kit = {
    rng,
    W: width,
    H: height,
    d: difficulty,
    nav,
    background: '#d9d4c7',
    floor: [],
    dynamic: [],
    props: [],
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

    defineLevel(name, rect) {
      kit.levels.push({ name, rect });
    },

    levelAt(x, y) {
      const level = kit.levels.find((l) => pointInRect(x, y, l.rect));
      return level ? level.name : kit.levels[0]?.name ?? 'main';
    },

    addFloor(bounds, draw) {
      kit.floor.push({ bounds, draw });
    },

    addDynamic(obj) {
      kit.dynamic.push(obj);
      return obj;
    },

    /** A depth-sorted prop. `y` is the ground line used for sorting. */
    addProp({ y, bounds, draw, block = null }) {
      const prop = { sortY: y, bounds, draw };
      kit.props.push(prop);
      if (block) kit.block(block);
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

    escalator({ x, yTop, yBottom, width = 26, dir = 'up', connect = 'both' }) {
      const rect = { x: x - width / 2, y: yTop, w: width, h: yBottom - yTop };
      kit.block(inflate(rect, 4));
      const top = kit.node(x, yTop - 8, { exact: true });
      const bottom = kit.node(x, yBottom + 8, { exact: true });
      if (dir === 'up') nav.link(bottom, top, { type: 'escalator' });
      else nav.link(top, bottom, { type: 'escalator' });
      if (connect !== 'bottom') kit.connectLater(top, 3);
      if (connect !== 'top') kit.connectLater(bottom, 3);
      kit.addDynamic({ bounds: inflate(rect, 12), draw: (ctx, t) => drawEscalator(ctx, rect, dir, t) });
      return { top, bottom, rect };
    },

    travelator({ x1, x2, y, dir = 'right', height: h = 22 }) {
      const rect = { x: Math.min(x1, x2), y: y - h / 2, w: Math.abs(x2 - x1), h };
      kit.block(inflate(rect, 3));
      const left = kit.node(rect.x - 10, y, { exact: true });
      const right = kit.node(rect.x + rect.w + 10, y, { exact: true });
      if (dir === 'right') nav.link(left, right, { type: 'travelator' });
      else nav.link(right, left, { type: 'travelator' });
      kit.connectLater(left, 3);
      kit.connectLater(right, 3);
      kit.addDynamic({ bounds: inflate(rect, 6), draw: (ctx, t) => drawTravelator(ctx, rect, dir, t) });
      return rect;
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
      kit.pois = kit.pois.filter((p) => p.node >= 0);
      return kit;
    },
  };
  return kit;
}
