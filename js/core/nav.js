import { segmentIntersectsRect, inflate } from './geometry.js';

/**
 * Directed navigation graph. Walk links are added in both directions; moving
 * stairways (escalators, travelators) are one-way. Edges may carry a `queue`
 * (e.g. airport security) which agents must wait in before traversing.
 */
export const EDGE_COST = Object.freeze({ walk: 1, escalator: 0.7, travelator: 0.6 });

export class NavGraph {
  constructor() {
    this.nodes = [];
    this.adj = [];
  }

  addNode(x, y, { level = 'main', tags = [], exact = false } = {}) {
    const id = this.nodes.length;
    this.nodes.push({ id, x, y, level, tags: new Set(tags), exact, removed: false });
    this.adj.push([]);
    return id;
  }

  link(a, b, { type = 'walk', oneWay = type !== 'walk', queue = null } = {}) {
    const na = this.nodes[a];
    const nb = this.nodes[b];
    const cost = Math.hypot(nb.x - na.x, nb.y - na.y) * (EDGE_COST[type] ?? 1) + (queue ? 120 : 0);
    if (!this.adj[a].some((e) => e.to === b)) this.adj[a].push({ from: a, to: b, type, cost, queue });
    if (!oneWay && !this.adj[b].some((e) => e.to === a)) this.adj[b].push({ from: b, to: a, type, cost, queue });
  }

  edge(a, b) {
    return this.adj[a]?.find((e) => e.to === b) ?? null;
  }

  liveNodes(filter) {
    return this.nodes.filter((n) => !n.removed && (!filter || filter(n)));
  }

  /** Nearest live node, optionally filtered and required to have clear line-of-sight. */
  nearest(x, y, { filter, blockers = [] } = {}) {
    let best = -1;
    let bestD = Infinity;
    for (const n of this.nodes) {
      if (n.removed || (filter && !filter(n))) continue;
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d >= bestD) continue;
      if (blockers.length && blockers.some((r) => segmentIntersectsRect(x, y, n.x, n.y, r))) continue;
      bestD = d;
      best = n.id;
    }
    return best;
  }

  /** Dijkstra with a binary heap. Returns node ids from start to goal, or null. */
  findPath(start, goal) {
    if (start === goal) return [start];
    const n = this.nodes.length;
    const distTo = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const heap = new MinHeap();
    distTo[start] = 0;
    heap.push(start, 0);
    while (heap.size) {
      const [u, du] = heap.pop();
      if (u === goal) break;
      if (du > distTo[u]) continue;
      for (const e of this.adj[u]) {
        if (this.nodes[e.to].removed) continue;
        const nd = du + e.cost;
        if (nd < distTo[e.to]) {
          distTo[e.to] = nd;
          prev[e.to] = u;
          heap.push(e.to, nd);
        }
      }
    }
    if (!Number.isFinite(distTo[goal])) return null;
    const path = [];
    for (let at = goal; at !== -1; at = prev[at]) path.push(at);
    return path.reverse();
  }

  reachableFrom(start) {
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const u = stack.pop();
      for (const e of this.adj[u]) {
        if (!this.nodes[e.to].removed && !seen.has(e.to)) {
          seen.add(e.to);
          stack.push(e.to);
        }
      }
    }
    return seen;
  }

  /** Nodes reachable from `root` AND able to get back to it (strongly connected with root). */
  stronglyConnectedWith(root) {
    const forward = this.reachableFrom(root);
    const reverse = new Map();
    this.adj.forEach((edges) => edges.forEach((e) => {
      if (!reverse.has(e.to)) reverse.set(e.to, []);
      reverse.get(e.to).push(e.from);
    }));
    const back = new Set([root]);
    const stack = [root];
    while (stack.length) {
      const u = stack.pop();
      for (const v of reverse.get(u) ?? []) {
        if (!this.nodes[v].removed && !back.has(v)) {
          back.add(v);
          stack.push(v);
        }
      }
    }
    return new Set([...forward].filter((id) => back.has(id)));
  }

  /** Remove every node not strongly connected to `root`. */
  pruneTo(root) {
    const keep = this.stronglyConnectedWith(root);
    for (const node of this.nodes) if (!keep.has(node.id)) node.removed = true;
    return keep.size;
  }

  /**
   * Lay a walkable grid over `rect`, skipping nodes inside blockers and links
   * that would cut through them. Returns a 2D array of node ids (or -1).
   */
  addGrid(rect, spacing, { level = 'main', tags = [], blockers = [], margin = 10, diagonal = true } = {}) {
    const cols = Math.max(1, Math.floor(rect.w / spacing));
    const rows = Math.max(1, Math.floor(rect.h / spacing));
    const sx = rect.w / cols;
    const sy = rect.h / rows;
    const padded = blockers.map((b) => inflate(b, margin));
    const grid = [];
    for (let r = 0; r <= rows; r++) {
      grid.push([]);
      for (let c = 0; c <= cols; c++) {
        const x = rect.x + c * sx;
        const y = rect.y + r * sy;
        const blocked = padded.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
        grid[r].push(blocked ? -1 : this.addNode(x, y, { level, tags }));
      }
    }
    const tryLink = (a, b) => {
      if (a < 0 || b < 0) return;
      const na = this.nodes[a];
      const nb = this.nodes[b];
      if (padded.some((p) => segmentIntersectsRect(na.x, na.y, nb.x, nb.y, p))) return;
      this.link(a, b);
    };
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const id = grid[r][c];
        if (c < cols) tryLink(id, grid[r][c + 1]);
        if (r < rows) tryLink(id, grid[r + 1][c]);
        if (diagonal && r < rows && c < cols) tryLink(id, grid[r + 1][c + 1]);
        if (diagonal && r < rows && c > 0) tryLink(id, grid[r + 1][c - 1]);
      }
    }
    return grid;
  }
}

export class MinHeap {
  constructor() {
    this.items = [];
    this.prios = [];
  }

  get size() {
    return this.items.length;
  }

  push(item, prio) {
    const { items, prios } = this;
    items.push(item);
    prios.push(prio);
    let i = items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (prios[p] <= prios[i]) break;
      [items[p], items[i]] = [items[i], items[p]];
      [prios[p], prios[i]] = [prios[i], prios[p]];
      i = p;
    }
  }

  pop() {
    const { items, prios } = this;
    const top = [items[0], prios[0]];
    const lastItem = items.pop();
    const lastPrio = prios.pop();
    if (items.length) {
      items[0] = lastItem;
      prios[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && prios[l] < prios[m]) m = l;
        if (r < items.length && prios[r] < prios[m]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        [prios[m], prios[i]] = [prios[i], prios[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * A first-come-first-served line with fixed slot positions (slot 0 is the
 * front). Overflow extends the line beyond the final slot.
 */
export class Queue {
  constructor({ slots, serviceTime = [2, 4], facing = 'up', action = null, rng }) {
    if (!slots?.length) throw new Error('Queue needs at least one slot');
    this.slots = slots;
    this.serviceTime = serviceTime;
    this.facing = facing;
    this.action = action;
    this.rng = rng;
    this.members = [];
    this.timer = this.#nextServiceTime();
  }

  #nextServiceTime() {
    const [a, b] = this.serviceTime;
    return a + (this.rng ? this.rng.next() : Math.random()) * (b - a);
  }

  get length() {
    return this.members.length;
  }

  join(member) {
    if (!this.members.includes(member)) this.members.push(member);
    return this.members.indexOf(member);
  }

  leave(member) {
    const i = this.members.indexOf(member);
    if (i >= 0) this.members.splice(i, 1);
  }

  indexOf(member) {
    return this.members.indexOf(member);
  }

  slotPosition(index) {
    const { slots } = this;
    if (index < slots.length) return slots[index];
    const last = slots[slots.length - 1];
    const prev = slots[slots.length - 2] ?? { x: last.x, y: last.y - 14 };
    const k = index - slots.length + 1;
    return { x: last.x + (last.x - prev.x) * k, y: last.y + (last.y - prev.y) * k };
  }

  /**
   * Advance service. `isReady(member)` reports whether the front member has
   * reached the front slot. Returns the member who finished, if any.
   */
  update(dt, isReady = () => true) {
    const front = this.members[0];
    if (!front || !isReady(front)) return null;
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.#nextServiceTime();
    this.members.shift();
    return front;
  }
}
