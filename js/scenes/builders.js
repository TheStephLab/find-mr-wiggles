import { bench, kioskBack, kioskFront, pillar, plant, bin, machine, stanchions, box, text, OUT } from './props.js';

/**
 * Higher-level builders that combine props, blockers, POIs and staff.
 * Scenes compose these so adding a new location stays short and readable.
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
 * A free-standing shop counter. (x, y) is the back-left corner of the footprint.
 * Customers either browse at the counter or form a queue.
 */
export function addKiosk(kit, { x, y, w = 92, d = 34, name, colour, colour2 = colour, goods = 'bread', keeper = 'shop', customers = 2, queue = false }) {
  const k = { x, y, w, d, name, colour, colour2, goods };
  kit.addProp({ y, bounds: { x: x - 8, y: y - 80, w: w + 16, h: 82 }, draw: (ctx) => kioskBack(ctx, k) });
  kit.addProp({ y: y + d, bounds: { x: x - 4, y: y + d - 34, w: w + 8, h: 36 }, draw: (ctx) => kioskFront(ctx, k) });
  kit.block({ x, y: y - 10, w, h: d + 10 });
  kit.station({ x: x + w / 2, y: y + d * 0.5, uniform: keeper, dir: 'down', fixedActions: [null, 'reach', null, 'wave'] });
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

export function addBench(kit, { x, y, w = 46, facing = 'down', seats = 2, wood, weight = 1 }) {
  kit.addProp({ y, bounds: { x: x - 2, y: y - 28, w: w + 4, h: 30 }, draw: (ctx) => bench(ctx, x, y, w, facing, wood) });
  kit.block({ x, y: y - 12, w, h: 12 });
  for (let i = 0; i < seats; i++) {
    const sx = x + ((i + 0.5) * w) / seats;
    kit.poi({
      x: sx,
      y: facing === 'down' ? y + 2 : y - 5,
      mode: 'sit',
      facing,
      actions: [null, null, 'phone', 'read'],
      duration: [10, 30],
      weight,
    });
  }
}

export function addPlant(kit, x, y, size = 1, leaf) {
  kit.addProp({ y, bounds: { x: x - 16 * size, y: y - 52 * size, w: 32 * size, h: 56 * size }, draw: (ctx) => plant(ctx, x, y, size, leaf) });
  kit.block({ x: x - 9 * size, y: y - 8, w: 18 * size, h: 10 });
}

export function addPillar(kit, x, y, h = 110, w = 18, colour) {
  kit.addProp({ y, bounds: { x: x - w / 2 - 4, y: y - h - 2, w: w + 14, h: h + 6 }, draw: (ctx) => pillar(ctx, x, y, h, w, colour) });
  kit.block({ x: x - w / 2, y: y - 6, w, h: 8 });
}

export function addBin(kit, x, y, colour) {
  kit.addProp({ y, bounds: { x: x - 8, y: y - 20, w: 16, h: 22 }, draw: (ctx) => bin(ctx, x, y, colour) });
  kit.block({ x: x - 6, y: y - 4, w: 12, h: 5 });
}

export function addMachine(kit, x, y, { w = 26, h = 44, colour = '#2d5f8b', screen, label = '', use = true } = {}) {
  kit.addProp({ y, bounds: { x: x - 2, y: y - h - 14, w: w + 4, h: h + 16 }, draw: (ctx) => machine(ctx, x, y, w, h, colour, screen, label) });
  kit.block({ x, y: y - 8, w, h: 9 });
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

/** Stanchion belts for a snake queue built with snakeSlots(). */
export function snakeBarrierFloor(kit, fx, fy, { rowLength = 5, rows = 3, spacing = 13, rowGap = 18, dir = -1, belt } = {}) {
  const left = Math.min(fx, fx + dir * (rowLength - 1) * spacing) - 10;
  const right = Math.max(fx, fx + dir * (rowLength - 1) * spacing) + 10;
  const top = fy + 8;
  const bottom = fy + 16 + (rows - 1) * rowGap + 9;
  const lines = [];
  for (let r = 0; r <= rows; r++) {
    const y = top + r * rowGap;
    const gapAtLeft = r % 2 === 1;
    if (r === 0 || r === rows) lines.push([[left, y], [right, y]]);
    else lines.push(gapAtLeft === (dir < 0) ? [[left + 22, y], [right, y]] : [[left, y], [right - 22, y]]);
  }
  const rect = { x: left - 4, y: top - 14, w: right - left + 8, h: bottom - top + 18 };
  kit.addFloor(rect, (ctx) => lines.forEach((pts) => stanchions(ctx, pts, belt)));
  kit.block({ x: left, y: top, w: right - left, h: bottom - top });
}

/** A labelled hanging sign on two posts (not a blocker at head height). */
export function addSignPosts(kit, x, y, w, label, { colour = '#20385e', textColour = '#fff', height = 78 } = {}) {
  kit.addProp({
    y,
    bounds: { x: x - 4, y: y - height - 22, w: w + 8, h: height + 24 },
    draw: (ctx) => {
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(x, y - height, 3, height);
      ctx.fillRect(x + w - 3, y - height, 3, height);
      box(ctx, x - 2, y - height - 18, w + 4, 18, colour, OUT, 1, 3);
      text(ctx, label, x + w / 2, y - height - 9, { size: 10, colour: textColour, maxWidth: w - 4 });
    },
  });
  kit.block({ x: x - 1, y: y - 3, w: 5, h: 4 });
  kit.block({ x: x + w - 4, y: y - 3, w: 5, h: 4 });
}
