/**
 * Heads: faces, hair, glasses, beards and hats in front, back and side views.
 * Coordinates are canonical (see core.js); `cx` is the head's centre line.
 */
import { TAU, INK, shade, mix, ellipse, pickBy } from './core.js';

const EYES = ['#4a2f1e', '#3b2a20', '#2f5d7c', '#4f6b3a', '#6b4a2a', '#2a2a2a'];
const GREYS = new Set(['#d8d8d8', '#bdbdbd', '#8e8e8e', '#f0f0f0']);
const isGrey = (look) => GREYS.has(look.hair?.color);

function eggPath(ctx, cx, top, w, h) {
  const hw = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + hw * 1.12, top, cx + hw * 1.1, top + h * 0.6, cx + hw * 0.72, top + h * 0.86);
  ctx.quadraticCurveTo(cx + hw * 0.4, top + h, cx, top + h);
  ctx.quadraticCurveTo(cx - hw * 0.4, top + h, cx - hw * 0.72, top + h * 0.86);
  ctx.bezierCurveTo(cx - hw * 1.1, top + h * 0.6, cx - hw * 1.12, top, cx, top);
  ctx.closePath();
}

function profilePath(ctx, cx, top, h, d) {
  ctx.beginPath();
  ctx.moveTo(cx - d * 0.55, top + h * 0.98);
  ctx.bezierCurveTo(cx - d * 1.28, top + h * 0.75, cx - d * 1.12, top - h * 0.02, cx - d * 0.05, top);
  ctx.bezierCurveTo(cx + d * 0.75, top, cx + d * 0.98, top + h * 0.22, cx + d * 0.95, top + h * 0.45);
  ctx.lineTo(cx + d * 0.9, top + h * 0.53);
  ctx.lineTo(cx + d * 1.16, top + h * 0.68);
  ctx.lineTo(cx + d * 0.95, top + h * 0.72);
  ctx.quadraticCurveTo(cx + d * 1.02, top + h * 0.8, cx + d * 0.92, top + h * 0.84);
  ctx.quadraticCurveTo(cx + d * 1.0, top + h * 0.95, cx + d * 0.72, top + h * 0.99);
  ctx.quadraticCurveTo(cx + d * 0.25, top + h * 1.0, cx + d * 0.1, top + h * 0.92);
  ctx.closePath();
}

function skinFill(ctx, skin, cx, top, w, h) {
  const g = ctx.createRadialGradient(cx - w * 0.18, top + h * 0.38, w * 0.06, cx, top + h * 0.5, w * 0.8);
  g.addColorStop(0, shade(skin, 0.12));
  g.addColorStop(0.6, skin);
  g.addColorStop(1, shade(skin, -0.18));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.24;
  ctx.stroke();
}

function hairFill(ctx, colour, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(colour, 0.2));
  g.addColorStop(0.45, colour);
  g.addColorStop(1, shade(colour, -0.28));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.22;
  ctx.stroke();
}

function strands(ctx, colour, lines) {
  ctx.strokeStyle = shade(colour, -0.32);
  ctx.lineWidth = 0.13;
  ctx.beginPath();
  for (const [x0, y0, cx, cy, x1, y1] of lines) {
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
  }
  ctx.stroke();
}

function curls(ctx, colour, blobs) {
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.18;
    ctx.stroke();
  }
  ctx.strokeStyle = shade(colour, 0.3);
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  for (const [x, y, r] of blobs) {
    ctx.moveTo(x - r * 0.45, y - r * 0.1);
    ctx.arc(x, y, r * 0.5, Math.PI * 1.05, Math.PI * 1.75);
  }
  ctx.stroke();
}

const WIGGLES_BACK = [[-0.62, 0.35, 0.3], [-0.74, 0.6, 0.29], [-0.68, 0.86, 0.26], [-0.45, 0.98, 0.22], [0.62, 0.35, 0.3], [0.74, 0.6, 0.29], [0.68, 0.86, 0.26], [0.45, 0.98, 0.22], [-0.4, 0.04, 0.32], [0.4, 0.04, 0.32], [0, -0.03, 0.34]];
const WIGGLES_FRINGE = [[-0.44, 0.22, 0.17], [-0.22, 0.12, 0.19], [0.03, 0.1, 0.19], [0.27, 0.13, 0.18], [0.46, 0.25, 0.16], [-0.56, 0.46, 0.16], [0.56, 0.46, 0.16]];

// ------------------------------------------------------------------ front & back
export function drawHeadFront(ctx, look, R, cx, back) {
  const w = R.headW;
  const h = R.headH;
  const top = R.top;
  const hair = look.hair;
  behindFront(ctx, look, cx, top, w, h, back);
  if (hair.style !== 'long' && hair.style !== 'wiggles') {
    for (const s of [-1, 1]) {
      ellipse(ctx, cx + s * w * 0.5, top + h * 0.56, 0.48, 0.8, 0, look.skin);
      ellipse(ctx, cx + s * w * 0.5, top + h * 0.57, 0.2, 0.44, 0, shade(look.skin, -0.2), null);
    }
  }
  eggPath(ctx, cx, top, w, h);
  skinFill(ctx, look.skin, cx, top, w, h);
  if (back) {
    hairBack(ctx, look, cx, top, w, h);
  } else {
    face(ctx, look, cx, top, w, h);
    hairFront(ctx, look, cx, top, w, h);
    if (look.glasses) glassesFront(ctx, look.glasses, cx, top, w, h);
  }
  if (look.hat) hatFront(ctx, look.hat, cx, top, w, h, back);
}

function behindFront(ctx, look, cx, top, w, h, back) {
  const { style, color } = look.hair;
  if (style === 'long') {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.56, top + h * 0.35);
    ctx.bezierCurveTo(cx - w * 0.62, top - h * 0.12, cx + w * 0.62, top - h * 0.12, cx + w * 0.56, top + h * 0.35);
    ctx.lineTo(cx + w * 0.72, top + h * 1.5);
    ctx.quadraticCurveTo(cx, top + h * 1.64, cx - w * 0.72, top + h * 1.5);
    ctx.closePath();
    hairFill(ctx, color, cx - w, top, cx + w, top + h * 1.5);
  } else if (style === 'wiggles') {
    curls(ctx, color, WIGGLES_BACK.map(([x, y, r]) => [cx + x * w, top + y * h, r * w]));
  } else if (style === 'curly') {
    curls(ctx, color, [[-0.5, 0.3, 0.22], [0.5, 0.3, 0.22], [-0.3, 0.02, 0.25], [0.3, 0.02, 0.25], [0, -0.05, 0.26]].map(([x, y, r]) => [cx + x * w, top + y * h, r * w]));
  } else if (style === 'bun' && !back) {
    ellipse(ctx, cx, top - h * 0.04, h * 0.2, h * 0.18, 0, color);
  }
}

function face(ctx, look, cx, top, w, h) {
  const skin = look.skin;
  const eyeY = top + h * 0.54;
  const ex = w * 0.2;
  const browC = look.hair.style === 'bald' && !isGrey(look) ? shade(skin, -0.45) : shade(look.hair.color, -0.15);
  ctx.strokeStyle = browC;
  ctx.lineWidth = 0.27;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(cx + s * (ex - 0.6), eyeY - 0.6);
    ctx.quadraticCurveTo(cx + s * ex, eyeY - 0.98, cx + s * (ex + 0.62), eyeY - 0.66);
  }
  ctx.stroke();
  const iris = look.isWiggles ? '#2f5d7c' : pickBy(EYES, look.height + look.build);
  for (const s of [-1, 1]) {
    ellipse(ctx, cx + s * ex, eyeY, 0.5, 0.28, 0, '#fbf8f2', null);
    ellipse(ctx, cx + s * ex + 0.05, eyeY + 0.02, 0.22, 0.24, 0, iris, null);
    ellipse(ctx, cx + s * ex + 0.05, eyeY + 0.02, 0.1, 0.1, 0, '#111', null);
    ellipse(ctx, cx + s * ex - 0.04, eyeY - 0.07, 0.06, 0.06, 0, '#fff', null);
    ctx.beginPath();
    ctx.ellipse(cx + s * ex, eyeY, 0.52, 0.3, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = shade(skin, -0.55);
    ctx.lineWidth = 0.16;
    ctx.stroke();
  }
  if (look.nose) {
    const g = ctx.createRadialGradient(cx - 0.25, top + h * 0.66, 0.05, cx, top + h * 0.69, 0.8);
    g.addColorStop(0, shade(look.nose, 0.4));
    g.addColorStop(1, shade(look.nose, -0.15));
    ellipse(ctx, cx, top + h * 0.69, 0.74, 0.66, 0, g, INK, 0.18);
  } else {
    ctx.strokeStyle = shade(skin, -0.32);
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(cx + 0.12, eyeY + 0.35);
    ctx.quadraticCurveTo(cx + 0.45, top + h * 0.66, cx + 0.3, top + h * 0.7);
    ctx.moveTo(cx - 0.38, top + h * 0.705);
    ctx.quadraticCurveTo(cx, top + h * 0.74, cx + 0.38, top + h * 0.705);
    ctx.stroke();
  }
  const my = top + h * 0.81;
  const lip = mix(skin.length === 7 ? skin : '#e0a87e', '#b5505a', 0.4);
  ellipse(ctx, cx, my + 0.24, 0.52, 0.2, 0, lip, null);
  ctx.beginPath();
  ctx.moveTo(cx - 0.75, my);
  ctx.quadraticCurveTo(cx, my + (look.isWiggles ? 0.7 : 0.22), cx + 0.75, my);
  if (look.isWiggles) {
    ctx.quadraticCurveTo(cx, my + 0.25, cx - 0.75, my);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.strokeStyle = shade(skin, -0.5);
  ctx.lineWidth = 0.2;
  ctx.stroke();
  for (const s of [-1, 1]) ellipse(ctx, cx + s * w * 0.3, top + h * 0.72, 0.6, 0.38, 0, look.isWiggles ? 'rgba(230,100,110,0.35)' : 'rgba(225,100,100,0.14)', null);
  if (isGrey(look)) {
    ctx.strokeStyle = shade(skin, -0.28);
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(cx + s * 0.55, top + h * 0.7);
      ctx.quadraticCurveTo(cx + s * 0.95, top + h * 0.78, cx + s * 0.85, top + h * 0.86);
    }
    ctx.stroke();
  }
  if (look.beard) {
    ctx.save();
    eggPath(ctx, cx, top, w, h);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.6, top + h * 0.58);
    ctx.quadraticCurveTo(cx - w * 0.2, top + h * 0.75, cx, top + h * 0.74);
    ctx.quadraticCurveTo(cx + w * 0.2, top + h * 0.75, cx + w * 0.6, top + h * 0.58);
    ctx.lineTo(cx + w * 0.6, top + h * 1.1);
    ctx.lineTo(cx - w * 0.6, top + h * 1.1);
    ctx.closePath();
    hairFill(ctx, look.beard, cx - w / 2, top + h * 0.6, cx + w / 2, top + h);
    ellipse(ctx, cx, my + 0.15, 0.55, 0.22, 0, shade(lip, -0.2), null);
    ctx.restore();
  }
}

function capPath(ctx, cx, top, w, h, curtain) {
  ctx.beginPath();
  ctx.moveTo(cx - w * (curtain ? 0.6 : 0.52), top + h * (curtain ? 1.0 : 0.5));
  ctx.bezierCurveTo(cx - w * 0.68, top - h * 0.15, cx + w * 0.68, top - h * 0.15, cx + w * (curtain ? 0.6 : 0.52), top + h * (curtain ? 1.0 : 0.5));
  if (curtain) ctx.lineTo(cx + w * 0.42, top + h * 0.92);
  ctx.lineTo(cx + w * 0.44, top + h * 0.38);
  ctx.quadraticCurveTo(cx + w * 0.05, top + h * 0.1, cx - w * 0.44, top + h * 0.34);
  if (curtain) ctx.lineTo(cx - w * 0.43, top + h * 0.92);
  ctx.closePath();
}

function hairFront(ctx, look, cx, top, w, h) {
  const { style, color } = look.hair;
  if (style === 'bald') {
    if (isGrey(look)) for (const s of [-1, 1]) ellipse(ctx, cx + s * w * 0.48, top + h * 0.45, 0.45, 0.85, s * 0.2, color);
    ellipse(ctx, cx - w * 0.12, top + h * 0.12, 0.8, 0.35, -0.3, 'rgba(255,255,255,0.25)', null);
    return;
  }
  if (style === 'wiggles') {
    curls(ctx, color, WIGGLES_FRINGE.map(([x, y, r]) => [cx + x * w, top + y * h, r * w]));
    return;
  }
  capPath(ctx, cx, top, w, h, style === 'long');
  hairFill(ctx, color, cx - w * 0.6, top, cx + w * 0.6, top + h * 0.6);
  strands(ctx, color, [
    [cx - w * 0.1, top + h * 0.02, cx - w * 0.35, top + h * 0.1, cx - w * 0.45, top + h * 0.36],
    [cx + w * 0.1, top + h * 0.02, cx + w * 0.35, top + h * 0.1, cx + w * 0.43, top + h * 0.36],
    [cx, top + h * 0.02, cx - w * 0.1, top + h * 0.12, cx - w * 0.2, top + h * 0.22],
  ]);
  ellipse(ctx, cx - w * 0.18, top + h * 0.1, w * 0.18, h * 0.05, -0.35, 'rgba(255,255,255,0.18)', null);
  if (style === 'spiky') {
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const bx = cx + i * w * 0.2;
      const by = top + h * 0.06 + Math.abs(i) * h * 0.06;
      ctx.moveTo(bx - w * 0.1, by + 0.4);
      ctx.lineTo(bx + i * 0.15, by - h * 0.2);
      ctx.lineTo(bx + w * 0.1, by + 0.4);
    }
    ctx.fillStyle = color;
    ctx.fill();
  } else if (style === 'curly') {
    curls(ctx, color, [-0.42, -0.2, 0.02, 0.24, 0.44].map((x, i) => [cx + x * w, top + h * (0.2 + (i % 2) * 0.05), w * 0.15]));
  }
}

function hairBack(ctx, look, cx, top, w, h) {
  const { style, color } = look.hair;
  if (style === 'bald') {
    if (isGrey(look)) {
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.62, w * 0.5, h * 0.2, 0, 0, Math.PI);
      hairFill(ctx, color, cx - w, top, cx + w, top + h);
    }
    return;
  }
  if (style === 'wiggles') {
    curls(ctx, color, [[-0.3, 0.2], [0.3, 0.2], [0, 0.1], [-0.4, 0.5], [0, 0.45], [0.4, 0.5], [-0.25, 0.75], [0.25, 0.75]].map(([x, y]) => [cx + x * w, top + y * h, w * 0.26]));
    return;
  }
  const low = style === 'short' || style === 'spiky' ? 0.86 : 0.95;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.54, top + h * 0.72);
  ctx.bezierCurveTo(cx - w * 0.7, top - h * 0.16, cx + w * 0.7, top - h * 0.16, cx + w * 0.54, top + h * 0.72);
  ctx.quadraticCurveTo(cx, top + h * low, cx - w * 0.54, top + h * 0.72);
  ctx.closePath();
  hairFill(ctx, color, cx - w * 0.6, top, cx + w * 0.6, top + h);
  strands(ctx, color, [[cx, top + h * 0.05, cx - w * 0.3, top + h * 0.4, cx - w * 0.25, top + h * 0.8], [cx, top + h * 0.05, cx + w * 0.3, top + h * 0.4, cx + w * 0.25, top + h * 0.8]]);
  if (style === 'bun') ellipse(ctx, cx, top + h * 0.3, h * 0.21, h * 0.19, 0, shade(color, 0.05));
  if (style === 'ponytail') {
    ctx.beginPath();
    ctx.moveTo(cx - 0.5, top + h * 0.5);
    ctx.quadraticCurveTo(cx - 1.1, top + h * 1.0, cx, top + h * 1.45);
    ctx.quadraticCurveTo(cx + 1.1, top + h * 1.0, cx + 0.5, top + h * 0.5);
    ctx.closePath();
    hairFill(ctx, color, cx - 1, top, cx + 1, top + h * 1.4);
  }
  if (style === 'curly') curls(ctx, color, [[-0.35, 0.25], [0.35, 0.25], [0, 0.15], [-0.4, 0.6], [0.4, 0.6], [0, 0.55]].map(([x, y]) => [cx + x * w, top + y * h, w * 0.2]));
}

function glassesFront(ctx, g, cx, top, w, h) {
  const y = top + h * 0.54;
  const ex = w * 0.2;
  const r = w * 0.15;
  for (const s of [-1, 1]) {
    ellipse(ctx, cx + s * ex, y, r, r * 0.92, 0, 'rgba(225,240,255,0.3)', s < 0 ? g.left : g.right, 0.24);
    ctx.beginPath();
    ctx.arc(cx + s * ex - 0.15, y - 0.15, r * 0.6, Math.PI * 1.1, Math.PI * 1.45);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.1;
    ctx.stroke();
  }
  ctx.strokeStyle = g.left;
  ctx.lineWidth = 0.16;
  ctx.beginPath();
  ctx.moveTo(cx - ex + r, y - 0.1);
  ctx.quadraticCurveTo(cx, y - 0.35, cx + ex - r, y - 0.1);
  ctx.moveTo(cx - ex - r, y);
  ctx.lineTo(cx - w * 0.5, y + 0.05);
  ctx.stroke();
  ctx.strokeStyle = g.right;
  ctx.beginPath();
  ctx.moveTo(cx + ex + r, y);
  ctx.lineTo(cx + w * 0.5, y + 0.05);
  ctx.stroke();
}

// ------------------------------------------------------------------ hats
function crownShade(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.16)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.24)');
  ctx.fillStyle = g;
  ctx.fill();
}

function domePath(ctx, cx, baseY, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(cx - rx, baseY);
  ctx.bezierCurveTo(cx - rx * 1.05, baseY - ry * 1.3, cx + rx * 1.05, baseY - ry * 1.3, cx + rx, baseY);
  ctx.closePath();
}

/** `side` is +1 when the hat's feather side faces +x (front view), -1 otherwise. */
export function hatFront(ctx, hat, cx, top, w, h, back = false) {
  const c = hat.color;
  const c2 = hat.color2 ?? c;
  const brimY = top + h * 0.26;
  switch (hat.type) {
    case 'wiggles': {
      ellipse(ctx, cx, brimY + 0.15, w * 0.88, h * 0.13, 0, shade(c, -0.15));
      const crown = () => {
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.5, brimY);
        ctx.bezierCurveTo(cx - w * 0.64, brimY - h * 0.9, cx - w * 0.74, brimY - h * 1.78, cx - w * 0.06, brimY - h * 1.8);
        ctx.bezierCurveTo(cx + w * 0.58, brimY - h * 1.84, cx + w * 0.64, brimY - h * 0.9, cx + w * 0.5, brimY);
        ctx.closePath();
      };
      crown();
      ctx.fillStyle = c;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = c2;
      ctx.lineWidth = w * 0.16;
      ctx.beginPath();
      for (let k = -4; k <= 4; k++) {
        const x = cx + k * w * 0.34;
        ctx.moveTo(x - w * 0.9, brimY + 1);
        ctx.quadraticCurveTo(x - w * 0.1, brimY - h * 0.7, x + w * 0.55, brimY - h * 1.95);
      }
      ctx.stroke();
      crown();
      crownShade(ctx, cx - w * 0.6, cx + w * 0.6);
      ctx.restore();
      crown();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.24;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.52, brimY - h * 0.02);
      ctx.quadraticCurveTo(cx, brimY + h * 0.06, cx + w * 0.52, brimY - h * 0.02);
      ctx.lineTo(cx + w * 0.54, brimY - h * 0.26);
      ctx.quadraticCurveTo(cx, brimY - h * 0.18, cx - w * 0.54, brimY - h * 0.26);
      ctx.closePath();
      ctx.fillStyle = shade(c2, -0.05);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, brimY + 0.15, w * 0.88, h * 0.13, 0, 0, Math.PI);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.stroke();
      const s = back ? -1 : 1;
      const fx = cx + s * w * 0.42;
      ctx.beginPath();
      ctx.moveTo(fx, brimY - h * 0.12);
      ctx.quadraticCurveTo(fx + s * w * 0.6, brimY - h * 0.7, fx + s * w * 0.34, brimY - h * 1.4);
      ctx.quadraticCurveTo(fx + s * w * 0.16, brimY - h * 0.66, fx, brimY - h * 0.12);
      ctx.fillStyle = '#efe2bd';
      ctx.fill();
      ctx.strokeStyle = '#a89060';
      ctx.lineWidth = 0.16;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, brimY - h * 0.12);
      ctx.quadraticCurveTo(fx + s * w * 0.36, brimY - h * 0.7, fx + s * w * 0.34, brimY - h * 1.4);
      ctx.stroke();
      break;
    }
    case 'cap':
      domePath(ctx, cx, brimY + h * 0.05, w * 0.56, h * 0.5);
      ctx.fillStyle = c;
      ctx.fill();
      crownShade(ctx, cx - w * 0.6, cx + w * 0.6);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.22;
      ctx.stroke();
      ellipse(ctx, cx, top - h * 0.06, 0.3, 0.2, 0, shade(c, -0.2), null);
      if (!back) {
        ctx.beginPath();
        ctx.ellipse(cx, brimY + h * 0.05, w * 0.56, h * 0.13, 0, 0, Math.PI);
        ctx.fillStyle = shade(c, -0.2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'beanie':
      domePath(ctx, cx, brimY + h * 0.1, w * 0.57, h * 0.56);
      ctx.fillStyle = c;
      ctx.fill();
      crownShade(ctx, cx - w * 0.6, cx + w * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(cx - w * 0.58, brimY - h * 0.06, w * 1.16, h * 0.17);
      ctx.fillStyle = c2;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.2;
      ctx.stroke();
      ctx.strokeStyle = shade(c2, -0.25);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      for (let x = -0.5; x <= 0.5; x += 0.12) {
        ctx.moveTo(cx + x * w, brimY - h * 0.05);
        ctx.lineTo(cx + x * w, brimY + h * 0.1);
      }
      ctx.stroke();
      ellipse(ctx, cx, top - h * 0.18, h * 0.16, h * 0.15, 0, c2);
      break;
    case 'bowler':
      ellipse(ctx, cx, brimY + h * 0.04, w * 0.7, h * 0.09, 0, shade(c, -0.1));
      domePath(ctx, cx, brimY, w * 0.48, h * 0.62);
      ctx.fillStyle = c;
      ctx.fill();
      crownShade(ctx, cx - w * 0.5, cx + w * 0.5);
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = shade(c, -0.35);
      ctx.fillRect(cx - w * 0.47, brimY - h * 0.12, w * 0.94, h * 0.1);
      break;
    case 'sun':
      ellipse(ctx, cx, brimY + h * 0.06, w * 1.05, h * 0.2, 0, shade(c, -0.08));
      domePath(ctx, cx, brimY, w * 0.48, h * 0.45);
      ctx.fillStyle = c;
      ctx.fill();
      crownShade(ctx, cx - w * 0.5, cx + w * 0.5);
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = c2;
      ctx.fillRect(cx - w * 0.47, brimY - h * 0.1, w * 0.94, h * 0.09);
      if (!back) {
        ctx.beginPath();
        ctx.ellipse(cx, brimY + h * 0.06, w * 1.05, h * 0.2, 0, 0.1, Math.PI - 0.1);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'beret':
      ellipse(ctx, cx + w * 0.08, top + h * 0.1, w * 0.64, h * 0.22, -0.12, c);
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.08, top + h * 0.1, w * 0.64, h * 0.22, -0.12, 0, TAU);
      crownShade(ctx, cx - w * 0.6, cx + w * 0.7);
      ellipse(ctx, cx + w * 0.1, top - h * 0.1, 0.2, 0.3, 0, c, null);
      break;
    case 'pilot': {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, brimY + h * 0.04);
      ctx.lineTo(cx - w * 0.64, top - h * 0.12);
      ctx.lineTo(cx + w * 0.64, top - h * 0.12);
      ctx.lineTo(cx + w * 0.5, brimY + h * 0.04);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      crownShade(ctx, cx - w * 0.6, cx + w * 0.6);
      ctx.strokeStyle = INK;
      ctx.stroke();
      ellipse(ctx, cx, top - h * 0.12, w * 0.64, h * 0.08, 0, shade(c, 0.15));
      ctx.fillStyle = c2;
      ctx.fillRect(cx - w * 0.52, brimY - h * 0.1, w * 1.04, h * 0.07);
      if (!back) {
        ellipse(ctx, cx, top + h * 0.02, 0.45, 0.35, 0, c2);
        ctx.beginPath();
        ctx.ellipse(cx, brimY + h * 0.05, w * 0.52, h * 0.12, 0, 0, Math.PI);
        ctx.fillStyle = '#111';
        ctx.fill();
      }
      break;
    }
    case 'chef':
      ctx.beginPath();
      ctx.rect(cx - w * 0.5, brimY - h * 0.28, w, h * 0.3);
      ctx.fillStyle = '#f4f4f0';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.2;
      ctx.stroke();
      curls(ctx, '#ffffff', [[-0.35, -0.55, 0.32], [0.35, -0.55, 0.32], [0, -0.72, 0.36], [-0.15, -0.95, 0.3], [0.2, -0.95, 0.3]].map(([x, y, r]) => [cx + x * w, brimY + y * h * 1.5, r * w]));
      break;
    case 'headband':
      ctx.fillStyle = c;
      ctx.fillRect(cx - w * 0.52, top + h * 0.22, w * 1.04, h * 0.13);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ side (facing +x)
export function drawHeadSide(ctx, look, R, cx) {
  const w = R.headW;
  const h = R.headH;
  const top = R.top;
  const d = w * 0.58;
  const { style, color } = look.hair;
  if (style === 'wiggles') {
    curls(ctx, color, [[-1.1, 0.28, 0.32], [-1.28, 0.58, 0.3], [-1.08, 0.88, 0.28], [-0.72, 1.0, 0.24], [-0.6, 0.02, 0.3], [-0.05, -0.06, 0.3], [0.45, 0.05, 0.26]].map(([x, y, r]) => [cx + x * d, top + y * h, r * w]));
  } else if (style === 'long') {
    ctx.beginPath();
    ctx.moveTo(cx + d * 0.3, top - h * 0.02);
    ctx.quadraticCurveTo(cx - d * 1.4, top + h * 0.1, cx - d * 1.15, top + h * 1.55);
    ctx.lineTo(cx - d * 0.3, top + h * 1.45);
    ctx.lineTo(cx - d * 0.2, top + h * 0.5);
    ctx.closePath();
    hairFill(ctx, color, cx - d, top, cx + d, top + h * 1.5);
  } else if (style === 'ponytail') {
    ctx.beginPath();
    ctx.moveTo(cx - d * 0.95, top + h * 0.32);
    ctx.quadraticCurveTo(cx - d * 1.9, top + h * 0.6, cx - d * 1.45, top + h * 1.3);
    ctx.quadraticCurveTo(cx - d * 1.25, top + h * 0.75, cx - d * 0.85, top + h * 0.55);
    ctx.closePath();
    hairFill(ctx, color, cx - d * 2, top, cx, top + h);
  } else if (style === 'bun') {
    ellipse(ctx, cx - d * 0.92, top + h * 0.15, h * 0.2, h * 0.19, 0, color);
  }
  profilePath(ctx, cx, top, h, d);
  skinFill(ctx, look.skin, cx, top, w, h);
  ellipse(ctx, cx - d * 0.12, top + h * 0.56, 0.52, 0.85, 0.1, look.skin);
  ellipse(ctx, cx - d * 0.1, top + h * 0.57, 0.22, 0.45, 0.1, shade(look.skin, -0.2), null);
  const ey = top + h * 0.53;
  ellipse(ctx, cx + d * 0.66, ey, 0.32, 0.25, 0, '#fbf8f2', null);
  ellipse(ctx, cx + d * 0.76, ey + 0.02, 0.17, 0.21, 0, look.isWiggles ? '#2f5d7c' : pickBy(EYES, look.height + look.build), null);
  ctx.strokeStyle = shade(look.hair.style === 'bald' ? look.skin : color, -0.2);
  ctx.lineWidth = 0.26;
  ctx.beginPath();
  ctx.moveTo(cx + d * 0.42, ey - 0.62);
  ctx.quadraticCurveTo(cx + d * 0.7, ey - 0.9, cx + d * 0.92, ey - 0.62);
  ctx.stroke();
  if (look.nose) ellipse(ctx, cx + d * 1.14, top + h * 0.67, 0.76, 0.68, 0, look.nose, INK, 0.18);
  ctx.strokeStyle = shade(look.skin, -0.5);
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(cx + d * 0.78, top + h * 0.8);
  ctx.quadraticCurveTo(cx + d * 0.88, top + h * (look.isWiggles ? 0.84 : 0.815), cx + d * 0.98, top + h * 0.8);
  ctx.stroke();
  ellipse(ctx, cx + d * 0.48, top + h * 0.72, 0.6, 0.38, 0, look.isWiggles ? 'rgba(230,100,110,0.35)' : 'rgba(225,100,100,0.14)', null);
  if (look.beard) {
    ctx.save();
    profilePath(ctx, cx, top, h, d);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx - d * 0.1, top + h * 0.5);
    ctx.lineTo(cx + d * 0.3, top + h * 0.72);
    ctx.lineTo(cx + d * 1.2, top + h * 0.76);
    ctx.lineTo(cx + d * 1.2, top + h * 1.2);
    ctx.lineTo(cx - d * 0.3, top + h * 1.2);
    ctx.closePath();
    hairFill(ctx, look.beard, cx, top, cx + d, top + h);
    ctx.restore();
  }
  hairSide(ctx, look, cx, top, h, d, w);
  if (look.glasses) {
    ellipse(ctx, cx + d * 0.74, ey, 0.24, w * 0.15, 0, 'rgba(225,240,255,0.3)', look.glasses.right, 0.24);
    ctx.strokeStyle = look.glasses.right;
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    ctx.moveTo(cx + d * 0.7, ey - 0.1);
    ctx.lineTo(cx - d * 0.1, ey + 0.05);
    ctx.stroke();
  }
  if (look.hat) {
    if (look.hat.type === 'cap' || look.hat.type === 'pilot') {
      const brimY = top + h * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx + d * 0.6, brimY);
      ctx.quadraticCurveTo(cx + d * 1.4, brimY - h * 0.02, cx + d * 1.75, brimY + h * 0.12);
      ctx.lineTo(cx + d * 0.6, brimY + h * 0.08);
      ctx.closePath();
      ctx.fillStyle = look.hat.type === 'pilot' ? '#111' : shade(look.hat.color, -0.2);
      ctx.fill();
    }
    hatFront(ctx, look.hat, cx - d * 0.12, top, d * 2.05, h, false);
  }
}

function hairSide(ctx, look, cx, top, h, d, w) {
  const { style, color } = look.hair;
  if (style === 'bald') {
    if (isGrey(look)) ellipse(ctx, cx - d * 0.45, top + h * 0.5, 0.9, 0.7, 0, color);
    return;
  }
  if (style === 'wiggles') {
    curls(ctx, color, [[-0.75, 0.3, 0.26], [-0.4, 0.12, 0.24], [0.1, 0.06, 0.22], [0.55, 0.16, 0.18], [-0.55, 0.62, 0.22]].map(([x, y, r]) => [cx + x * d, top + y * h, r * w]));
    return;
  }
  const nape = style === 'short' || style === 'spiky' ? 0.8 : 0.9;
  ctx.beginPath();
  ctx.moveTo(cx + d * 0.88, top + h * 0.26);
  ctx.quadraticCurveTo(cx + d * 0.55, top - h * 0.13, cx - d * 0.3, top - h * 0.07);
  ctx.quadraticCurveTo(cx - d * 1.35, top + h * 0.15, cx - d * 1.05, top + h * nape);
  ctx.lineTo(cx - d * 0.62, top + h * 0.86);
  ctx.quadraticCurveTo(cx - d * 0.55, top + h * 0.52, cx - d * 0.4, top + h * 0.42);
  ctx.quadraticCurveTo(cx - d * 0.05, top + h * 0.34, cx + d * 0.12, top + h * 0.42);
  ctx.lineTo(cx + d * 0.16, top + h * 0.58);
  ctx.lineTo(cx + d * 0.3, top + h * 0.36);
  ctx.quadraticCurveTo(cx + d * 0.5, top + h * 0.28, cx + d * 0.88, top + h * 0.26);
  ctx.closePath();
  hairFill(ctx, color, cx - d, top, cx + d, top + h);
  strands(ctx, color, [[cx + d * 0.6, top + h * 0.05, cx - d * 0.4, top, cx - d * 0.95, top + h * 0.5], [cx + d * 0.3, top + h * 0.2, cx - d * 0.5, top + h * 0.15, cx - d * 0.8, top + h * 0.7]]);
  if (style === 'curly') curls(ctx, color, [[-0.9, 0.2], [-0.5, 0.02], [0, -0.02], [0.45, 0.06], [-1.0, 0.55]].map(([x, y]) => [cx + x * d, top + y * h, w * 0.17]));
  if (style === 'spiky') {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const bx = cx + d * (0.5 - i * 0.45);
      ctx.moveTo(bx - 0.5, top + h * 0.05);
      ctx.lineTo(bx - 0.9, top - h * 0.18);
      ctx.lineTo(bx + 0.4, top);
    }
    ctx.fillStyle = color;
    ctx.fill();
  }
}
