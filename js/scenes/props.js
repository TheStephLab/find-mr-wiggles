/**
 * Reusable prop drawings shared by scenes. 2D helpers draw flat artwork
 * (signs, shop fronts); the 3D props take the projection `P` and a ground
 * height `z`. Keep them cheap: they run every frame when on screen.
 */
import { drawBox, onFront, poly, sideQuad, topQuad, shadow } from './draw3d.js';

export const OUT = '#2a2230';
export const FONT = '"Grandstander", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

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
  // Text is the most expensive thing to rasterise: below ~3.5px tall it reads as a smudge anyway.
  const m = ctx.getTransform();
  const px = size * Math.hypot(m.a, m.b);
  if (px < 3.5) {
    const w = Math.min(maxWidth ?? Infinity, str.length * size * 0.55);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = colour;
    ctx.fillRect(x0, y - size * 0.3, w, size * 0.6);
    ctx.globalAlpha /= 0.55;
    return;
  }
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y, maxWidth);
}

/** Checkerboard tiles (flat floor), only for the visible part of `rect`. */
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

/** Analogue clock that shows the real local time (flat; use inside onFront). */
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
  hand(((h + m / 60) / 12) * Math.PI * 2, r * 0.5, r * 0.12, '#222');
  hand((m / 60) * Math.PI * 2, r * 0.75, r * 0.08, '#222');
  hand((s / 60) * Math.PI * 2, r * 0.8, r * 0.04, '#c0392b');
}

// --------------------------------------------------------------- 3D furniture
/** Bench whose seat spans x..x+w at depth y-8..y, with a slatted backrest. */
export function bench3d(ctx, P, x, y, w, facing, wood, z) {
  shadow(ctx, P, x, y - 8, w, 8, z);
  for (const lx of [x + 3, x + w - 6]) drawBox(ctx, P, { x: lx, y: y - 7, w: 3, d: 6, h: 9, z }, { front: '#4a4a4a', stroke: null });
  const backrest = (by) => {
    for (const px of [x + 2, x + w - 5]) drawBox(ctx, P, { x: px, y: by, w: 3, d: 2, h: 22, z: z + 9 }, { front: '#4a4a4a', stroke: null });
    for (const sz of [z + 17, z + 25]) drawBox(ctx, P, { x, y: by, w, d: 2, h: 5, z: sz }, { front: wood, lw: 0.6 });
  };
  if (facing === 'down') backrest(y - 9);
  drawBox(ctx, P, { x, y: y - 8, w, d: 8, h: 3, z: z + 9 }, { front: shade(wood, -0.15), top: shade(wood, 0.15) });
  if (facing === 'up') backrest(y - 0.5);
}

/** Potted plant: a 3D pot with a camera-facing bush. */
export function plant3d(ctx, P, x, y, size, leaf, z) {
  const r = 9 * size;
  shadow(ctx, P, x - r, y - r * 0.6, r * 2, r * 1.2, z);
  drawBox(ctx, P, { x: x - r * 0.8, y: y - r * 0.6, w: r * 1.6, d: r * 1.2, h: 15 * size, z }, { front: '#b76b3e' });
  onFront(ctx, P, x, y, z, (c) => {
    const blobs = [[0, -36, 11], [-9, -28, 8], [9, -28, 8], [-5, -44, 7], [6, -42, 7]];
    for (const [dx, dy, rr] of blobs) {
      c.beginPath();
      c.arc(dx * size, dy * size, rr * size, 0, Math.PI * 2);
      c.fillStyle = leaf;
      c.fill();
      c.strokeStyle = shade(leaf, -0.35);
      c.lineWidth = 0.7;
      c.stroke();
    }
    c.fillStyle = shade(leaf, 0.3);
    c.beginPath();
    c.arc(-3 * size, -39 * size, 3 * size, 0, Math.PI * 2);
    c.fill();
  });
}

export function pillar3d(ctx, P, x, y, h, w, colour, z) {
  const half = w / 2;
  shadow(ctx, P, x - half, y - half, w, w, z, 0.2);
  drawBox(ctx, P, { x: x - half - 3, y: y - half - 3, w: w + 6, d: w + 6, h: 8, z }, { front: shade(colour, -0.08) });
  drawBox(ctx, P, { x: x - half, y: y - half, w, d: w, h, z }, { front: colour, top: shade(colour, 0.2) });
  onFront(ctx, P, x - half, y + half, z, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(3, -h, 3, h - 8);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    c.fillRect(w - 6, -h, 4, h - 8);
  });
  drawBox(ctx, P, { x: x - half - 3, y: y - half - 3, w: w + 6, d: w + 6, h: 7, z: z + h - 7 }, { front: shade(colour, -0.08) });
}

export function bin3d(ctx, P, x, y, colour, z) {
  drawBox(ctx, P, { x: x - 6, y: y - 6, w: 12, d: 10, h: 16, z }, { front: colour });
  drawBox(ctx, P, { x: x - 7, y: y - 7, w: 14, d: 12, h: 2, z: z + 16 }, { front: shade(colour, 0.2) });
}

export function machine3d(ctx, P, x, y, w, h, colour, screen, label, z) {
  shadow(ctx, P, x, y - 12, w, 12, z);
  drawBox(ctx, P, { x, y: y - 12, w, d: 12, h, z }, { front: colour });
  onFront(ctx, P, x, y, z, (c) => {
    box(c, 4, -h + 6, w - 8, h * 0.32, screen, OUT, 0.6, 1);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(6, -h + 8, (w - 12) * 0.4, 2);
    c.fillStyle = '#222';
    c.fillRect(w / 2 - 5, -h * 0.4, 10, 2);
    c.fillRect(5, -14, w - 10, 6);
    if (label) text(c, label, w / 2, -h - 6, { size: 7, colour: '#222' });
  });
}

export function lampPost3d(ctx, P, x, y, h, colour, z) {
  onFront(ctx, P, x, y, z, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.ellipse(0, 0, 6, 2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = colour;
    c.fillRect(-1.5, -h, 3, h);
    box(c, -4, -5, 8, 5, colour, null);
    box(c, -6, -h - 9, 12, 10, '#f6e7a7', OUT, 0.8, 3);
  });
}

/** Free-standing kiosk. Back unit (with shelves and awning) and the counter are separate sorted parts. */
export function kioskBack3d(ctx, P, k, z) {
  const { x, y, w, d, colour, colour2, name } = k;
  shadow(ctx, P, x, y - 6, w, d + 6, z);
  drawBox(ctx, P, { x, y: y - 6, w, d: 6, h: 50, z }, { front: shade(colour, -0.25) });
  onFront(ctx, P, x, y, z, (c) => {
    for (let row = 0; row < 2; row++) {
      const sy = -44 + row * 16;
      c.fillStyle = '#7a5a3a';
      c.fillRect(4, sy + 11, w - 8, 2);
      goods(c, k.goods, 6, sy, w - 12, 11, row);
    }
  });
  // side panels
  drawBox(ctx, P, { x, y, w: 3, d: d - 8, h: 50, z }, { front: shade(colour, -0.1) });
  drawBox(ctx, P, { x: x + w - 3, y, w: 3, d: d - 8, h: 50, z }, { front: shade(colour, -0.1) });
  // sloped, striped awning
  const stripes = Math.max(4, Math.round(w / 12));
  const yb = y - 8;
  const yf = y + d * 0.55;
  for (let i = 0; i < stripes; i++) {
    const x0 = x - 5 + (i * (w + 10)) / stripes;
    const x1 = x - 5 + ((i + 1) * (w + 10)) / stripes;
    poly(ctx, [P.pt(x0, yb, z + 66), P.pt(x1, yb, z + 66), P.pt(x1, yf, z + 55), P.pt(x0, yf, z + 55)], i % 2 ? colour2 : '#ffffff', null);
  }
  poly(ctx, [P.pt(x - 5, yb, z + 66), P.pt(x + w + 5, yb, z + 66), P.pt(x + w + 5, yf, z + 55), P.pt(x - 5, yf, z + 55)], null, OUT, 0.8);
  onFront(ctx, P, x - 5, yf, z + 55, (c) => {
    const sw = (w + 10) / stripes;
    c.beginPath();
    for (let i = 0; i < stripes; i++) {
      c.moveTo(i * sw, 0);
      c.arc(i * sw + sw / 2, 0, sw / 2, Math.PI, 0, true);
    }
    c.fillStyle = colour2;
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = 0.6;
    c.stroke();
  });
  onFront(ctx, P, x + w / 2, yb, z + 66, (c) => {
    const bw = Math.min(w * 0.9, 88);
    box(c, -bw / 2, -15, bw, 14, colour, OUT, 0.8, 3);
    text(c, name, 0, -8, { size: 8, colour: '#fff', maxWidth: bw - 6 });
  });
}

export function kioskFront3d(ctx, P, k, z) {
  const { x, y, w, d, colour } = k;
  const fy = y + d;
  drawBox(ctx, P, { x, y: fy - 8, w, d: 8, h: 18, z }, { front: colour, top: '#f3eadb' });
  onFront(ctx, P, x, fy, z, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 1; i < 4; i++) c.fillRect((i * w) / 4 - 1, -16, 2, 13);
  });
  onFront(ctx, P, x + 4, fy - 4, z + 18, (c) => goods(c, k.goods, 0, -8, w - 8, 8, 2));
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
/** Escalator rising from (yBottom, zBottom) at the near end to (yTop, zTop) at the far end. */
export function drawEscalator(ctx, P, rect, dir, zTop, zBottom, t) {
  const { x, y: y0, w, h } = rect;
  const y1 = y0 + h;
  const xl = x - 5;
  const xr = x + w + 5;
  const band = (bx) => poly(ctx, [P.pt(bx, y0 - 8, zTop + 13), P.pt(bx, y1 + 6, zBottom + 13), P.pt(bx, y1 + 6, zBottom), P.pt(bx, y0 - 8, zTop - 10)], '#5b6470', '#2a2230', 0.8);
  // far side panel first, then the steps, then the panel nearest the camera's centre line
  const farSide = x + w / 2 < P.cx ? xl : xr;
  const nearSide = farSide === xl ? xr : xl;
  band(farSide);
  poly(ctx, [P.pt(x, y0 - 6, zTop), P.pt(x + w, y0 - 6, zTop), P.pt(x + w, y1 + 4, zBottom), P.pt(x, y1 + 4, zBottom)], '#c9ced6', '#5b6470', 0.8);
  const gap = 6;
  const offset = ((t * 30) % gap) * (dir === 'up' ? -1 : 1);
  ctx.strokeStyle = '#8c939e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let yy = y0 + ((offset % gap) + gap) % gap; yy < y1; yy += gap) {
    const zz = zTop + ((yy - y0) / h) * (zBottom - zTop);
    const a = P.pt(x, yy, zz);
    const b = P.pt(x + w, yy, zz);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  for (const [yy, zz] of [[y0 - 6, zTop], [y1 + 4, zBottom]]) {
    const a = P.pt(x, yy, zz);
    const b = P.pt(x + w, yy, zz);
    ctx.strokeStyle = '#e2b007';
    ctx.lineWidth = 2 * P.s(yy);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  band(nearSide);
  for (const hx of [xl, xr]) {
    const a = P.pt(hx, y0 - 8, zTop + 14);
    const b = P.pt(hx, y1 + 6, zBottom + 14);
    ctx.strokeStyle = '#1d1f24';
    ctx.lineWidth = 3 * P.s(y1);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  const arrowY = dir === 'up' ? y1 - 12 : y0 + 12;
  const arrowZ = zTop + ((arrowY - y0) / h) * (zBottom - zTop);
  onFront(ctx, P, x + w / 2, arrowY, arrowZ, (c) => {
    c.fillStyle = 'rgba(30,140,60,0.9)';
    c.beginPath();
    if (dir === 'up') {
      c.moveTo(0, -7);
      c.lineTo(5, 0);
      c.lineTo(-5, 0);
    } else {
      c.moveTo(0, 0);
      c.lineTo(5, -7);
      c.lineTo(-5, -7);
    }
    c.fill();
  });
}

export function drawTravelator(ctx, P, rect, dir, z, t) {
  const { x, y, w, h } = rect;
  drawBox(ctx, P, { x, y, w, d: h, h: 3, z }, { front: '#5b6470', top: '#7d8590' });
  const gap = 6;
  const offset = ((t * 42) % gap) * (dir === 'right' ? 1 : -1);
  ctx.strokeStyle = '#9aa2ad';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let xx = x + 4 + ((offset % gap) + gap) % gap; xx < x + w - 4; xx += gap) {
    const a = P.pt(xx, y + 3, z + 3);
    const b = P.pt(xx, y + h - 3, z + 3);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  drawBox(ctx, P, { x, y: y - 2, w, d: 3, h: 13, z }, { front: '#3b4250', top: '#1d1f24' });
  drawBox(ctx, P, { x, y: y + h - 1, w, d: 3, h: 13, z }, { front: '#3b4250', top: '#1d1f24' });
  const ex = dir === 'right' ? x + 3 : x + w - 5;
  topQuad(ctx, P, ex, y + 2, 2, h - 3, z + 3.2, '#e2b007');
}

/** Queue barrier posts with belts between consecutive points. */
export function stanchions3d(ctx, P, points, belt, z) {
  ctx.strokeStyle = belt;
  ctx.beginPath();
  points.forEach(([px, py], i) => {
    const [sx, sy] = P.pt(px, py, z + 9);
    if (i) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
  });
  ctx.lineWidth = 1.6 * P.s(points[0][1]);
  ctx.stroke();
  for (const [px, py] of points) {
    onFront(ctx, P, px, py, z, (c) => {
      c.fillStyle = '#9aa0a8';
      c.fillRect(-0.9, -11, 1.8, 11);
      c.fillStyle = '#555';
      c.beginPath();
      c.ellipse(0, 0, 3, 1.2, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(0, -11, 1.4, 0, Math.PI * 2);
      c.fill();
    });
  }
}

/** Little pecking birds around a point (drawn under people). */
export function createPigeons(rng, P, cx, cy, count, spread, z) {
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
    bounds: { x: P.X(cx - spread - 20, cy + spread) - 20, y: P.Y(cy - spread, z) - 20, w: spread * 2 + 80, h: spread + 60 },
    update(dt) {
      for (const b of birds) {
        b.hop -= dt;
        if (b.hop <= 0) {
          b.hop = rng.range(0.6, 3);
          b.vx = (cx + rng.range(-spread, spread) - b.x) * 0.6;
          b.vy = (cy + rng.range(-spread / 2, spread / 2) - b.y) * 0.6;
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
        onFront(ctx, P, b.x, b.y, z, (c) => {
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(-3, -0.5, 6, 1.4);
          c.fillStyle = '#8d939c';
          c.beginPath();
          c.ellipse(0, -3, 3.4, 2.3, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#5f6b78';
          c.beginPath();
          c.arc(b.face * 3, -4.6 + peck, 1.5, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#e0a030';
          c.fillRect(b.face * 4.4 - 0.5, -4.6 + peck, 1, 0.8);
        });
      }
    },
  };
}

/** A vertical wall facing the camera along y = const from x0..x1, z0..z1, with optional openings. */
export function frontWall(ctx, P, x0, x1, y, z0, z1, fill, gaps = []) {
  let cursor = x0;
  for (const [g0, g1] of [...gaps, [x1, x1]]) {
    if (g0 > cursor) poly(ctx, [P.pt(cursor, y, z0), P.pt(g0, y, z0), P.pt(g0, y, z1), P.pt(cursor, y, z1)], fill, OUT, 0.8);
    cursor = Math.max(cursor, g1);
  }
}

/** Info desk with a round sign on a pole. */
export function infoDesk3d(ctx, P, x, y, z, colour, signColour, glyph) {
  drawBox(ctx, P, { x: x - 30, y: y - 14, w: 60, d: 14, h: 18, z }, { front: colour, top: '#e9e2d0' });
  onFront(ctx, P, x, y - 7, z, (c) => {
    c.fillStyle = '#3b4250';
    c.fillRect(-1.5, -66, 3, 48);
    c.beginPath();
    c.arc(0, -70, 11, 0, Math.PI * 2);
    c.fillStyle = signColour;
    c.fill();
    c.strokeStyle = OUT;
    c.stroke();
    text(c, glyph, 0, -70, { size: 14, colour: glyph === 'i' ? '#fff' : '#1f2d4a' });
  });
}

export { sideQuad, topQuad };
