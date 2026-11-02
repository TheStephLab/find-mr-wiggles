import { pointInRect, segmentIntersectsRect } from '../core/geometry.js';

const CELL = 48;
const NEIGHBOURS = 24;
const OFFSETS = Array.from({ length: 9 }, (_, i) => [i % 3 - 1, Math.floor(i / 3) - 1]).sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2);
const radius = a => Math.max(4.5, Math.min(7, a.look.height * .15));

/** Bounded local steering. It never pushes another walker or leaves a walkable corridor. */
export function createCrowd(world) {
  const cells = new Map(), membership = new Map();
  const key = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const stats = { queries: 0, candidates: 0, maxNeighbours: 0, stopped: 0 };
  const obstacles = new Map();
  for (const b of world.blockers) {
    for (let y = Math.floor(b.y / CELL); y <= Math.floor((b.y + b.h) / CELL); y++) {
      for (let x = Math.floor(b.x / CELL); x <= Math.floor((b.x + b.w) / CELL); x++) {
        const k = `${x},${y}`;
        if (!obstacles.has(k)) obstacles.set(k, []);
        obstacles.get(k).push(b);
      }
    }
  }
  function put(a) {
    const next = key(a.x, a.y), old = membership.get(a);
    if (next === old) return;
    cells.get(old)?.delete(a);
    if (!cells.has(next)) cells.set(next, new Set());
    cells.get(next).add(a); membership.set(a, next);
  }
  function nearby(a) {
    const cx = Math.floor(a.x / CELL), cy = Math.floor(a.y / CELL), found = [];
    search: for (const [dx, dy] of OFFSETS) {
      for (const b of cells.get(`${cx + dx},${cy + dy}`) ?? []) {
        if (b === a || b.hidden || Math.abs((b.z ?? 0) - (a.z ?? 0)) > 9) continue;
        const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        if (d < 80 ** 2) found.push({ b, d });
        if (found.length === 96) break search;
      }
    }
    found.sort((a, b) => a.d - b.d || a.b.id - b.b.id);
    const neighbours = found.slice(0, NEIGHBOURS).map(n => n.b);
    stats.queries++; stats.candidates += found.length;
    stats.maxNeighbours = Math.max(stats.maxNeighbours, neighbours.length);
    return neighbours;
  }
  function clear(a, x, y, constrained) {
    if (x < 8 || y < 8 || x > world.width - 8 || y > world.height - 8) return false;
    if (constrained) return true; // Exact graph edges/queue slots own their narrow corridor.
    if (Math.abs(world.zAt(x, y) - world.zAt(a.x, a.y)) > 3) return false;
    const blocks = obstacles.get(key(x, y)) ?? [];
    return !blocks.some(b => !pointInRect(a.x, a.y, b, 1) && segmentIntersectsRect(a.x, a.y, x, y, b));
  }
  function safe(a, x, y, neighbours) {
    const vx = x - a.x, vy = y - a.y, length2 = vx * vx + vy * vy;
    for (const b of neighbours) {
      const gap = radius(a) + radius(b);
      const bx = b.x - a.x, by = b.y - a.y, old = bx * bx + by * by;
      const t = length2 ? Math.max(0, Math.min(1, (bx * vx + by * vy) / length2)) : 0;
      const distance2 = (bx - vx * t) ** 2 + (by - vy * t) ** 2;
      if (distance2 < gap * gap - .01) {
        const end = (b.x - x) ** 2 + (b.y - y) ** 2;
        if (old >= gap * gap - .01 || end <= old + .001) return false;
      }
    }
    return true;
  }
  return {
    stats,
    canPlace(a, x, y) {
      const position = { ...a, x, y, z: world.zAt(x, y) };
      return nearby(position).every(b => b.id === a.id || Math.hypot(b.x - x, b.y - y) >= radius(a) + radius(b) + 1);
    },
    rebuild() {
      cells.clear(); membership.clear();
      for (const a of world.agents) if (!a.hidden) put(a);
    },
    move(a, tx, ty, distance, dt, constrained = false) {
      if (a.detour && !constrained) {
        if (world.time > a.detour.until || Math.hypot(a.detour.x - a.x, a.detour.y - a.y) < 3) a.detour = null;
        else { tx = a.detour.x; ty = a.detour.y; }
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (!d) return { x: a.x, y: a.y };
      const ux = dx / d, uy = dy / d, step = Math.min(d, distance);
      const neighbours = nearby(a);
      let bend = 0;
      if (!constrained) {
        for (const b of neighbours) {
          const rx = b.x - a.x, ry = b.y - a.y;
          const ahead = rx * ux + ry * uy, side = -rx * uy + ry * ux;
          const gap = radius(a) + radius(b) + 3;
          if (ahead > 0 && ahead < 48 && Math.abs(side) < gap) {
            // Both head-on walkers keep to their own right; a stable bias avoids shivering.
            bend = Math.max(bend, (1 - ahead / 55) * 1.15);
          }
        }
      }
      a.steer = (a.steer ?? 0) + (bend - (a.steer ?? 0)) * Math.min(1, dt * 7);
      const angles = constrained ? [0] : [a.steer, a.steer + .4, a.steer - .4, .9, -.9, 1.35, -1.35, 1.8, -1.8, 2.3, -2.3, Math.PI];
      let best = null, bestScore = -Infinity;
      for (const angle of angles) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const vx = ux * c - uy * s, vy = uy * c + ux * s;
        const x = a.x + vx * step, y = a.y + vy * step;
        if (!clear(a, x, y, constrained) || !safe(a, x, y, neighbours)) continue;
        const score = c - Math.abs(angle - a.steer) * .35;
        if (score > bestScore) { bestScore = score; best = { x, y, angle, vx, vy }; }
        if (score >= .999) break;
      }
      if (!best) { stats.stopped++; a.vx = 0; a.vy = 0; return { x: a.x, y: a.y }; }
      if (!a.detour && Math.abs(best.angle) > 1.6) {
        a.detour = { x: a.x + best.vx * 25, y: a.y + best.vy * 25, until: world.time + 1 };
      }
      a.vx = (best.x - a.x) / dt; a.vy = (best.y - a.y) / dt;
      a.x = best.x; a.y = best.y; put(a);
      return best;
    },
  };
}
