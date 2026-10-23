/**
 * Clothing on the body: torso garments (with Mr. Wiggles' patchwork coat),
 * trousers/skirts at the hips, scarves, satchels, backpacks, vests, aprons.
 * All functions draw in the upper-body frame (canonical, standing pose).
 */
import { INK, TAU, shade, shadedFill, ellipse, rrect, stitches, stroke } from './core.js';

const WIGGLES_SHIRT = '#7d4bb3';

export function torsoPath(ctx, R, hemY, flare = 1) {
  const { shW: sh, waistW: wa, neckR: nk, shoulderY: sY, waistY: wY, crotchY: cY } = R;
  const hi = R.hipW * flare;
  const hipY = Math.min(hemY, cY);
  const hemW = hemY > cY ? hi * 1.06 : hi;
  ctx.beginPath();
  ctx.moveTo(-nk * 1.2, sY - 1.1);
  ctx.quadraticCurveTo(-sh * 0.72, sY - 1.05, -sh, sY + 0.25);
  ctx.quadraticCurveTo(-sh * 1.1, sY + 1.8, -sh * 0.97, sY + 3.6);
  ctx.quadraticCurveTo(-wa * 1.05, (sY + wY) / 2 + 1.5, -wa, wY);
  ctx.quadraticCurveTo(-hi, (wY + hipY) / 2 + 0.6, -hi, hipY);
  ctx.lineTo(-hemW, hemY);
  ctx.quadraticCurveTo(0, hemY + 0.4, hemW, hemY);
  ctx.lineTo(hi, hipY);
  ctx.quadraticCurveTo(hi, (wY + hipY) / 2 + 0.6, wa, wY);
  ctx.quadraticCurveTo(wa * 1.05, (sY + wY) / 2 + 1.5, sh * 0.97, sY + 3.6);
  ctx.quadraticCurveTo(sh * 1.1, sY + 1.8, sh, sY + 0.25);
  ctx.quadraticCurveTo(sh * 0.72, sY - 1.05, nk * 1.2, sY - 1.1);
  ctx.closePath();
}

export function torsoSidePath(ctx, R, hemY, flare = 1) {
  const { shoulderY: sY, waistY: wY, crotchY: cY, depthB: dB, depthF: dF } = R;
  const hipY = Math.min(hemY, cY);
  ctx.beginPath();
  ctx.moveTo(-R.neckR * 0.9, sY - 1.4);
  ctx.quadraticCurveTo(-dB * 1.05, sY - 0.6, -dB * 1.05, sY + 2.5);
  ctx.quadraticCurveTo(-dB * 0.82, (sY + wY) / 2 + 2, -dB * 0.82, wY);
  ctx.quadraticCurveTo(-dB * 1.08 * flare, (wY + hipY) / 2 + 1, -dB * flare, hipY);
  ctx.lineTo(-dB * 1.05 * flare, hemY);
  ctx.lineTo(dF * 0.92 * flare, hemY);
  ctx.lineTo(dF * 0.86, hipY);
  ctx.quadraticCurveTo(dF * 0.95, wY + 1, dF * 0.86, wY);
  ctx.quadraticCurveTo(dF * 1.12, (sY + wY) / 2, dF * 0.95, sY + 2);
  ctx.quadraticCurveTo(dF * 0.6, sY - 1, R.neckR * 0.9, sY - 1.4);
  ctx.closePath();
}

function stripesIn(ctx, colour, x0, y0, x1, y1, gap = 1.6) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = gap * 0.45;
  ctx.beginPath();
  for (let y = y0 + gap * 0.5; y < y1; y += gap) {
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + 0.25, x1, y);
  }
  ctx.stroke();
}

function dotsIn(ctx, colour, x0, y0, x1, y1, gap = 1.7) {
  ctx.fillStyle = colour;
  let row = 0;
  for (let y = y0 + gap * 0.5; y < y1; y += gap, row++) {
    for (let x = x0 + (row % 2 ? gap * 0.5 : 0); x < x1; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, 0.33, 0, TAU);
      ctx.fill();
    }
  }
}

function patch(ctx, colour, x, y, w, h) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
  stitches(ctx, x, y, w, h);
}

/** view: 'front' | 'back' | 'side' */
export function drawTorso(ctx, look, R, o, view) {
  const top = look.top;
  const side = view === 'side';
  const pathFn = () => (side ? torsoSidePath(ctx, R, o.hemY, o.flare) : torsoPath(ctx, R, o.hemY, o.flare));
  const x0 = side ? -R.depthB : -R.shW;
  const x1 = side ? R.depthF : R.shW;
  pathFn();
  shadedFill(ctx, top.color, x0, x1, { stroke: false });
  ctx.save();
  pathFn();
  ctx.clip();
  const yTop = R.shoulderY - 2;
  if (top.pattern === 'stripes') stripesIn(ctx, top.color2, x0 - 1, yTop, x1 + 1, o.hemY + 1);
  else if (top.pattern === 'dots') dotsIn(ctx, top.color2, x0 - 1, yTop, x1 + 1, o.hemY + 1);
  else if (top.pattern === 'patchwork') patchwork(ctx, look, R, o, view);
  if (look.vest) vest(ctx, look, R, o, view);
  if (look.apron && view !== 'back') {
    ctx.fillStyle = look.apron;
    if (side) ctx.fillRect(R.depthF * 0.55, R.shoulderY + 2.2, 1.2, o.hemY - R.shoulderY);
    else ctx.fillRect(-R.waistW * 0.8, R.shoulderY + 2.4, R.waistW * 1.6, o.hemY - R.shoulderY);
  }
  // soft fold shadows and a light-to-dark wash so patterns sit in the shading too
  ctx.beginPath();
  ctx.rect(x0 - 1, yTop, x1 - x0 + 2, o.hemY - yTop + 2);
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.1)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,0,20,0.18)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,30,0.18)';
  ctx.lineWidth = 0.16;
  ctx.beginPath();
  if (!side) {
    for (const s of [-1, 1]) {
      ctx.moveTo(s * R.waistW * 0.9, R.waistY - 1.6);
      ctx.quadraticCurveTo(s * R.waistW * 0.55, R.waistY - 0.6, s * R.waistW * 0.75, R.waistY + 0.6);
    }
  } else {
    ctx.moveTo(-R.depthB * 0.4, R.waistY - 1);
    ctx.quadraticCurveTo(0, R.waistY - 0.4, R.depthF * 0.5, R.waistY - 1);
  }
  ctx.stroke();
  ctx.restore();
  pathFn();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.26;
  ctx.stroke();
  details(ctx, look, R, o, view);
}

function patchwork(ctx, look, R, o, view) {
  const top = look.top;
  const sY = R.shoulderY - 2;
  const hem = o.hemY;
  if (view === 'side') {
    ctx.fillStyle = top.color2;
    ctx.fillRect(-R.depthB * 2, sY, R.depthB * 2 + R.depthF * 2, hem - sY + 2);
    dotsIn(ctx, top.accent, -R.depthB * 1.2, sY, R.depthF * 1.2, hem + 1, 1.8);
    patch(ctx, '#c9a26a', R.depthF * 0.1, R.waistY + 2.2, 2.4, 2.4);
    patch(ctx, top.patch, -R.depthB * 0.9, hem - 3, 2, 1.8);
    return;
  }
  const leftIsYellow = view === 'front';
  ctx.fillStyle = top.color2;
  ctx.fillRect(leftIsYellow ? 0 : -R.shW * 2, sY, R.shW * 2, hem - sY + 2);
  dotsIn(ctx, top.accent, leftIsYellow ? 0.4 : -R.shW * 1.3, sY, leftIsYellow ? R.shW * 1.3 : -0.4, hem + 1, 1.8);
  const s = leftIsYellow ? -1 : 1;
  patch(ctx, top.patch, s * R.shW * 0.78 - (s < 0 ? 0 : 2.3), R.waistY - 0.5, 2.3, 2.1);
  patch(ctx, top.accent, s * R.hipW * 0.95 - (s < 0 ? 0 : 3), hem - 4.2, 3, 2.6);
  patch(ctx, '#e98a3a', -s * R.hipW * 0.5 - 1, hem - 2.6, 1.9, 1.7);
  if (view === 'back') {
    ctx.save();
    ctx.setLineDash([0.4, 0.35]);
    ctx.strokeStyle = 'rgba(40,28,30,0.7)';
    ctx.lineWidth = 0.15;
    ctx.beginPath();
    ctx.moveTo(0, sY + 1);
    ctx.lineTo(0, hem);
    ctx.stroke();
    ctx.restore();
  }
}

function vest(ctx, look, R, o, view) {
  const hem = Math.min(o.hemY, R.crotchY - 0.4);
  ctx.fillStyle = look.vest;
  if (view === 'front') {
    ctx.fillRect(-R.shW * 1.2, R.shoulderY - 2, R.shW * 1.2 - 0.6, hem - R.shoulderY + 2);
    ctx.fillRect(0.6, R.shoulderY - 2, R.shW * 1.2, hem - R.shoulderY + 2);
  } else {
    ctx.fillRect(-R.shW * 1.2, R.shoulderY - 2, R.shW * 2.4, hem - R.shoulderY + 2);
  }
  ctx.fillStyle = 'rgba(240,244,246,0.95)';
  for (const y of [R.waistY - 0.8, R.waistY + 1.6]) ctx.fillRect(-R.shW * 1.2, y, R.shW * 2.4, 0.7);
}

function details(ctx, look, R, o, view) {
  const top = look.top;
  const sY = R.shoulderY;
  if (view === 'side') {
    if (top.type === 'coat') {
      ctx.strokeStyle = 'rgba(20,10,30,0.3)';
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(R.depthF * 0.85, sY + 1);
      ctx.lineTo(R.depthF * 0.92, o.hemY);
      ctx.stroke();
      if (top.pattern !== 'patchwork') {
        ctx.fillStyle = shade(top.color, -0.15);
        ctx.fillRect(-0.4, R.crotchY - 2.2, 2.2, 0.5);
      }
    }
    if (o.tucked) belt(ctx, -R.depthB * 0.85, R.depthF * 0.9, R.waistY + 0.6);
    return;
  }
  const front = view === 'front';
  if (!front) {
    if (o.shirt || top.type === 'coat') stroke(ctx, [[-R.neckR * 1.25, sY - 0.9], [0, sY - 0.5], [R.neckR * 1.25, sY - 0.9]], shade(top.color, -0.2), 0.45);
    if (o.tucked) belt(ctx, -R.waistW, R.waistW, R.waistY + 0.6);
    return;
  }
  if (top.type === 'coat') {
    const inner = top.pattern === 'patchwork' ? WIGGLES_SHIRT : top.color2 === top.color ? '#ece6da' : '#ece6da';
    const lapel = top.pattern === 'patchwork' ? top.accent : shade(top.color, -0.12);
    const open = top.pattern === 'patchwork';
    ctx.beginPath();
    ctx.moveTo(-1.6, sY - 1.05);
    ctx.lineTo(1.6, sY - 1.05);
    ctx.lineTo(open ? 1.1 : 0.2, open ? o.hemY : R.waistY - 1.5);
    ctx.lineTo(open ? -1.1 : -0.2, open ? o.hemY : R.waistY - 1.5);
    ctx.closePath();
    ctx.fillStyle = inner;
    ctx.fill();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 1.6, sY - 1.05);
      ctx.lineTo(s * 3.1, sY + 1.4);
      ctx.lineTo(s * 1.9, sY + 2.2);
      ctx.lineTo(s * (open ? 1.15 : 0.3), R.waistY - (open ? 0.5 : 1.4));
      ctx.closePath();
      ctx.fillStyle = lapel;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.18;
      ctx.stroke();
    }
    const bx = open ? -1.6 : 0.35;
    for (let i = 0; i < 3; i++) ellipse(ctx, bx, R.waistY + i * 2.2 - 0.6, 0.3, 0.3, 0, '#6b4a2a', null);
    if (!open) {
      ctx.fillStyle = shade(top.color, -0.15);
      for (const s of [-1, 1]) ctx.fillRect(s > 0 ? R.hipW * 0.25 : -R.hipW * 0.25 - 2.4, R.crotchY - 2.6, 2.4, 0.55);
      stroke(ctx, [[0.15, R.waistY - 1.5], [0.15, o.hemY]], 'rgba(20,10,30,0.3)', 0.15);
    }
  } else if (o.shirt) {
    if (o.tucked || look.uniform) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, sY - 0.2);
        ctx.lineTo(s * R.neckR * 1.35, sY - 1.25);
        ctx.lineTo(s * 1.35, sY + 0.6);
        ctx.closePath();
        ctx.fillStyle = shade(top.color, 0.2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.15;
        ctx.stroke();
      }
      stroke(ctx, [[0, sY - 0.2], [0, o.hemY]], 'rgba(20,10,30,0.25)', 0.14);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, sY - 1.05, R.neckR * 1.3, 0.9, 0, 0, Math.PI);
      ctx.strokeStyle = shade(top.color, -0.25);
      ctx.lineWidth = 0.35;
      ctx.stroke();
    }
    if (o.tucked) belt(ctx, -R.waistW, R.waistW, R.waistY + 0.6);
  } else {
    ctx.beginPath();
    ctx.ellipse(0, sY - 1.05, R.neckR * 1.4, 1.1, 0, 0, Math.PI);
    ctx.strokeStyle = shade(top.color, -0.25);
    ctx.lineWidth = 0.3;
    ctx.stroke();
    stroke(ctx, [[-R.waistW, R.waistY], [R.waistW, R.waistY]], shade(top.color, -0.2), 0.25);
  }
  if (look.apron) stroke(ctx, [[-R.waistW * 0.75, R.shoulderY + 2.4], [-R.neckR, R.shoulderY - 0.8], [R.neckR, R.shoulderY - 0.8], [R.waistW * 0.75, R.shoulderY + 2.4]], look.apron, 0.35);
}

function belt(ctx, x0, x1, y) {
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(x0, y - 0.4, x1 - x0, 0.8);
  ctx.fillStyle = '#c9b06a';
  ctx.fillRect((x0 + x1) / 2 - 0.4, y - 0.45, 0.8, 0.9);
}

// ------------------------------------------------------------------ hips
export function drawPelvis(ctx, look, R, view, dy) {
  const b = look.bottom;
  const wY = R.waistY + dy;
  const cY = R.crotchY + dy;
  const colour = b.type === 'skirt' ? look.top.type === 'dress' ? look.top.color : b.color : b.color;
  if (b.type === 'skirt' && look.top.type === 'dress') return;
  ctx.beginPath();
  if (view === 'side') {
    const { depthB: dB, depthF: dF } = R;
    ctx.moveTo(-dB * 0.82, wY);
    ctx.quadraticCurveTo(-dB * 1.12, (wY + cY) / 2, -dB * 0.95, cY + 0.6);
    ctx.lineTo(dF * 0.7, cY + 0.6);
    ctx.quadraticCurveTo(dF * 0.95, (wY + cY) / 2, dF * 0.86, wY);
  } else {
    const wa = R.waistW;
    const hi = R.hipW * (b.type === 'knickers' ? 1.08 : 1);
    ctx.moveTo(-wa, wY);
    ctx.quadraticCurveTo(-hi * 1.04, (wY + cY) / 2, -hi, cY + 0.5);
    ctx.lineTo(0, cY + 0.9);
    ctx.lineTo(hi, cY + 0.5);
    ctx.quadraticCurveTo(hi * 1.04, (wY + cY) / 2, wa, wY);
  }
  ctx.closePath();
  shadedFill(ctx, colour, view === 'side' ? -R.depthB : -R.hipW, view === 'side' ? R.depthF : R.hipW);
}

export function drawSkirt(ctx, look, R, view, dy, sit) {
  const b = look.bottom;
  if (b.type !== 'skirt' || look.top.type === 'dress') return;
  const wY = R.waistY + dy;
  const hem = sit ? R.hipJ + dy + 2.6 : R.kneeY - 0.6;
  ctx.beginPath();
  if (view === 'side') {
    ctx.moveTo(-R.depthB * 0.85, wY);
    ctx.lineTo(R.depthF * 0.86, wY);
    ctx.lineTo(R.depthF * (sit ? 3.4 : 1.5), hem);
    ctx.lineTo(-R.depthB * 1.45, hem);
  } else {
    ctx.moveTo(-R.waistW, wY);
    ctx.lineTo(R.waistW, wY);
    ctx.lineTo(R.hipW * 1.38, hem);
    ctx.quadraticCurveTo(0, hem + 0.5, -R.hipW * 1.38, hem);
  }
  ctx.closePath();
  shadedFill(ctx, b.color, -R.hipW, R.hipW);
}

// ------------------------------------------------------------------ accessories
export function drawScarf(ctx, look, R, view, flutter = 0) {
  const cols = look.scarf.colors;
  const sY = R.shoulderY;
  const bands = Math.max(4, cols.length);
  const nk = R.neckR;
  if (view === 'side') {
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-R.depthB * 0.9 + (i * (R.depthB * 0.9 + R.depthF * 0.9)) / bands, sY - 2.2, (R.depthB * 0.9 + R.depthF * 0.9) / bands + 0.05, 2.1);
    }
    ctx.save();
    ctx.translate(-R.depthB * 0.7, sY - 0.6);
    ctx.rotate(0.35 + flutter * 0.25);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = cols[(i + 1) % cols.length];
      ctx.fillRect(-0.9, i * 1.3, 1.8, 1.32);
    }
    ctx.restore();
    return;
  }
  rrect(ctx, -nk * 1.55, sY - 2.3, nk * 3.1, 2.3, 1);
  ctx.save();
  ctx.clip();
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-nk * 1.55 + (i * nk * 3.1) / bands, sY - 2.3, (nk * 3.1) / bands + 0.05, 2.3);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-nk * 1.55, sY - 0.9, nk * 3.1, 0.9);
  ctx.restore();
  rrect(ctx, -nk * 1.55, sY - 2.3, nk * 3.1, 2.3, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.18;
  ctx.stroke();
  if (view === 'back') return;
  const len = cols.length >= 4 ? 8 : 6;
  ctx.save();
  ctx.translate(-nk * 0.9, sY - 0.6);
  ctx.rotate(0.06);
  for (let i = 0; i < len; i++) {
    ctx.fillStyle = cols[(i + 1) % cols.length];
    ctx.fillRect(-0.85, i * 1.2, 1.7, 1.22);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.15;
  ctx.strokeRect(-0.85, 0, 1.7, len * 1.2);
  if (cols.length >= 4) {
    ctx.strokeStyle = cols[0];
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    for (let f = -0.7; f <= 0.75; f += 0.35) {
      ctx.moveTo(f, len * 1.2);
      ctx.lineTo(f, len * 1.2 + 0.9);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Mr. Wiggles' tan satchel stuffed with maps. `cs` is +1 when his left hip is at +x. */
export function drawSatchel(ctx, R, view, cs) {
  const strap = '#8a6a42';
  if (view === 'side') {
    stroke(ctx, [[R.depthF * 0.4, R.shoulderY - 0.8], [0.4, R.waistY + 2]], strap, 0.45);
    bag(ctx, -0.8, R.waistY + 1.6, 4.4, 3.8);
    return;
  }
  const bx = cs * R.hipW * 0.95;
  stroke(ctx, [[-cs * R.shW * 0.62, R.shoulderY - 0.5], [bx, R.waistY + 2]], strap, 0.45);
  if (view === 'back') return;
  bag(ctx, bx - 2.2, R.waistY + 1.4, 4.4, 3.8);
}

function bag(ctx, x, y, w, h) {
  ctx.fillStyle = '#efe2c0';
  ctx.fillRect(x + 0.6, y - 1.6, 0.9, 2);
  ctx.fillRect(x + 1.8, y - 1.1, 0.8, 1.5);
  rrect(ctx, x, y, w, h, 0.6);
  shadedFill(ctx, '#c8a878', x, x + w);
  rrect(ctx, x - 0.1, y - 0.1, w + 0.2, h * 0.45, 0.6);
  shadedFill(ctx, '#b39060', x, x + w);
  patch(ctx, '#d0607a', x + w * 0.6, y + h * 0.55, 1.2, 1.1);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + w / 2 - 0.25, y + h * 0.35, 0.5, 0.6);
}

export function drawBackpack(ctx, look, R, view) {
  const c = look.back.color;
  if (view === 'front') {
    for (const s of [-1, 1]) stroke(ctx, [[s * R.shW * 0.55, R.shoulderY - 0.9], [s * R.waistW * 0.75, R.waistY + 0.5]], shade(c, -0.25), 0.6);
    return;
  }
  if (view === 'back') {
    rrect(ctx, -R.shW * 0.7, R.shoulderY + 0.6, R.shW * 1.4, R.waistY - R.shoulderY + 2.4, 1.2);
    shadedFill(ctx, c, -R.shW, R.shW);
    rrect(ctx, -R.shW * 0.45, R.waistY - 1.6, R.shW * 0.9, 2.6, 0.6);
    shadedFill(ctx, shade(c, -0.12), -R.shW, R.shW);
    return;
  }
  rrect(ctx, -R.depthB - 2.2, R.shoulderY + 0.6, 2.6, R.waistY - R.shoulderY + 2.4, 0.9);
  shadedFill(ctx, c, -R.depthB - 2.2, -R.depthB + 0.4);
}

export function drawCameraStrap(ctx, R, view) {
  if (view === 'back') return;
  const cx = view === 'side' ? R.depthF * 0.9 : 0;
  stroke(ctx, [[cx - (view === 'side' ? 1.2 : 1.5), R.shoulderY - 0.8], [cx, R.shoulderY + 4.2], [cx + (view === 'side' ? 0 : 1.5), R.shoulderY - 0.8]], '#222', 0.22);
  rrect(ctx, cx - 1.3, R.shoulderY + 3.8, 2.6, 1.7, 0.3);
  ctx.fillStyle = '#2b2b2b';
  ctx.fill();
  ellipse(ctx, cx + 0.2, R.shoulderY + 4.65, 0.55, 0.55, 0, '#5a7fa0', '#111', 0.18);
}
