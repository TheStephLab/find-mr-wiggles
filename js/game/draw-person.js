/**
 * Draws a character from a "look" (see people.js) and a pose.
 * All drawing happens in a canonical 40-unit-tall frame with the origin at
 * the feet, then scaled to the character's height. Mr. Wiggles uses exactly
 * the same renderer, which keeps him consistent across every scene.
 */
const OUT = '#2a2230';
const HIP = -17;
const SHOULDER = -29.4;
const HEAD_Y = -35.4;
const HEAD_R = 4.9;
const TAU = Math.PI * 2;

const shadeCache = new Map();
export function shade(hex, amount = -0.2) {
  const key = hex + amount;
  let out = shadeCache.get(key);
  if (out) return out;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  out = `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function circle(ctx, x, y, r, fill, stroke, lw = 0.6) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
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

function ellipse(ctx, x, y, rx, ry, fill, stroke, lw = 0.6) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
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

function line(ctx, x1, y1, x2, y2, colour, width) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Entry point. `lod` is 'full' or 'simple'. */
export function drawPerson(ctx, look, pose, x, y, lod = 'full') {
  const s = look.height / 40;
  const flip = pose.dir === 'left' ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (lod === 'simple') drawSimple(ctx, look, pose);
  else if (pose.dir === 'left' || pose.dir === 'right') drawSide(ctx, look, pose);
  else drawFrontBack(ctx, look, pose, pose.dir === 'up');
  ctx.restore();
}

function motion(pose) {
  const moving = pose.mode === 'walk' || pose.mode === 'jog';
  const amp = pose.mode === 'jog' ? 1.7 : 1;
  const swing = moving ? Math.sin(pose.phase) : 0;
  const bob = moving ? -Math.abs(Math.cos(pose.phase)) * 0.9 * amp : Math.sin(pose.t * 2 + (pose.seed ?? 0)) * 0.25;
  const sit = pose.mode === 'sit';
  return { moving, amp, swing, bob, sit, off: (sit ? 5 : 0) + bob };
}

// ---------------------------------------------------------------- simple LOD
function drawSimple(ctx, look, pose) {
  const { off } = motion(pose);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(-6, -1.5, 12, 3);
  ctx.fillStyle = look.bottom.type === 'knickers' ? look.bottom.color : look.bottom.color;
  ctx.fillRect(-4, HIP + off, 8, -HIP - off);
  const w = 12 * look.build;
  const torsoBottom = look.top.type === 'coat' ? -13 : -16;
  if (look.top.pattern === 'patchwork') {
    ctx.fillStyle = look.top.color;
    ctx.fillRect(-w / 2, -31 + off, w / 2, torsoBottom + 31);
    ctx.fillStyle = look.top.color2;
    ctx.fillRect(0, -31 + off, w / 2, torsoBottom + 31);
  } else {
    ctx.fillStyle = look.vest ?? look.top.color;
    ctx.fillRect(-w / 2, -31 + off, w, torsoBottom + 31);
  }
  ctx.fillStyle = look.skin;
  ctx.fillRect(-4.6, HEAD_Y - 4.6 + off, 9.2, 9.2);
  if (look.hair.style !== 'bald') {
    ctx.fillStyle = look.hair.color;
    if (look.hair.style === 'wiggles') {
      ctx.fillRect(-8, -38 + off, 16, 6);
    } else {
      ctx.fillRect(-5, HEAD_Y - 5.4 + off, 10, pose.dir === 'up' ? 9 : 3.5);
    }
  }
  if (look.hat) {
    if (look.hat.type === 'wiggles') {
      ctx.fillStyle = look.hat.color;
      ctx.fillRect(-7.5, -40.5 + off, 15, 2.5);
      ctx.fillRect(-5, -50 + off, 10, 10);
      ctx.fillStyle = look.hat.color2;
      ctx.fillRect(-5, -46 + off, 10, 2.4);
      ctx.fillRect(-5, -42.5 + off, 10, 2);
    } else {
      ctx.fillStyle = look.hat.color;
      ctx.fillRect(-5.5, -42 + off, 11, 3.6);
    }
  }
  if (look.carry?.type === 'balloon') circle(ctx, 9, -56, 4.5, look.carry.color);
  if (look.carry?.type === 'wigglesStick') {
    ctx.fillStyle = '#6b4526';
    ctx.fillRect(8.5, -20, 1.6, 20);
  }
}

// ---------------------------------------------------------------- torso
function torso(ctx, look, x, y, w, h, view) {
  const top = look.top;
  rrect(ctx, x, y, w, h, 2.4);
  ctx.fillStyle = top.color;
  ctx.fill();
  if (top.pattern !== 'solid' || look.vest || look.apron) {
    ctx.save();
    ctx.clip();
    if (top.pattern === 'stripes') {
      ctx.fillStyle = top.color2;
      for (let yy = y + 1; yy < y + h; yy += 2.8) ctx.fillRect(x, yy, w, 1.4);
    } else if (top.pattern === 'dots') {
      ctx.fillStyle = top.color2;
      for (let yy = y + 1.5; yy < y + h; yy += 2.8) {
        for (let xx = x + 1.2 + ((yy - y) % 5.6 > 2 ? 1.4 : 0); xx < x + w; xx += 2.8) {
          ctx.beginPath();
          ctx.arc(xx, yy, 0.6, 0, TAU);
          ctx.fill();
        }
      }
    } else if (top.pattern === 'patchwork') {
      patchwork(ctx, top, x, y, w, h, view);
    }
    if (look.vest) {
      ctx.fillStyle = look.vest;
      if (view === 'front') {
        ctx.fillRect(x, y + 1, w * 0.36, h);
        ctx.fillRect(x + w * 0.64, y + 1, w * 0.36, h);
      } else {
        ctx.fillRect(x, y + 1, w, h);
      }
      ctx.fillStyle = 'rgba(235,235,235,0.9)';
      ctx.fillRect(x, y + h * 0.55, w, 1.1);
      ctx.fillRect(x, y + h * 0.78, w, 1.1);
    }
    if (look.apron && view !== 'back') {
      ctx.fillStyle = look.apron;
      ctx.fillRect(x + w * 0.18, y + h * 0.28, w * 0.64, h);
    }
    ctx.restore();
  }
  rrect(ctx, x, y, w, h, 2.4);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

function patchwork(ctx, top, x, y, w, h, view) {
  const half = x + w / 2;
  if (view === 'side') {
    ctx.fillStyle = top.color2;
    ctx.fillRect(x, y, w, h);
    dotsIn(ctx, top.accent, x, y, w, h);
    ctx.fillStyle = top.patch;
    ctx.fillRect(x + w * 0.15, y + h * 0.55, w * 0.4, h * 0.2);
    stitches(ctx, x + w * 0.15, y + h * 0.55, w * 0.4, h * 0.2);
    return;
  }
  if (view === 'front') {
    ctx.fillStyle = top.color2;
    ctx.fillRect(half, y, w / 2, h);
    dotsIn(ctx, top.accent, half, y, w / 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y + h * 0.1, w * 0.12, h);
    ctx.fillStyle = top.patch;
    ctx.fillRect(x + w * 0.08, y + h * 0.56, w * 0.26, h * 0.2);
    stitches(ctx, x + w * 0.08, y + h * 0.56, w * 0.26, h * 0.2);
    ctx.fillStyle = top.accent;
    ctx.fillRect(x + w * 0.1, y + h * 0.8, w * 0.28, h * 0.16);
    // lapels + buttons
    ctx.fillStyle = top.accent;
    ctx.beginPath();
    ctx.moveTo(half - 3.2, y);
    ctx.lineTo(half - 0.6, y + h * 0.45);
    ctx.lineTo(half - 0.6, y);
    ctx.moveTo(half + 3.2, y);
    ctx.lineTo(half + 0.6, y + h * 0.45);
    ctx.lineTo(half + 0.6, y);
    ctx.fill();
    ctx.fillStyle = '#6b4a2a';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(half - 1.6, y + h * 0.5 + i * 2.4, 0.5, 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = shade(top.color2, -0.15);
    ctx.fillRect(x, y, w / 2, h);
    ctx.fillStyle = top.patch;
    ctx.fillRect(x + w * 0.55, y + h * 0.4, w * 0.28, h * 0.22);
    stitches(ctx, x + w * 0.55, y + h * 0.4, w * 0.28, h * 0.22);
    ctx.fillStyle = top.accent;
    ctx.fillRect(x + w * 0.12, y + h * 0.7, w * 0.25, h * 0.18);
    line(ctx, half, y + 1, half, y + h, 'rgba(60,40,30,0.5)', 0.4);
  }
}

function dotsIn(ctx, colour, x, y, w, h) {
  ctx.fillStyle = colour;
  for (let yy = y + 1.6; yy < y + h; yy += 3) {
    for (let xx = x + 1.4; xx < x + w; xx += 3) {
      ctx.beginPath();
      ctx.arc(xx, yy, 0.75, 0, TAU);
      ctx.fill();
    }
  }
}

function stitches(ctx, x, y, w, h) {
  ctx.save();
  ctx.setLineDash([0.5, 0.5]);
  ctx.strokeStyle = 'rgba(40,30,30,0.7)';
  ctx.lineWidth = 0.3;
  ctx.strokeRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6);
  ctx.restore();
}

// ---------------------------------------------------------------- limbs
function arm(ctx, look, sx, sy, hx, hy, which, far = false) {
  const top = look.top;
  let colour = top.type === 'dress' ? look.skin : top.color;
  if (top.pattern === 'patchwork') colour = which === 'left' ? top.color : top.color2;
  if (look.vest && top.type !== 'coat') colour = top.color;
  if (far) colour = shade(colour, -0.2);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4.3;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3.1;
  ctx.stroke();
  if (top.pattern === 'patchwork') {
    ctx.save();
    if (which === 'left') {
      ctx.setLineDash([1.1, 1.1]);
      ctx.strokeStyle = top.accent;
      ctx.lineWidth = 3.1;
      ctx.lineCap = 'butt';
    } else {
      ctx.setLineDash([0.01, 2.2]);
      ctx.strokeStyle = top.accent;
      ctx.lineWidth = 1.4;
    }
    ctx.stroke();
    ctx.restore();
  } else if (top.pattern === 'stripes') {
    ctx.save();
    ctx.setLineDash([1.3, 1.3]);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = top.color2;
    ctx.stroke();
    ctx.restore();
  }
  circle(ctx, hx, hy, 1.45, far ? shade(look.skin, -0.12) : look.skin, OUT, 0.45);
}

function legBottomColour(look) {
  return look.bottom.type === 'skirt' ? look.skin : look.bottom.color;
}

/** Straight leg from hip to foot (front/back view). */
function legFront(ctx, look, lx, hipY, footY) {
  const b = look.bottom;
  const w = 4.4;
  rrect(ctx, lx - w / 2, hipY, w, footY - hipY, 1.2);
  ctx.fillStyle = b.type === 'trousers' ? b.color : look.skin;
  ctx.fill();
  if (b.type === 'shorts') {
    ctx.fillStyle = b.color;
    ctx.fillRect(lx - w / 2, hipY, w, (footY - hipY) * 0.45);
  }
  if (b.type === 'knickers') {
    rrect(ctx, lx - 3.1, hipY, 6.2, footY - hipY - 6.5, 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  if (look.socks) {
    const top = footY - 6.6;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = look.socks.colors[i % look.socks.colors.length];
      ctx.fillRect(lx - w / 2, top + i * 1.25, w, 1.25);
    }
    ctx.fillStyle = '#f0a050';
    ctx.fillRect(lx - w / 2, top + 5, w, 0.9);
  }
  rrect(ctx, lx - w / 2, hipY, w, footY - hipY, 1.2);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function shoeFront(ctx, look, lx, footY, outward) {
  ellipse(ctx, lx + outward * 0.5, footY - 0.6, 3.1, 1.6, look.shoes.color, OUT, 0.5);
  if (look.shoes.curly) {
    ctx.beginPath();
    ctx.arc(lx + outward * 3.6, footY - 2.1, 1.1, Math.PI * 0.5, Math.PI * 2.1, outward < 0);
    ctx.strokeStyle = look.shoes.color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- head bits
function hairBehind(ctx, look, cy, back) {
  const { style, color } = look.hair;
  if (style === 'long') {
    rrect(ctx, -5.6, cy - 2, 11.2, 9.5, 3);
    ctx.fillStyle = color;
    ctx.fill();
  } else if (style === 'wiggles' || (style === 'curly' && color === '#8b5cc7')) {
    const big = style === 'wiggles' ? 1 : 0.8;
    ctx.fillStyle = color;
    for (const [dx, dy, r] of [[-5, -1, 2.6], [5, -1, 2.6], [-5.6, 2, 2.2], [5.6, 2, 2.2], [-4.4, -4.2, 2.4], [4.4, -4.2, 2.4], [0, -5.2, 2.6]]) {
      ctx.beginPath();
      ctx.arc(dx * big, cy + dy * big, r * big, 0, TAU);
      ctx.fill();
    }
    if (back) {
      ctx.beginPath();
      ctx.arc(0, cy + 1.5, 5.4, 0, TAU);
      ctx.fill();
    }
  }
}

function hairFront(ctx, look, cy, back) {
  const { style, color } = look.hair;
  if (style === 'bald') return;
  ctx.fillStyle = color;
  if (back) {
    if (style === 'wiggles') return;
    ctx.beginPath();
    ctx.arc(0, cy - 0.3, HEAD_R + 0.4, 0, TAU);
    ctx.fill();
    if (style === 'bun') circle(ctx, 0, cy - 5.6, 2.2, color);
    if (style === 'ponytail') {
      rrect(ctx, -1.3, cy + 2, 2.6, 6, 1.3);
      ctx.fill();
    }
    return;
  }
  if (style === 'wiggles' || style === 'curly') {
    for (const [dx, dy] of [[-3.6, -3.2], [-1.2, -4.6], [1.4, -4.6], [3.7, -3.1], [0, -3.9]]) {
      ctx.beginPath();
      ctx.arc(dx, cy + dy, 1.9, 0, TAU);
      ctx.fill();
    }
    return;
  }
  ctx.beginPath();
  ctx.arc(0, cy - 0.4, HEAD_R + 0.45, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(2, cy - 3.4, -4.6, cy - 1.6);
  ctx.closePath();
  ctx.fill();
  if (style === 'long') {
    ctx.fillRect(-5.4, cy - 2, 1.6, 7);
    ctx.fillRect(3.8, cy - 2, 1.6, 7);
  } else if (style === 'bun') {
    circle(ctx, 0, cy - 5.6, 2.2, color);
  } else if (style === 'spiky') {
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * 2 - 1, cy - 4);
      ctx.lineTo(i * 2, cy - 7);
      ctx.lineTo(i * 2 + 1, cy - 4);
    }
    ctx.fill();
  }
}

function face(ctx, look, cy, t) {
  const blink = Math.sin(t * 1.3 + look.height) > 0.985;
  ctx.fillStyle = OUT;
  if (blink) {
    ctx.fillRect(-2.3, cy - 0.1, 1.3, 0.35);
    ctx.fillRect(1.0, cy - 0.1, 1.3, 0.35);
  } else {
    circle(ctx, -1.7, cy, 0.55, OUT);
    circle(ctx, 1.7, cy, 0.55, OUT);
  }
  if (look.isWiggles || look.nose) {
    circle(ctx, -3, cy + 1.7, 1, 'rgba(240,120,130,0.45)');
    circle(ctx, 3, cy + 1.7, 1, 'rgba(240,120,130,0.45)');
  }
  ctx.beginPath();
  ctx.arc(0, cy + 1.6, 1.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  if (look.nose) circle(ctx, 0, cy + 0.9, 1.25, look.nose, OUT, 0.35);
  if (look.beard) {
    ctx.beginPath();
    ctx.arc(0, cy + 2, 3.6, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.fillStyle = look.beard;
    ctx.fill();
  }
  if (look.glasses) {
    ctx.lineWidth = 0.65;
    circle(ctx, -1.8, cy, 1.6, 'rgba(220,240,255,0.35)', look.glasses.left, 0.65);
    circle(ctx, 1.8, cy, 1.6, 'rgba(220,240,255,0.35)', look.glasses.right, 0.65);
    line(ctx, -0.25, cy - 0.2, 0.25, cy - 0.2, look.glasses.left, 0.5);
  }
}

/** Shared with the HUD portrait so the hat is identical everywhere. */
export function drawHat(ctx, hat, cy, view = 'front') {
  const brimY = cy - 3.6;
  switch (hat.type) {
    case 'wiggles': {
      ellipse(ctx, 0, brimY, 7.8, 2.1, hat.color, OUT, 0.6);
      ctx.beginPath();
      ctx.moveTo(-5, brimY);
      ctx.bezierCurveTo(-6.4, brimY - 6, -6.2, brimY - 11, -1.2, brimY - 11.2);
      ctx.bezierCurveTo(4.2, brimY - 11.6, 6.4, brimY - 7, 5, brimY);
      ctx.closePath();
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = hat.color2;
      for (let k = -14; k < 14; k += 4.2) {
        ctx.beginPath();
        ctx.moveTo(k, brimY);
        ctx.lineTo(k + 2.1, brimY);
        ctx.lineTo(k + 9, brimY - 12);
        ctx.lineTo(k + 6.9, brimY - 12);
        ctx.fill();
      }
      ctx.fillRect(-7, brimY - 2.6, 14, 2.2);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-5, brimY);
      ctx.bezierCurveTo(-6.4, brimY - 6, -6.2, brimY - 11, -1.2, brimY - 11.2);
      ctx.bezierCurveTo(4.2, brimY - 11.6, 6.4, brimY - 7, 5, brimY);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // feather
      const fx = view === 'back' ? -4.2 : 4.2;
      const dir = view === 'back' ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(fx, brimY - 1.5);
      ctx.quadraticCurveTo(fx + dir * 4.5, brimY - 4, fx + dir * 4.2, brimY - 8.5);
      ctx.quadraticCurveTo(fx + dir * 1.6, brimY - 5, fx, brimY - 1.5);
      ctx.fillStyle = '#efe2bd';
      ctx.fill();
      ctx.strokeStyle = '#a89060';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      break;
    }
    case 'cap':
      ctx.beginPath();
      ctx.arc(0, cy - 1, HEAD_R + 0.3, Math.PI, TAU);
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      if (view !== 'back') ellipse(ctx, view === 'side' ? 4 : 0, cy - 1.2, view === 'side' ? 3.6 : 5.6, 1.3, shade(hat.color, -0.2));
      break;
    case 'beanie':
      ctx.beginPath();
      ctx.arc(0, cy - 0.6, HEAD_R + 0.6, Math.PI, TAU);
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.fillStyle = hat.color2;
      ctx.fillRect(-5.5, cy - 2.2, 11, 2);
      circle(ctx, 0, cy - 6.4, 1.3, hat.color2);
      break;
    case 'bowler':
      ellipse(ctx, 0, brimY + 0.8, 6.6, 1.4, hat.color, OUT, 0.5);
      ctx.beginPath();
      ctx.arc(0, brimY + 0.6, 4.4, Math.PI, TAU);
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.stroke();
      break;
    case 'sun':
      ellipse(ctx, 0, brimY + 0.6, 9, 2.2, hat.color, OUT, 0.5);
      ctx.beginPath();
      ctx.arc(0, brimY + 0.4, 4, Math.PI, TAU);
      ctx.fillStyle = shade(hat.color, -0.1);
      ctx.fill();
      ctx.fillStyle = hat.color2;
      ctx.fillRect(-4, brimY - 0.8, 8, 1.2);
      break;
    case 'beret':
      ellipse(ctx, 0.8, cy - 4.2, 5.8, 2.2, hat.color, OUT, 0.5);
      break;
    case 'pilot':
      rrect(ctx, -5.2, cy - 7.6, 10.4, 4.6, 1.2);
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.fillStyle = hat.color2;
      ctx.fillRect(-5.2, cy - 4.4, 10.4, 1);
      if (view !== 'back') ellipse(ctx, view === 'side' ? 4 : 0, cy - 3, view === 'side' ? 3 : 5, 1, '#111');
      circle(ctx, 0, cy - 6, 0.8, hat.color2);
      break;
    case 'chef':
      rrect(ctx, -4.4, cy - 9, 8.8, 6, 1);
      ctx.fillStyle = '#fff';
      ctx.fill();
      circle(ctx, -2.6, cy - 9.2, 2.6, '#fff');
      circle(ctx, 2.6, cy - 9.2, 2.6, '#fff');
      circle(ctx, 0, cy - 10.2, 2.8, '#fff');
      break;
    case 'headband':
      ctx.fillStyle = hat.color;
      ctx.fillRect(-5, cy - 3, 10, 1.6);
      break;
    default:
      break;
  }
}

function scarfFront(ctx, look, cy, off) {
  const colours = look.scarf.colors;
  const y = SHOULDER - 2.2 + off;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-5.2 + i * 1.75, y, 1.8, 2.6);
  }
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colours[(i + 1) % colours.length];
    ctx.fillRect(-4.4, y + 2.4 + i * 1.6, 2.8, 1.6);
  }
  if (colours.length >= 4) {
    ctx.strokeStyle = colours[0];
    ctx.lineWidth = 0.35;
    for (let i = 0; i < 4; i++) line(ctx, -4.2 + i * 0.8, y + 10.4, -4.2 + i * 0.8, y + 11.8, colours[i], 0.35);
  }
}

function satchelFront(ctx, off, back) {
  line(ctx, -5, SHOULDER - 0.5 + off, 4.5, -19 + off, '#8a6a42', 1);
  if (back) {
    rrect(ctx, 3.6, -21.5 + off, 5.6, 5, 1);
    ctx.fillStyle = '#c8a878';
    ctx.fill();
    return;
  }
  rrect(ctx, 2.6, -21.5 + off, 6.6, 5.6, 1);
  ctx.fillStyle = '#c8a878';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = '#b39060';
  ctx.fillRect(2.6, -21.5 + off, 6.6, 2.4);
  ctx.fillStyle = '#d0607a';
  ctx.fillRect(6.4, -18.6 + off, 1.8, 1.6);
  // rolled map poking out
  ctx.fillStyle = '#efe2c0';
  ctx.fillRect(3.4, -24.3 + off, 1.6, 3);
  ctx.fillRect(5.2, -23.6 + off, 1.4, 2.3);
}

// ---------------------------------------------------------------- held items
function heldItem(ctx, look, hx, hy, pose, view) {
  const c = look.carry;
  if (!c) return;
  switch (c.type) {
    case 'coffee':
      rrect(ctx, hx - 1.1, hy - 3.4, 2.4, 3.2, 0.4);
      ctx.fillStyle = '#f4efe6';
      ctx.fill();
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(hx - 1.1, hy - 2.4, 2.4, 1);
      break;
    case 'phone':
      if (pose.action !== 'phone') {
        ctx.fillStyle = '#222';
        ctx.fillRect(hx - 0.8, hy - 2.6, 1.6, 2.6);
      }
      break;
    case 'umbrella':
      line(ctx, hx, hy, hx + 0.6, hy + 12, '#333', 1.3);
      line(ctx, hx + 0.6, hy + 4, hx + 0.6, hy + 12, c.color, 2.4);
      break;
    case 'balloon': {
      const by = -58 + Math.sin(pose.t * 1.6 + look.height) * 1.2;
      const bx = hx + 3 + Math.sin(pose.t * 1.1) * 1;
      line(ctx, hx, hy, bx, by + 5, '#666', 0.3);
      ellipse(ctx, bx, by, 4, 4.8, c.color, OUT, 0.4);
      circle(ctx, bx - 1.4, by - 1.6, 0.9, 'rgba(255,255,255,0.6)');
      break;
    }
    case 'cane':
      line(ctx, hx, hy, hx + 1, 0, '#3b3b3b', 1.1);
      break;
    case 'wigglesStick': {
      ctx.beginPath();
      ctx.moveTo(hx + 0.4, hy - 3);
      ctx.quadraticCurveTo(hx + 2.6, hy - 4.4, hx + 2, hy - 1.6);
      ctx.lineTo(hx + 1.2, hy + 4);
      ctx.lineTo(hx + 2, hy + 8);
      ctx.lineTo(hx + 1.3, hy + 12);
      ctx.lineTo(hx + 2.1, -0.2);
      ctx.strokeStyle = '#5a3a1e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      line(ctx, hx + 2.2, hy - 1.8, hx + 3.4, hy + 0.6, '#444', 0.3);
      const glow = 0.55 + Math.sin(pose.t * 5) * 0.15;
      rrect(ctx, hx + 2.6, hy + 0.6, 1.8, 2.4, 0.4);
      ctx.fillStyle = `rgba(255,205,80,${glow + 0.3})`;
      ctx.fill();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      break;
    }
    case 'camera':
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(view === 'side' ? 3 : -1.8, -25.4, 3.6, 2.4);
      circle(ctx, view === 'side' ? 4.8 : 0, -24.2, 0.8, '#7fa8c9');
      break;
    case 'icecream':
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy - 1.5);
      ctx.lineTo(hx + 1, hy - 1.5);
      ctx.lineTo(hx, hy + 1.6);
      ctx.fillStyle = '#d9a25f';
      ctx.fill();
      circle(ctx, hx, hy - 2.2, 1.3, c.color);
      break;
    case 'mop':
      line(ctx, hx, hy - 8, hx + 3, 0, '#c9b27a', 1);
      ellipse(ctx, hx + 3.5, -0.4, 3.4, 1.1, '#e8e2c8', '#888', 0.3);
      break;
    case 'newspaper':
      if (pose.action !== 'read') {
        ctx.fillStyle = '#efefe6';
        ctx.fillRect(hx - 0.6, hy - 1, 1.6, 4);
      }
      break;
    case 'bag':
      rrect(ctx, hx - 2.4, hy, 4.8, 4.4, 1);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.4;
      ctx.stroke();
      break;
    default:
      break;
  }
}

function suitcase(ctx, look, x, handY) {
  const c = look.carry.color;
  line(ctx, x, handY, x, -11, '#555', 0.8);
  rrect(ctx, x - 3.2, -11.5, 6.4, 10.5, 1.2);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = shade(c, -0.25);
  ctx.fillRect(x - 3.2, -7, 6.4, 0.8);
  circle(ctx, x - 2, -0.6, 0.8, '#222');
  circle(ctx, x + 2, -0.6, 0.8, '#222');
}

function guitar(ctx, off) {
  ctx.save();
  ctx.translate(0, off);
  ctx.rotate(-0.5);
  line(ctx, 0, -22, 0, -36, '#5a3a1e', 1.4);
  ellipse(ctx, 0, -19, 3.6, 4.4, '#c47a2c', OUT, 0.5);
  circle(ctx, 0, -19.5, 1, '#3a2410');
  ctx.restore();
}

// ---------------------------------------------------------------- views
function armTargets(look, pose, m, w, back) {
  const sy = SHOULDER + m.off;
  const sxL = -w / 2 - 0.6;
  const sxR = w / 2 + 0.6;
  const down = (sx, angle) => ({ x: sx + Math.sin(angle) * 11.5, y: sy + Math.cos(angle) * 11.5 });
  let L = down(sxL, -0.12 - m.swing * 0.18 * m.amp);
  let R = down(sxR, 0.12 + m.swing * 0.18 * m.amp);
  const action = pose.action;
  const flipX = back ? -1 : 1;
  if (pose.mode === 'sit') {
    L = { x: sxL + 2, y: sy + 9 };
    R = { x: sxR - 2, y: sy + 9 };
  }
  if (look.carry?.type === 'suitcase' && !back) R = { x: sxR + 2.5, y: -18 + m.off };
  if (look.carry?.type === 'wigglesStick' || look.carry?.type === 'cane') R = { x: sxR + 2.2, y: -19 + m.off };
  if (look.carry?.type === 'balloon') L = { x: sxL - 3, y: -24 + m.off };
  switch (action) {
    case 'phone':
      R = { x: (w / 2 - 1.5) * flipX, y: HEAD_Y + 1 + m.off };
      break;
    case 'wave':
      R = { x: sxR + 4 + Math.sin(pose.t * 9) * 1.6, y: sy - 10 };
      break;
    case 'reach':
      R = { x: sxR + 1, y: sy + 3 + Math.sin(pose.t * 3) * 1.5 };
      break;
    case 'read':
    case 'piano':
      L = { x: -2.6, y: -23 + m.off + (action === 'piano' ? Math.sin(pose.t * 8) * 0.6 : 0) };
      R = { x: 2.6, y: -23 + m.off + (action === 'piano' ? Math.cos(pose.t * 7) * 0.6 : 0) };
      break;
    case 'clap': {
      const k = Math.abs(Math.sin(pose.t * 7)) * 1.6;
      L = { x: -0.6 - k, y: -25 + m.off };
      R = { x: 0.6 + k, y: -25 + m.off };
      break;
    }
    case 'guitar':
      L = { x: -6, y: -30 + m.off };
      R = { x: 1.5, y: -20 + m.off + Math.sin(pose.t * 10) * 0.8 };
      break;
    case 'clean':
      R = { x: sxR + 1 + Math.sin(pose.t * 3) * 2, y: -20 + m.off };
      break;
    default:
      break;
  }
  return { sy, sxL, sxR, L, R };
}

function drawFrontBack(ctx, look, pose, back) {
  const m = motion(pose);
  const w = 12.2 * look.build;
  const view = back ? 'back' : 'front';
  ellipse(ctx, 0, 0, 8, 2.4, 'rgba(0,0,0,0.18)');

  const a = armTargets(look, pose, m, w, back);
  if (!back && look.carry?.type === 'suitcase') suitcase(ctx, look, a.R.x + 0.6, a.R.y);
  if (back && look.carry?.type === 'suitcase') suitcase(ctx, look, -a.R.x - 0.6, a.R.y);

  // legs
  const hipY = HIP + m.off;
  if (m.sit) {
    for (const lx of [-2.6, 2.6]) {
      legFront(ctx, look, lx, -12, 0);
      shoeFront(ctx, look, lx, 0, Math.sign(lx));
    }
  } else {
    const liftL = m.moving ? Math.max(0, m.swing) * 2.4 * m.amp : 0;
    const liftR = m.moving ? Math.max(0, -m.swing) * 2.4 * m.amp : 0;
    legFront(ctx, look, -2.6, hipY, -liftL);
    legFront(ctx, look, 2.6, hipY, -liftR);
    shoeFront(ctx, look, -2.6, -liftL, -1);
    shoeFront(ctx, look, 2.6, -liftR, 1);
  }
  if (look.bottom.type === 'skirt') {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 0.6, hipY - 1.5);
    ctx.lineTo(w / 2 - 0.6, hipY - 1.5);
    ctx.lineTo(w / 2 + 1.4, hipY + 7.5);
    ctx.lineTo(-w / 2 - 1.4, hipY + 7.5);
    ctx.closePath();
    ctx.fillStyle = look.bottom.color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  const torsoTop = SHOULDER - 1.2 + m.off;
  const torsoBottom = (look.top.type === 'coat' ? -12.5 : -16) + m.off;
  if (back) {
    arm(ctx, look, a.sxL, a.sy, a.L.x, a.L.y, 'right');
    arm(ctx, look, a.sxR, a.sy, a.R.x, a.R.y, 'left');
  }
  torso(ctx, look, -w / 2, torsoTop, w, torsoBottom - torsoTop, view);
  if (look.satchel) satchelFront(ctx, m.off, back);
  if (back && look.back) {
    rrect(ctx, -4.4, torsoTop + 1.6, 8.8, 10, 2);
    ctx.fillStyle = look.back.color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  } else if (!back && look.back) {
    line(ctx, -3.6, torsoTop + 0.6, -3.6, torsoTop + 7, shade(look.back.color, -0.2), 1.1);
    line(ctx, 3.6, torsoTop + 0.6, 3.6, torsoTop + 7, shade(look.back.color, -0.2), 1.1);
  }
  if (look.scarf && !back) scarfFront(ctx, look, HEAD_Y, m.off);
  if (look.scarf && back) {
    const colours = look.scarf.colors;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-5.2 + i * 1.75, SHOULDER - 2.2 + m.off, 1.8, 2.4);
    }
  }
  if (pose.action === 'guitar' || look.carry?.type === 'guitar') guitar(ctx, m.off);
  if (!back) {
    arm(ctx, look, a.sxL, a.sy, a.L.x, a.L.y, 'left');
    arm(ctx, look, a.sxR, a.sy, a.R.x, a.R.y, 'right');
  }

  // head
  const cy = HEAD_Y + m.off;
  hairBehind(ctx, look, cy, back);
  circle(ctx, 0, cy, HEAD_R, look.skin, OUT, 0.7);
  if (!back) face(ctx, look, cy, pose.t);
  hairFront(ctx, look, cy, back);
  if (look.hat) drawHat(ctx, look.hat, cy, view);

  if (pose.action === 'read') {
    ctx.fillStyle = '#f2f0e6';
    ctx.fillRect(-6, -29 + m.off, 12, 8);
    ctx.fillStyle = '#9a9a9a';
    for (let i = 0; i < 4; i++) ctx.fillRect(-5, -27.6 + i * 1.7 + m.off, 10, 0.5);
  }
  if (pose.action === 'phone' && !back) {
    ctx.fillStyle = '#222';
    ctx.fillRect(a.R.x - 0.8, a.R.y - 2, 1.6, 3);
  }
  if (look.carry && look.carry.type !== 'suitcase') {
    const hand = ['balloon'].includes(look.carry.type) ? a.L : a.R;
    if (!(back && look.carry.type === 'camera')) heldItem(ctx, look, hand.x, hand.y, pose, view);
  }
}

function drawSide(ctx, look, pose) {
  const m = motion(pose);
  const w = 8.6 * look.build;
  ellipse(ctx, 0, 0, 7, 2.2, 'rgba(0,0,0,0.18)');
  const sy = SHOULDER + m.off;
  const hipY = HIP + m.off;
  const legAngle = m.swing * 0.5 * m.amp;
  const armAngle = m.swing * 0.55 * m.amp;
  const pulling = look.carry?.type === 'suitcase';

  if (pulling) suitcase(ctx, look, -11, -19 + m.off);
  if (look.back) {
    rrect(ctx, -w / 2 - 3.6, sy + 0.6, 4.4, 10, 1.6);
    ctx.fillStyle = look.back.color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // far arm
  const farHand = m.sit ? { x: 5, y: sy + 9 } : { x: Math.sin(-armAngle) * 11.5, y: sy + Math.cos(armAngle) * 11.5 };
  arm(ctx, look, 0, sy, farHand.x, farHand.y, 'left', true);

  // legs
  const legs = m.sit ? [[0, true], [0, false]] : [[-legAngle, true], [legAngle, false]];
  for (const [angle, far] of legs) {
    ctx.save();
    if (m.sit) {
      ctx.translate(0, -12);
      const colour = legBottomColour(look);
      line(ctx, 0, 0, 7, 0, OUT, 5.2);
      line(ctx, 0, 0, 7, 0, far ? shade(colour, -0.2) : colour, 4.2);
      line(ctx, 7, 0, 7, 11, OUT, 5);
      line(ctx, 7, 0, 7, 11, far ? shade(look.skin, -0.1) : look.bottom.type === 'trousers' ? colour : look.skin, 4);
      ellipse(ctx, 8.6, 11.3, 3, 1.4, look.shoes.color, OUT, 0.5);
      ctx.restore();
      continue;
    }
    ctx.translate(0, hipY);
    ctx.rotate(angle);
    const len = -hipY;
    const b = look.bottom;
    const legColour = b.type === 'trousers' ? b.color : look.skin;
    rrect(ctx, -2.1, 0, 4.2, len, 1.2);
    ctx.fillStyle = far ? shade(legColour, -0.2) : legColour;
    ctx.fill();
    if (b.type === 'shorts') {
      ctx.fillStyle = far ? shade(b.color, -0.2) : b.color;
      ctx.fillRect(-2.1, 0, 4.2, len * 0.45);
    }
    if (b.type === 'knickers') {
      rrect(ctx, -3, 0, 6, len - 6.5, 2);
      ctx.fillStyle = far ? shade(b.color, -0.2) : b.color;
      ctx.fill();
    }
    if (look.socks) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = look.socks.colors[i % look.socks.colors.length];
        ctx.fillRect(-2.1, len - 6.6 + i * 1.25, 4.2, 1.25);
      }
    }
    rrect(ctx, -2.1, 0, 4.2, len, 1.2);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ellipse(ctx, 1.4, len - 0.6, 3.4, 1.5, far ? shade(look.shoes.color, -0.2) : look.shoes.color, OUT, 0.5);
    if (look.shoes.curly) {
      ctx.beginPath();
      ctx.arc(4.6, len - 2.1, 1.1, Math.PI * 0.5, Math.PI * 2.1, true);
      ctx.strokeStyle = look.shoes.color;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  }
  if (look.bottom.type === 'skirt') {
    ctx.beginPath();
    ctx.moveTo(-w / 2, hipY - 1.5);
    ctx.lineTo(w / 2, hipY - 1.5);
    ctx.lineTo(w / 2 + 2, hipY + 7.5);
    ctx.lineTo(-w / 2 - 2, hipY + 7.5);
    ctx.closePath();
    ctx.fillStyle = look.bottom.color;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  const torsoTop = SHOULDER - 1.2 + m.off;
  const torsoBottom = (look.top.type === 'coat' ? -12.5 : -16) + m.off;
  torso(ctx, look, -w / 2, torsoTop, w, torsoBottom - torsoTop, 'side');
  if (look.satchel) {
    rrect(ctx, 1.2, -21.4 + m.off, 5, 5.2, 1);
    ctx.fillStyle = '#c8a878';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = '#efe2c0';
    ctx.fillRect(2, -24 + m.off, 1.5, 2.8);
  }
  if (look.scarf) {
    const colours = look.scarf.colors;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colours[i % colours.length];
      ctx.fillRect(-w / 2 + i * (w / 4), SHOULDER - 2.2 + m.off, w / 4 + 0.2, 2.6);
    }
    const flutter = m.moving ? Math.sin(pose.phase * 2) * 1.2 : 0;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colours[(i + 2) % colours.length];
      ctx.fillRect(-w / 2 - 1.6 - i * 0.6 + flutter * (i / 4), SHOULDER + 0.2 + i * 1.6 + m.off, 2.4, 1.6);
    }
  }

  // near arm + hand items
  let nearHand = m.sit ? { x: 6, y: sy + 9 } : { x: Math.sin(armAngle) * 11.5, y: sy + Math.cos(armAngle) * 11.5 };
  if (pulling) nearHand = { x: -6, y: -19 + m.off };
  if (look.carry?.type === 'wigglesStick' || look.carry?.type === 'cane') nearHand = { x: 4.5 + (m.moving ? Math.sin(pose.phase) * 1.5 : 0), y: -19 + m.off };
  if (pose.action === 'phone') nearHand = { x: 2.4, y: HEAD_Y + 1.5 + m.off };
  if (pose.action === 'wave') nearHand = { x: 4 + Math.sin(pose.t * 9) * 1.6, y: sy - 10 };
  if (pose.action === 'read' || pose.action === 'reach' || pose.action === 'piano' || pose.action === 'clap') nearHand = { x: 7, y: -25 + m.off };
  if (pose.action === 'guitar' || look.carry?.type === 'guitar') guitar(ctx, m.off);
  arm(ctx, look, 0, sy, nearHand.x, nearHand.y, 'right');

  // head (facing +x)
  const cy = HEAD_Y + m.off;
  const { style, color } = look.hair;
  if (style === 'wiggles' || (style === 'curly' && color === '#8b5cc7')) {
    ctx.fillStyle = color;
    for (const [dx, dy, r] of [[-4.2, -1, 2.8], [-4.8, 2, 2.4], [-2, -4.4, 2.6], [1.8, -4.8, 2.2], [-1.6, 3.4, 2]]) {
      ctx.beginPath();
      ctx.arc(dx, cy + dy, r, 0, TAU);
      ctx.fill();
    }
  } else if (style === 'long' || style === 'ponytail') {
    rrect(ctx, -5.6, cy - 2, 5, style === 'long' ? 9 : 4, 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (style === 'ponytail') circle(ctx, -6, cy + 2, 1.8, color);
  }
  circle(ctx, 0.6, cy, HEAD_R, look.skin, OUT, 0.7);
  if (style !== 'bald' && style !== 'wiggles') {
    ctx.beginPath();
    ctx.arc(0.6, cy - 0.3, HEAD_R + 0.4, Math.PI * 0.55, Math.PI * 1.85);
    ctx.lineTo(0.6, cy - 1);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (style === 'bun') circle(ctx, -2.4, cy - 5, 2.1, color);
  }
  circle(ctx, 3, cy - 0.3, 0.55, OUT);
  line(ctx, 2.6, cy + 2.2, 3.8, cy + 2, OUT, 0.45);
  if (look.nose) circle(ctx, 5.4, cy + 0.7, 1.3, look.nose, OUT, 0.35);
  else circle(ctx, 5.3, cy + 0.6, 0.7, shade(look.skin, -0.08));
  if (look.isWiggles || look.nose) circle(ctx, 2.2, cy + 1.8, 1, 'rgba(240,120,130,0.45)');
  if (look.beard) {
    ctx.beginPath();
    ctx.arc(1.5, cy + 2.2, 3.4, 0, Math.PI);
    ctx.fillStyle = look.beard;
    ctx.fill();
  }
  if (look.glasses) {
    circle(ctx, 3.2, cy - 0.2, 1.6, 'rgba(220,240,255,0.35)', look.glasses.right, 0.65);
    line(ctx, 1.6, cy - 0.4, -2.5, cy - 0.8, look.glasses.left, 0.45);
  }
  if (look.hat) drawHat(ctx, look.hat, cy, 'side');
  if (look.carry && !pulling) heldItem(ctx, look, nearHand.x, nearHand.y, pose, 'side');
  if (pose.action === 'phone') {
    ctx.fillStyle = '#222';
    ctx.fillRect(nearHand.x - 0.6, nearHand.y - 2, 1.4, 3);
  }
  if (pose.action === 'read') {
    ctx.fillStyle = '#f2f0e6';
    ctx.fillRect(6, -30 + m.off, 2, 9);
  }
}

/** Large, animated portrait used in menus and the "who to find" card. */
export function drawPortrait(ctx, look, width, height, t, { dir = 'down', action = 'wave' } = {}) {
  ctx.clearRect(0, 0, width, height);
  const scale = (height * 0.78) / 52;
  ctx.save();
  ctx.translate(width / 2, height * 0.94);
  ctx.scale(scale, scale);
  drawPerson(ctx, look, { dir, mode: 'stand', phase: 0, t, action, seed: 0 }, 0, 0, 'full');
  ctx.restore();
}
