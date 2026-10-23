/**
 * Figure core: proportions ("rig"), outfit rules, walking gait and the
 * shaded-limb drawing primitives shared by every part of a character.
 *
 * Canonical frame: a figure is 40 units tall with the feet at y = 0 and the
 * crown of the head at y = -40 (canvas y grows downwards). +x is the
 * viewer's right in front view and "forwards" in side view.
 */
export const TAU = Math.PI * 2;
export const INK = 'rgba(34,24,36,0.55)';
export const SHADE = 'rgba(20,10,30,0.17)';
export const SHINE = 'rgba(255,255,255,0.16)';

export const frac = (v) => v - Math.floor(v);

const shadeCache = new Map();
/** Darken (amount < 0) or lighten (amount > 0) a #rgb / #rrggbb colour. */
export function shade(hex, amount = -0.2) {
  const key = hex + amount;
  let out = shadeCache.get(key);
  if (out) return out;
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return hex;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  out = `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}

/** Blend two hex colours. */
export function mix(a, b, t) {
  const p = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const x = p(a);
  const y = p(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

// ------------------------------------------------------------------ rig
const rigCache = new WeakMap();

/** Body proportions for a look, in canonical units. Children get bigger heads. */
export function rigOf(look) {
  const cached = rigCache.get(look);
  if (cached && cached.height === look.height) return cached;
  const b = look.build ?? 1;
  const hs = Math.max(1, Math.pow(40 / look.height, 0.55));
  const headH = 5.9 * hs;
  const headW = headH * 0.8;
  const L = 40 - headH;
  const shape = look.top?.type === 'dress' || look.bottom?.type === 'skirt' ? 0.85 : frac(b * 13.7 + look.height * 0.71) * 0.55;
  const crotchY = -L * 0.585;
  const kneeY = -L * 0.3;
  const R = {
    height: look.height,
    b,
    shape,
    top: -40,
    headH,
    headW,
    chin: -40 + headH,
    shoulderY: -L * 0.935,
    waistY: -L * 0.69,
    crotchY,
    hipJ: crotchY - 0.9,
    kneeY,
    ankleY: -1.25,
    upperArm: L * 0.2,
    foreArm: L * 0.16,
    shW: (4.5 - 0.6 * shape) * b,
    waistW: (3.25 - 0.3 * shape) * b,
    hipW: (3.5 + 0.55 * shape) * b,
    legX: (1.75 + 0.15 * shape) * b,
    thighR: 1.6 * b * (1 + 0.1 * shape),
    kneeR: 1.08 * b,
    ankleR: 0.66 * b,
    armR: 1.05 * b * (1 - 0.1 * shape),
    elbowR: 0.86 * b,
    wristR: 0.6 * b,
    neckR: headW * 0.2,
    depthB: 2.5 * b,
    depthF: 2.9 * b * (1 + 0.1 * shape),
  };
  R.thigh = R.kneeY - R.hipJ;
  R.shin = R.ankleY - R.kneeY;
  rigCache.set(look, R);
  return R;
}

/** Derived clothing rules (no randomness, so the crowd generator is untouched). */
export function outfitOf(look) {
  const R = rigOf(look);
  const top = look.top;
  const shirt = top.type === 'shirt';
  const shortSleeves = top.type === 'dress' || look.role === 'jogger' || (shirt && frac(look.height * 5.31) < 0.35);
  const tucked = shirt && !look.vest && !look.apron && (['pilot', 'security', 'rail'].includes(look.uniform) || frac(look.height * 3.13) < 0.25);
  const hemY = shirt ? (tucked ? R.waistY + 1.2 : R.crotchY - 0.4) : top.type === 'coat' ? (R.crotchY + R.kneeY) / 2 + 0.8 : R.kneeY - 0.8;
  const flare = top.type === 'dress' ? 1.32 : top.type === 'coat' ? 1.1 : 1;
  return { shortSleeves, tucked, hemY, flare, shirt };
}

/** Sleeve colour/pattern for the character's 'L' or 'R' arm. Mr. Wiggles' sleeves differ. */
export function sleeveOf(look, side) {
  const top = look.top;
  if (top.pattern === 'patchwork') return side === 'R' ? { c: top.color, pat: 'stripes', c2: top.accent } : { c: top.color2, pat: 'dots', c2: top.accent };
  return { c: top.color, pat: top.pattern === 'solid' ? null : top.pattern, c2: top.color2 };
}

// ------------------------------------------------------------------ gait
/**
 * Side-view joint angles for a walk/jog cycle. legs[0]/arms[0] are the
 * character's left limbs. The hip height is solved so the lowest foot stays
 * on the ground, which produces a natural bob.
 */
export function gaitOf(R, p) {
  const moving = p.mode === 'walk' || p.mode === 'jog';
  const jog = p.mode === 'jog';
  const amp = jog ? 0.6 : 0.36;
  const kAmp = jog ? 1.55 : 0.95;
  const legs = [0, 1].map((i) => {
    const a = p.phase + i * Math.PI;
    const th = moving ? amp * Math.sin(a) : 0;
    const kf = moving ? kAmp * Math.pow(Math.max(0, Math.cos(a)), 1.3) + 0.05 : 0.02;
    const kx = Math.sin(th) * R.thigh;
    const ky = Math.cos(th) * R.thigh;
    const sa = th - kf;
    return { th, sa, kx, ky, ax: kx + Math.sin(sa) * R.shin, ay: ky + Math.cos(sa) * R.shin, lift: 0 };
  });
  const lowest = Math.max(legs[0].ay, legs[1].ay);
  for (const l of legs) l.lift = lowest - l.ay;
  const hipY = R.ankleY - lowest;
  const armAmp = jog ? 0.7 : 0.4;
  const arms = [0, 1].map((i) => {
    const sa = moving ? -armAmp * Math.sin(p.phase + i * Math.PI) : 0.03;
    const fa = sa + (jog ? 1.45 : 0.15 + Math.max(0, sa) * 0.9);
    return { sa, fa };
  });
  return { moving, jog, legs, arms, hipY, dy: hipY - R.hipJ, lean: jog ? 0.12 : moving ? 0.03 : 0 };
}

// ------------------------------------------------------------------ primitives
export function capsulePath(ctx, x1, y1, r1, x2, y2, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, a, a - Math.PI, true);
  ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, a + Math.PI, a, true);
  ctx.closePath();
}

function shadeSide(x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  let nx = Math.cos(a);
  let ny = Math.sin(a);
  if (nx + ny * 0.5 < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
}

/** A tapered, softly shaded cylinder (arm, leg, sleeve …). */
export function limb(ctx, x1, y1, r1, x2, y2, r2, colour, dim = false) {
  capsulePath(ctx, x1, y1, r1, x2, y2, r2);
  ctx.fillStyle = dim ? shade(colour, -0.2) : colour;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.24;
  ctx.stroke();
  const [nx, ny] = shadeSide(x1, y1, x2, y2);
  capsulePath(ctx, x1 + nx * r1 * 0.5, y1 + ny * r1 * 0.5, r1 * 0.48, x2 + nx * r2 * 0.5, y2 + ny * r2 * 0.5, r2 * 0.48);
  ctx.fillStyle = SHADE;
  ctx.fill();
  capsulePath(ctx, x1 - nx * r1 * 0.45, y1 - ny * r1 * 0.45, r1 * 0.24, x2 - nx * r2 * 0.45, y2 - ny * r2 * 0.45, r2 * 0.24);
  ctx.fillStyle = SHINE;
  ctx.fill();
}

/** Stripes across a limb (sleeves, socks). `fill` makes stripes touch (multi-colour bands). */
export function limbBands(ctx, x1, y1, r1, x2, y2, r2, colours, period, { t0 = 0, t1 = 1, fill = false } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1e-4;
  const ux = dx / len;
  const uy = dy / len;
  const R = Math.max(r1, r2) * 1.6;
  ctx.save();
  capsulePath(ctx, x1, y1, r1, x2, y2, r2);
  ctx.clip();
  ctx.lineCap = 'butt';
  ctx.lineWidth = fill ? period * 1.02 : period * 0.5;
  let i = 0;
  for (let s = len * t0 + period * 0.5; s < len * t1 + period * 0.5; s += period, i++) {
    const cx = x1 + ux * s;
    const cy = y1 + uy * s;
    ctx.strokeStyle = colours[i % colours.length];
    ctx.beginPath();
    ctx.moveTo(cx - uy * R, cy + ux * R);
    ctx.lineTo(cx + uy * R, cy - ux * R);
    ctx.stroke();
  }
  ctx.restore();
}

/** Polka dots along a limb. */
export function limbDots(ctx, x1, y1, r1, x2, y2, r2, colour, spacing = 1.5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1e-4;
  const ux = dx / len;
  const uy = dy / len;
  ctx.save();
  capsulePath(ctx, x1, y1, r1, x2, y2, r2);
  ctx.clip();
  ctx.fillStyle = colour;
  let row = 0;
  for (let s = spacing * 0.5; s < len; s += spacing, row++) {
    const r = r1 + (r2 - r1) * (s / len);
    for (const off of row % 2 ? [-0.45, 0.45] : [0, -0.95, 0.95]) {
      ctx.beginPath();
      ctx.arc(x1 + ux * s - uy * off * r, y1 + uy * s + ux * off * r, Math.min(0.32, r * 0.3), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Fill the current path with a left-lit horizontal gradient, then ink it. */
export function shadedFill(ctx, colour, x0, x1, { stroke = true, light = 0.13, dark = -0.24 } = {}) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(colour, light));
  g.addColorStop(0.5, colour);
  g.addColorStop(1, shade(colour, dark));
  ctx.fillStyle = g;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.26;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, rot, fill, stroke = INK, lw = 0.24) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  else ctx.rect(x, y, w, h);
}

export function stroke(ctx, pts, colour, width) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Running stitch around a rectangle (patches on Mr. Wiggles' coat). */
export function stitches(ctx, x, y, w, h) {
  ctx.save();
  ctx.setLineDash([0.35, 0.3]);
  ctx.strokeStyle = 'rgba(40,28,30,0.75)';
  ctx.lineWidth = 0.14;
  ctx.strokeRect(x + 0.25, y + 0.25, w - 0.5, h - 0.5);
  ctx.restore();
}

/** Deterministic pick from a list using a look property as the seed. */
export function pickBy(list, seed) {
  return list[Math.floor(frac(seed * 7.919 + 0.31) * list.length)];
}
