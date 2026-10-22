import { bench3d, kioskBack3d, kioskFront3d, pillar3d, plant3d, bin3d, machine3d, stanchions3d, box, text, OUT } from './props.js';
import { onFront } from './draw3d.js';

/**
 * Higher-level builders that combine 3D props, blockers, POIs and staff.
 * Scenes compose these so adding a new location stays short and readable.
 * Everything sits on the floor of whichever level it is placed on.
 */

/** Try to place `count` items of size w×h at random free spots inside `rect`. */
export function scatter(kit, rect, count, w, h, place, { pad = 18, tries = 40 } = {}) {
  let placed = 0;
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < tries; attempt++) {
      const x = kit.rng.range(rect.x, rect.x + rect.w - w);
      const y = kit.rng.range(rect.y, rect.y + rect.h - h);
      const r = { x, y, w, h };
      if (!kit.isFree(r, pad)) continue;
      place(x, y, r);
      placed++;
      break;
    }
  }
  return placed;
}

/**
 * A free-standing shop. (x, y) is the back-left corner of the footprint.
 * Customers either browse at the counter or form a queue.
 */
export function addKiosk(kit, { x, y, w = 92, d = 34, name, colour, colour2 = colour, goods = 'bread', keeper = 'shop', customers = 2, queue = false }) {
  const k = { x, y, w, d, name, colour, colour2, goods };
  const z = kit.floorZ(x + w / 2, y + d / 2);
  kit.addProp({
    y,
    box: { x: x - 6, y: y - 10, w: w + 12, d: d * 0.55 + 10, h: 82, z },
    draw: (ctx, t, P) => kioskBack3d(ctx, P, k, z),
    solid: { x, y: y - 6, w, d: 6, h: 50, z },
  });
  kit.addProp({
    y: y + d,
    box: { x, y: y + d - 12, w, d: 12, h: 30, z },
    draw: (ctx, t, P) => kioskFront3d(ctx, P, k, z),
    solid: { x, y: y + d - 8, w, d: 8, h: 18, z },
  });
  kit.block({ x, y: y - 10, w, h: d + 10 });
  kit.station({ x: x + w / 2, y: y + d * 0.45, uniform: keeper, dir: 'down', fixedActions: [null, 'reach', null, 'wave'] });
  if (queue) {
    const slots = Array.from({ length: 5 }, (_, i) => ({ x: x + w / 2, y: y + d + 10 + i * 13 }));
    kit.queue({ slots, facing: 'up', serviceTime: [3, 6], action: 'reach' });
    kit.block({ x: x + w / 2 - 7, y: y + d + 4, w: 14, h: slots.length * 13 });
  }
  for (let i = 0; i < customers; i++) {
    const cx = queue ? x + (i % 2 ? w - 12 : 12) : x + ((i + 0.5) * w) / customers;
    kit.poi({ x: cx, y: y + d + 10, facing: 'up', actions: ['reach', null, null], duration: [4, 12], weight: 1.2 });
  }
  return k;
}

/** Bench with its seat along x..x+w at depth y-8..y. */
export function addBench(kit, { x, y, w = 46, facing = 'down', seats = 2, wood = '#a8723f', weight = 1 }) {
  const z = kit.floorZ(x + w / 2, y);
  const sortY = facing === 'up' ? y + 2 : y;
  kit.addProp({
    y: sortY,
    box: { x, y: y - 10, w, d: 12, h: 32, z },
    draw: (ctx, t, P) => bench3d(ctx, P, x, y, w, facing, wood, z),
    solid: facing === 'up' ? { x, y: y - 0.5, w, d: 2.5, h: 31, z } : null,
  });
  kit.block({ x, y: y - 10, w, h: 12 });
  for (let i = 0; i < seats; i++) {
    const sx = x + ((i + 0.5) * w) / seats;
    kit.poi({
      x: sx,
      y: facing === 'down' ? y + 3 : y - 9,
      mode: 'sit',
      facing,
      actions: [null, null, 'phone', 'read'],
      duration: [10, 30],
      weight,
    });
  }
}

export function addPlant(kit, x, y, size = 1, leaf = '#3f8f4a') {
  const z = kit.floorZ(x, y);
  const r = 12 * size;
  kit.addProp({
    y: y + r * 0.6,
    box: { x: x - r * 1.1, y: y - r, w: r * 2.2, d: r * 1.6, h: 52 * size, z },
    draw: (ctx, t, P) => plant3d(ctx, P, x, y, size, leaf, z),
    solid: { x: x - r * 0.8, y, w: r * 1.6, d: 1, h: 46 * size, z },
  });
  kit.block({ x: x - 9 * size, y: y - 8, w: 18 * size, h: 12 });
}

export function addPillar(kit, x, y, h = 130, w = 20, colour = '#cfc6b4') {
  const z = kit.floorZ(x, y);
  kit.addProp({
    y: y + w / 2 + 3,
    box: { x: x - w / 2 - 4, y: y - w / 2 - 4, w: w + 8, d: w + 8, h, z },
    draw: (ctx, t, P) => pillar3d(ctx, P, x, y, h, w, colour, z),
    solid: { x: x - w / 2, y: y + w / 2, w, d: 0, h, z },
  });
  kit.block({ x: x - w / 2 - 3, y: y - w / 2 - 3, w: w + 6, h: w + 6 });
}

export function addBin(kit, x, y, colour = '#2f6b45') {
  const z = kit.floorZ(x, y);
  kit.addProp({ y: y + 4, box: { x: x - 8, y: y - 8, w: 16, d: 14, h: 20, z }, draw: (ctx, t, P) => bin3d(ctx, P, x, y, colour, z) });
  kit.block({ x: x - 7, y: y - 7, w: 14, h: 12 });
}

export function addMachine(kit, x, y, { w = 26, h = 44, colour = '#2d5f8b', screen = '#7fd0f0', label = '', use = true } = {}) {
  const z = kit.floorZ(x + w / 2, y);
  kit.addProp({
    y,
    box: { x: x - 2, y: y - 13, w: w + 4, d: 14, h: h + 14, z },
    draw: (ctx, t, P) => machine3d(ctx, P, x, y, w, h, colour, screen, label, z),
    solid: { x, y, w, d: 0, h, z },
  });
  kit.block({ x, y: y - 13, w, h: 14 });
  if (use) kit.poi({ x: x + w / 2, y: y + 9, facing: 'up', actions: ['reach'], duration: [3, 8], weight: 0.8 });
}

/** A serpentine queue path ending (front) at (fx, fy) and snaking off to the left. */
export function snakeSlots(fx, fy, { rowLength = 5, rows = 3, spacing = 13, rowGap = 18, dir = -1 } = {}) {
  const slots = [{ x: fx, y: fy }];
  for (let r = 0; r < rows; r++) {
    const y = fy + 16 + r * rowGap;
    for (let i = 0; i < rowLength; i++) {
      const k = r % 2 === 0 ? i : rowLength - 1 - i;
      slots.push({ x: fx + dir * k * spacing, y });
    }
  }
  return slots;
}

/** Straight stanchion lanes, drawn under people because the posts are short. */
export function addStanchionLines(kit, lines, belt = '#c0392b') {
  const z = kit.floorZ(lines[0][0][0], lines[0][0][1]);
  const xs = lines.flat().map((p) => p[0]);
  const ys = lines.flat().map((p) => p[1]);
  const rect = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, d: Math.max(...ys) - Math.min(...ys) + 8, h: 14, z };
  kit.addDynamic({ bounds: null, box: rect, draw: (ctx, t, P) => lines.forEach((pts) => stanchions3d(ctx, P, pts, belt, z)) });
}

/** A labelled sign hanging between two posts, facing the camera. Only the board blocks the view. */
export function addSignPosts(kit, x, y, w, label, { colour = '#20385e', textColour = '#fff', height = 78 } = {}) {
  const z = kit.floorZ(x + w / 2, y);
  kit.addProp({
    y,
    box: { x: x - 4, y: y - 2, w: w + 8, d: 4, h: height + 22, z },
    draw: (ctx, t, P) =>
      onFront(ctx, P, x, y, z, (c) => {
        c.fillStyle = '#3b4250';
        c.fillRect(0, -height, 3, height);
        c.fillRect(w - 3, -height, 3, height);
        box(c, -2, -height - 18, w + 4, 18, colour, OUT, 1, 3);
        text(c, label, w / 2, -height - 9, { size: 10, colour: textColour, maxWidth: w - 4 });
      }),
    solid: { x: x - 2, y, w: w + 4, d: 0, h: 18, z: z + height },
  });
  kit.block({ x: x - 1, y: y - 3, w: 5, h: 4 });
  kit.block({ x: x + w - 4, y: y - 3, w: 5, h: 4 });
}
