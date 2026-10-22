/**
 * Reusable prop drawings shared by scenes. Every function draws in world
 * units. Keep them cheap: they may run every frame when the player zooms in.
 */
export const OUT = '#2a2230';
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function box(ctx, x, y, w, h, fill, stroke = OUT, lw = 1, r = 0) {
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function text(ctx, str, x, y, { size = 12, colour = '#222', align = 'center', weight = 'bold', baseline = 'middle', maxWidth } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y, maxWidth);
}

/** Checkerboard tiles, only for the visible part of `rect`. */
export function tiles(ctx, rect, size, c1, c2, view = rect) {
  ctx.fillStyle = c1;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const x0 = Math.max(rect.x, Math.floor((view.x - rect.x) / size) * size + rect.x);
  const y0 = Math.max(rect.y, Math.floor((view.y - rect.y) / size) * size + rect.y);
  const x1 = Math.min(rect.x + rect.w, view.x + view.w);
  const y1 = Math.min(rect.y + rect.h, view.y + view.h);
  ctx.fillStyle = c2;
  for (let y = y0; y < y1; y += size) {
    const row = Math.round((y - rect.y) / size);
    for (let x = x0; x < x1; x += size) {
      const col = Math.round((x - rect.x) / size);
      if ((row + col) % 2 === 0) ctx.fillRect(x, y, Math.min(size, rect.x + rect.w - x), Math.min(size, rect.y + rect.h - y));
    }
  }
}

/** Grid lines (paving, carpet seams). */
export function gridLines(ctx, rect, size, colour, view = rect, lw = 1) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lw;
  ctx.beginPath();
  const x0 = Math.max(rect.x, Math.ceil((view.x - rect.x) / size) * size + rect.x);
  const y0 = Math.max(rect.y, Math.ceil((view.y - rect.y) / size) * size + rect.y);
  for (let x = x0; x < Math.min(rect.x + rect.w, view.x + view.w); x += size) {
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.h);
  }
  for (let y = y0; y < Math.min(rect.y + rect.h, view.y + view.h); y += size) {
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.w, y);
  }
  ctx.stroke();
}

// --------------------------------------------------------------- furniture
export function bench(ctx, x, y, w, facing = 'down', wood = '#a8723f') {
  const legs = '#4a4a4a';
  if (facing === 'down') {
    box(ctx, x + 1, y - 24, w - 2, 9, wood, OUT, 0.8, 2);
    ctx.fillStyle = legs;
    ctx.fillRect(x + 3, y - 15, 2, 6);
    ctx.fillRect(x + w - 5, y - 15, 2, 6);
  }
  box(ctx, x, y - 12, w, 5, shade(wood, 0.15), OUT, 0.8, 1.5);
  box(ctx, x, y - 7, w, 3, shade(wood, -0.2), OUT, 0.6);
  ctx.fillStyle = legs;
  ctx.fillRect(x + 3, y - 4, 2.4, 4);
  ctx.fillRect(x + w - 5.4, y - 4, 2.4, 4);
  if (facing === 'up') {
    box(ctx, x + 1, y - 21, w - 2, 10, wood, OUT, 0.8, 2);
  }
}

export function plant(ctx, x, y, size = 1, leaf = '#3f8f4a') {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y, 11 * size, 3.5 * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 9 * size, y - 16 * size);
  ctx.lineTo(x + 9 * size, y - 16 * size);
  ctx.lineTo(x + 7 * size, y);
  ctx.lineTo(x - 7 * size, y);
  ctx.closePath();
  ctx.fillStyle = '#b76b3e';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const blobs = [[0, -34, 11], [-9, -27, 8], [9, -27, 8], [-5, -42, 7], [6, -40, 7]];
  for (const [dx, dy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x + dx * size, y + dy * size, r * size, 0, Math.PI * 2);
    ctx.fillStyle = leaf;
    ctx.fill();
    ctx.strokeStyle = shade(leaf, -0.35);
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  ctx.fillStyle = shade(leaf, 0.25);
  ctx.beginPath();
  ctx.arc(x - 3 * size, y - 37 * size, 3 * size, 0, Math.PI * 2);
  ctx.fill();
}

export function pillar(ctx, x, y, h = 110, w = 18, colour = '#cfc6b4') {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x - w / 2 - 2, y - 3, w + 10, 6);
  box(ctx, x - w / 2, y - h, w, h, colour, OUT, 1);
  ctx.fillStyle = shade(colour, -0.15);
  ctx.fillRect(x + w / 2 - 5, y - h, 4, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x - w / 2 + 3, y - h, 3, h);
  box(ctx, x - w / 2 - 3, y - 8, w + 6, 8, shade(colour, -0.1), OUT, 0.8);
  box(ctx, x - w / 2 - 3, y - h, w + 6, 7, shade(colour, -0.1), OUT, 0.8);
}

export function bin(ctx, x, y, colour = '#2f6b45') {
  box(ctx, x - 6, y - 16, 12, 16, colour, OUT, 0.8, 2);
  box(ctx, x - 7, y - 18, 14, 3, shade(colour, 0.2), OUT, 0.6, 1);
}

export function machine(ctx, x, y, w, h, colour, screen = '#7fd0f0', label = '') {
  box(ctx, x, y - h, w, h, colour, OUT, 1, 2);
  box(ctx, x + 4, y - h + 6, w - 8, h * 0.32, screen, OUT, 0.6, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(x + 6, y - h + 8, (w - 12) * 0.4, 2);
  ctx.fillStyle = '#222';
  ctx.fillRect(x + w / 2 - 5, y - h * 0.4, 10, 2);
  ctx.fillRect(x + 5, y - 14, w - 10, 6);
  if (label) text(ctx, label, x + w / 2, y - h - 6, { size: 7, colour: '#222' });
}

export function lampPost(ctx, x, y, h = 70, colour = '#2f3b4a') {
  ctx.fillStyle = colour;
  ctx.fillRect(x - 1.5, y - h, 3, h);
  box(ctx, x - 4, y - 4, 8, 4, colour, null);
  box(ctx, x - 6, y - h - 8, 12, 9, '#f6e7a7', OUT, 0.8, 3);
}

/** Analogue clock that shows the real local time. */
export function clockFace(ctx, cx, cy, r, now = new Date()) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf3';
  ctx.fill();
  ctx.strokeStyle = '#3a2e1e';
  ctx.lineWidth = r * 0.14;
  ctx.stroke();
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hand = (angle, len, w, colour) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(angle) * len, cy - Math.cos(angle) * len);
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = '#3a2e1e';
    ctx.fillRect(cx + Math.sin(a) * r * 0.78 - 0.5, cy - Math.cos(a) * r * 0.78 - 0.5, 1, 1);
  }
  hand(((h + m / 60) / 12) * Math.PI * 2, r * 0.5, r * 0.12, '#222');
  hand((m / 60) * Math.PI * 2, r * 0.75, r * 0.08, '#222');
  hand((s / 60) * Math.PI * 2, r * 0.8, r * 0.04, '#c0392b');
}

/** Free-standing kiosk drawn in two depth-sorted parts so a keeper can stand inside. */
export function kioskBack(ctx, k) {
  const { x, y, w, colour, colour2, name } = k;
  box(ctx, x, y - 46, w, 46, shade(colour, -0.25), OUT, 1);
  // shelves with goods
  for (let row = 0; row < 2; row++) {
    const sy = y - 40 + row * 15;
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x + 4, sy + 10, w - 8, 2);
    goods(ctx, k.goods, x + 6, sy, w - 12, 10, row);
  }
  // awning
  const ay = y - 62;
  const stripes = Math.max(4, Math.round(w / 12));
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? colour2 : '#ffffff';
    ctx.fillRect(x - 4 + (i * (w + 8)) / stripes, ay, (w + 8) / stripes + 0.5, 12);
  }
  ctx.beginPath();
  for (let i = 0; i < stripes; i++) {
    const sx = x - 4 + (i * (w + 8)) / stripes;
    const sw = (w + 8) / stripes;
    ctx.moveTo(sx, ay + 12);
    ctx.arc(sx + sw / 2, ay + 12, sw / 2, Math.PI, 0, true);
  }
  ctx.fillStyle = colour2;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x - 4, ay, w + 8, 12);
  box(ctx, x + w / 2 - Math.min(w * 0.45, 44), ay - 15, Math.min(w * 0.9, 88), 13, colour, OUT, 0.8, 3);
  text(ctx, name, x + w / 2, ay - 8.5, { size: 8, colour: '#fff', maxWidth: Math.min(w * 0.85, 84) });
}

export function kioskFront(ctx, k) {
  const { x, y, w, d, colour } = k;
  const fy = y + d;
  box(ctx, x - 2, fy - 22, w + 4, 5, '#f3eadb', OUT, 0.8, 1);
  box(ctx, x, fy - 17, w, 17, colour, OUT, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 1; i < 4; i++) ctx.fillRect(x + (i * w) / 4 - 1, fy - 15, 2, 13);
  goods(ctx, k.goods, x + 4, fy - 30, w - 8, 8, 2);
}

function goods(ctx, type, x, y, w, h, row) {
  const n = Math.max(2, Math.floor(w / 7));
  for (let i = 0; i < n; i++) {
    const gx = x + (i + 0.5) * (w / n);
    const seed = (i * 7 + row * 13) % 5;
    switch (type) {
      case 'bread':
        ctx.fillStyle = ['#d89a52', '#c7823f', '#e8b56a'][seed % 3];
        ctx.beginPath();
        ctx.ellipse(gx, y + h - 3, 3, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'coffee':
        ctx.fillStyle = seed % 2 ? '#f4efe6' : '#5a3a26';
        ctx.fillRect(gx - 1.6, y + h - 6, 3.2, 5);
        break;
      case 'flowers':
        ctx.fillStyle = '#3f8f4a';
        ctx.fillRect(gx - 0.5, y + h - 6, 1, 6);
        ctx.fillStyle = ['#e84a6f', '#f6c445', '#9b5de5', '#ff8c42', '#ffffff'][seed];
        ctx.beginPath();
        ctx.arc(gx, y + h - 7, 2.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'books':
      case 'news':
        ctx.fillStyle = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'][seed];
        ctx.fillRect(gx - 2, y + h - 8, 4, 8);
        break;
      case 'sweets':
        ctx.fillStyle = ['#ff6fb5', '#ffd23f', '#3bceac', '#ee4266', '#7b5ea7'][seed];
        ctx.beginPath();
        ctx.arc(gx, y + h - 3, 2.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bottles':
        ctx.fillStyle = ['#7fb7d9', '#e3c55b', '#c86b85', '#6fbf73', '#e9e2d0'][seed];
        ctx.fillRect(gx - 1.4, y + h - 8, 2.8, 8);
        ctx.fillRect(gx - 0.6, y + h - 10, 1.2, 2);
        break;
      default:
        ctx.fillStyle = '#ccc';
        ctx.fillRect(gx - 2, y + h - 5, 4, 5);
    }
  }
}

// --------------------------------------------------------------- stairways
export function drawEscalator(ctx, rect, dir, t) {
  const { x, y, w, h } = rect;
  box(ctx, x - 4, y, w + 8, h, '#5b6470', OUT, 1, 3);
  ctx.fillStyle = '#c9ced6';
  ctx.fillRect(x + 1, y + 4, w - 2, h - 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 4, w - 2, h - 8);
  ctx.clip();
  ctx.strokeStyle = '#8c939e';
  ctx.lineWidth = 1.2;
  const gap = 6;
  const offset = ((t * 30) % gap) * (dir === 'up' ? -1 : 1);
  ctx.beginPath();
  for (let yy = y + offset - gap; yy < y + h + gap; yy += gap) {
    ctx.moveTo(x + 1, yy);
    ctx.lineTo(x + w - 1, yy);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#1d1f24';
  ctx.fillRect(x - 4, y, 3, h);
  ctx.fillRect(x + w + 1, y, 3, h);
  ctx.fillStyle = '#e2b007';
  ctx.fillRect(x + 1, y + 2, w - 2, 2);
  ctx.fillRect(x + 1, y + h - 4, w - 2, 2);
  // direction arrow
  const ay = dir === 'up' ? y + h - 14 : y + 14;
  ctx.fillStyle = 'rgba(30,140,60,0.85)';
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(x + w / 2, ay - 6);
    ctx.lineTo(x + w / 2 + 5, ay + 2);
    ctx.lineTo(x + w / 2 - 5, ay + 2);
  } else {
    ctx.moveTo(x + w / 2, ay + 6);
    ctx.lineTo(x + w / 2 + 5, ay - 2);
    ctx.lineTo(x + w / 2 - 5, ay - 2);
  }
  ctx.fill();
}

export function drawTravelator(ctx, rect, dir, t) {
  const { x, y, w, h } = rect;
  box(ctx, x, y, w, h, '#5b6470', OUT, 1, 4);
  ctx.fillStyle = '#7d8590';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 4, y + 4, w - 8, h - 8);
  ctx.clip();
  ctx.strokeStyle = '#9aa2ad';
  ctx.lineWidth = 1;
  const gap = 5;
  const offset = ((t * 42) % gap) * (dir === 'right' ? 1 : -1);
  ctx.beginPath();
  for (let xx = x + offset - gap; xx < x + w + gap; xx += gap) {
    ctx.moveTo(xx, y + 4);
    ctx.lineTo(xx, y + h - 4);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#1d1f24';
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = '#e2b007';
  const ex = dir === 'right' ? x + 4 : x + w - 6;
  ctx.fillRect(ex, y + 4, 2, h - 8);
}

/** Queue barrier posts with belts between consecutive points. */
export function stanchions(ctx, points, belt = '#c0392b') {
  ctx.strokeStyle = belt;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py - 9) : ctx.moveTo(px, py - 9)));
  ctx.stroke();
  for (const [px, py] of points) {
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(px - 0.9, py - 11, 1.8, 11);
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(px, py, 3, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py - 11, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Little pecking birds that scatter around a point. */
export function createPigeons(rng, cx, cy, count, spread = 60) {
  const birds = Array.from({ length: count }, () => ({
    x: cx + rng.range(-spread, spread),
    y: cy + rng.range(-spread / 2, spread / 2),
    vx: 0,
    vy: 0,
    hop: rng.range(0, 3),
    face: rng.chance(0.5) ? 1 : -1,
    peck: rng.range(0, 10),
  }));
  return {
    bounds: { x: cx - spread - 30, y: cy - spread - 30, w: spread * 2 + 60, h: spread + 60 },
    update(dt) {
      for (const b of birds) {
        b.hop -= dt;
        if (b.hop <= 0) {
          b.hop = rng.range(0.6, 3);
          const tx = cx + rng.range(-spread, spread);
          const ty = cy + rng.range(-spread / 2, spread / 2);
          b.vx = (tx - b.x) * 0.6;
          b.vy = (ty - b.y) * 0.6;
          b.face = b.vx < 0 ? -1 : 1;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= 0.92;
        b.vy *= 0.92;
        b.peck += dt * 6;
      }
    },
    draw(ctx) {
      for (const b of birds) {
        const peck = Math.max(0, Math.sin(b.peck)) * 1.5;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(b.x - 3, b.y - 0.5, 6, 1.4);
        ctx.fillStyle = '#8d939c';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 3, 3.4, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5f6b78';
        ctx.beginPath();
        ctx.arc(b.x + b.face * 3, b.y - 4.6 + peck, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0a030';
        ctx.fillRect(b.x + b.face * 4.4 - 0.5, b.y - 4.6 + peck, 1, 0.8);
      }
    },
  };
}

const shadeCache = new Map();
export function shade(hex, amount) {
  const key = hex + amount;
  if (shadeCache.has(key)) return shadeCache.get(key);
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  const out = `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}
