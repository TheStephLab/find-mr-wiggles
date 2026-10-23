/**
 * Character renderer. One figure model draws everyone, Mr. Wiggles
 * included, so he is always dressed exactly the same.
 *
 * Figures use realistic proportions (about 6.5 heads tall for adults, bigger
 * heads for children), jointed limbs with a proper walking gait, and shaded
 * clothing, faces and hair. Drawing a figure is fairly expensive, so the game
 * caches animation frames as sprites (see sprite-cache.js). `spriteFrame()`
 * quantises a pose into a small set of cacheable frames.
 */
import { TAU, INK, shade, rigOf, outfitOf, sleeveOf, gaitOf, limb, limbBands, limbDots, ellipse, rrect, stitches } from './figure/core.js';
import { drawHeadFront, drawHeadSide } from './figure/head.js';
import { drawTorso, drawPelvis, drawSkirt, drawScarf, drawSatchel, drawBackpack, drawCameraStrap } from './figure/clothes.js';
import { drawHeld, drawSuitcase, drawGuitar, drawMopSweep } from './figure/items.js';

export const WALK_FRAMES = 8;
export const ACTION_FRAMES = 4;
const ACTION_RATE = { wave: 1.6, clap: 2.2, piano: 1.4, guitar: 1.8, clean: 0.7 };

/** Entry point. `lod` is 'full' or 'simple'; `k` scales the whole figure. */
export function drawPerson(ctx, look, pose, x, y, lod = 'full', k = 1) {
  const s = (look.height / 40) * k;
  const p = resolvePose(pose);
  const flip = p.dir === 'left' ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * flip, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (lod === 'simple') drawSimple(ctx, look, p);
  else if (p.dir === 'left' || p.dir === 'right') drawSide(ctx, look, p);
  else drawFront(ctx, look, p, p.dir === 'up');
  ctx.restore();
}

function resolvePose(pose) {
  const mode = pose.mode === 'ride' ? 'stand' : pose.mode ?? 'stand';
  const rate = ACTION_RATE[pose.action] ?? 0;
  const anim = pose.anim ?? (rate ? (((pose.t ?? 0) * rate) % 1 + 1) % 1 : 0);
  return { dir: pose.dir ?? 'down', mode, phase: pose.phase ?? 0, action: pose.action ?? null, anim };
}

/**
 * Quantise a live pose into a cacheable frame. Left-facing frames reuse the
 * right-facing sprite, mirrored. The carried item is part of the key because
 * it can change (checking in a suitcase, collecting one from the carousel).
 */
export function spriteFrame(look, pose) {
  const mode = pose.mode === 'ride' ? 'stand' : pose.mode ?? 'stand';
  const moving = mode === 'walk' || mode === 'jog';
  const cyc = moving ? Math.floor((((pose.phase / TAU) % 1) + 1) % 1 * WALK_FRAMES) % WALK_FRAMES : 0;
  const rate = ACTION_RATE[pose.action] ?? 0;
  const af = rate ? Math.floor((pose.t ?? 0) * rate * ACTION_FRAMES) % ACTION_FRAMES : 0;
  const dir = pose.dir === 'left' ? 'right' : pose.dir;
  const c = look.carry;
  return {
    key: `${dir}|${mode}|${cyc}|${pose.action ?? ''}|${af}|${c ? c.type + (c.color ?? '') : ''}`,
    mirror: pose.dir === 'left',
    pose: { dir, mode, phase: (cyc / WALK_FRAMES) * TAU, action: pose.action ?? null, anim: af / ACTION_FRAMES },
  };
}

/** Generous drawing bounds (world units, relative to the feet) for sprite sizing. */
export function spriteBounds(look) {
  const f = look.height / 40;
  const t = look.carry?.type;
  let L = -13;
  let Rt = 13;
  let T = -55;
  if (t === 'balloon') {
    T = -66;
    Rt = 16;
  }
  if (t === 'suitcase' || t === 'guitar' || t === 'mop' || t === 'umbrella') {
    L = -17;
    Rt = 17;
  }
  if (look.hat?.type === 'chef' || look.hat?.type === 'wiggles') T = Math.min(T, -58);
  return { L: L * f, R: Rt * f, T: T * f, B: 3 * f };
}

// ------------------------------------------------------------------ shared parts
const sockColours = (look) => [...look.socks.colors, '#f2cd4b', '#9cc75a', '#e05a4f'];

function drawLeg(ctx, look, R, hip, knee, ankle, dim) {
  const b = look.bottom;
  const trousers = b.type === 'trousers';
  const skin = look.skin;
  limb(ctx, hip[0], hip[1], R.thighR, knee[0], knee[1], R.kneeR, trousers ? b.color : skin, dim);
  limb(ctx, knee[0], knee[1], R.kneeR, ankle[0], ankle[1], R.ankleR, trousers ? b.color : look.socks ? look.socks.colors[0] : skin, dim);
  if (look.socks) limbBands(ctx, knee[0], knee[1], R.kneeR, ankle[0], ankle[1], R.ankleR, sockColours(look), 0.8, { fill: true });
  if (b.type === 'shorts') {
    const mx = hip[0] + (knee[0] - hip[0]) * 0.62;
    const my = hip[1] + (knee[1] - hip[1]) * 0.62;
    limb(ctx, hip[0], hip[1], R.thighR * 1.12, mx, my, R.thighR * 1.0, b.color, dim);
  } else if (b.type === 'knickers') {
    limb(ctx, hip[0], hip[1], R.thighR * 1.18, knee[0], knee[1] + 0.9, R.kneeR * 1.45, b.color, dim);
    ellipse(ctx, knee[0], knee[1] + 1.2, R.kneeR * 1.25, 0.45, 0, shade(b.color, -0.2), null);
    if (look.isWiggles) {
      const px = hip[0] + (knee[0] - hip[0]) * 0.55;
      const py = hip[1] + (knee[1] - hip[1]) * 0.55;
      ctx.fillStyle = '#9a6bc8';
      ctx.fillRect(px - 0.7, py - 0.6, 1.4, 1.3);
      stitches(ctx, px - 0.7, py - 0.6, 1.4, 1.3);
    }
  }
}

function shoeFront(ctx, look, x, y, back, dim) {
  const c = dim ? shade(look.shoes.color, -0.2) : look.shoes.color;
  rrect(ctx, x - 1.05, y - 0.55, 2.1, 1.8, 0.75);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.22;
  ctx.stroke();
  ctx.fillStyle = shade(c, -0.35);
  ctx.fillRect(x - 1.05, y + 0.95, 2.1, 0.3);
  if (!back) ellipse(ctx, x - 0.25, y + 0.15, 0.45, 0.25, 0, 'rgba(255,255,255,0.22)', null);
  if (look.shoes.curly && !back) {
    ctx.beginPath();
    ctx.arc(x, y - 0.1, 0.45, Math.PI * 0.2, Math.PI * 1.9);
    ctx.strokeStyle = shade(c, -0.25);
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }
}

function shoeSide(ctx, look, x, y, angle, dim) {
  const c = dim ? shade(look.shoes.color, -0.2) : look.shoes.color;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.7);
  ctx.lineTo(0.6, -0.65);
  ctx.quadraticCurveTo(2.3, -0.2, 2.7, 0.85);
  ctx.lineTo(2.7, 1.25);
  ctx.lineTo(-1.0, 1.25);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.22;
  ctx.stroke();
  ctx.fillStyle = shade(c, -0.35);
  ctx.fillRect(-1.0, 0.95, 3.7, 0.3);
  if (look.shoes.curly) {
    ctx.beginPath();
    ctx.moveTo(2.6, 0.7);
    ctx.quadraticCurveTo(3.6, 0.2, 3.3, -0.5);
    ctx.arc(2.95, -0.5, 0.35, 0, Math.PI * 1.3, true);
    ctx.strokeStyle = c;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }
  ctx.restore();
}

function drawArm(ctx, look, R, o, arm, sleeve, dim) {
  const { S, E, H } = arm;
  const skin = look.skin;
  if (o.shortSleeves) {
    limb(ctx, S[0], S[1], R.armR, E[0], E[1], R.elbowR, skin, dim);
    limb(ctx, E[0], E[1], R.elbowR, H[0], H[1], R.wristR, skin, dim);
    const mx = S[0] + (E[0] - S[0]) * 0.55;
    const my = S[1] + (E[1] - S[1]) * 0.55;
    limb(ctx, S[0], S[1], R.armR * 1.18, mx, my, R.armR * 1.1, sleeve.c, dim);
    if (!dim && sleeve.pat === 'stripes') limbBands(ctx, S[0], S[1], R.armR * 1.18, mx, my, R.armR * 1.1, [sleeve.c2], 1.4);
  } else {
    limb(ctx, S[0], S[1], R.armR * 1.08, E[0], E[1], R.elbowR * 1.05, sleeve.c, dim);
    limb(ctx, E[0], E[1], R.elbowR * 1.05, H[0], H[1], R.wristR * 1.12, sleeve.c, dim);
    if (!dim && sleeve.pat === 'stripes') {
      limbBands(ctx, S[0], S[1], R.armR * 1.08, E[0], E[1], R.elbowR * 1.05, [sleeve.c2], 1.3);
      limbBands(ctx, E[0], E[1], R.elbowR * 1.05, H[0], H[1], R.wristR * 1.12, [sleeve.c2], 1.3);
    } else if (!dim && sleeve.pat === 'dots') {
      limbDots(ctx, S[0], S[1], R.armR * 1.08, E[0], E[1], R.elbowR * 1.05, sleeve.c2);
      limbDots(ctx, E[0], E[1], R.elbowR * 1.05, H[0], H[1], R.wristR * 1.12, sleeve.c2);
    }
    const cx = E[0] + (H[0] - E[0]) * 0.9;
    const cy = E[1] + (H[1] - E[1]) * 0.9;
    ellipse(ctx, cx, cy, R.wristR * 1.15, R.wristR * 0.7, Math.atan2(H[1] - E[1], H[0] - E[0]) + Math.PI / 2, shade(sleeve.c, -0.18), null);
  }
  return hand(ctx, skin, E, H, dim);
}

function hand(ctx, skin, E, H, dim) {
  const a = Math.atan2(H[1] - E[1], H[0] - E[0]);
  const cx = H[0] + Math.cos(a) * 0.8;
  const cy = H[1] + Math.sin(a) * 0.8;
  const c = dim ? shade(skin, -0.2) : skin;
  ellipse(ctx, cx, cy, 1.0, 0.66, a, c, INK, 0.2);
  ellipse(ctx, cx + Math.cos(a + 1.2) * 0.55, cy + Math.sin(a + 1.2) * 0.55, 0.45, 0.25, a - 0.6, c, INK, 0.15);
  return { x: cx, y: cy };
}

function neck(ctx, look, R, cx) {
  limb(ctx, cx, R.chin - 0.8, R.neckR, cx * 0.5, R.shoulderY - 0.3, R.neckR * 1.08, look.skin);
  ellipse(ctx, cx, R.chin + 0.1, R.neckR * 1.05, 0.45, 0, 'rgba(20,10,30,0.2)', null);
}

// ------------------------------------------------------------------ arm poses
function armPoses(look, R, g, p, view, sit) {
  const side = view === 'side';
  const cs = view === 'back' ? -1 : 1;
  const t = p.anim;
  const UA = R.upperArm;
  const sY = R.shoulderY + 0.9;
  const out = {};
  for (const [i, key] of [[0, 'L'], [1, 'R']]) {
    const a = g.arms[i];
    if (side) {
      const S = [-0.2, sY];
      const E = [S[0] + Math.sin(a.sa) * UA, S[1] + Math.cos(a.sa) * UA];
      out[key] = { S, E, H: [E[0] + Math.sin(a.fa) * R.foreArm, E[1] + Math.cos(a.fa) * R.foreArm] };
    } else {
      const sx = key === 'L' ? cs : -cs;
      const S = [sx * (R.shW - 0.9), sY];
      const E = [S[0] + sx * 0.5, S[1] + UA * Math.cos(a.sa)];
      out[key] = { S, E, H: [E[0] + sx * 0.1 - sx * Math.max(0, Math.sin(a.fa)) * 1.4, E[1] + R.foreArm * Math.cos(a.fa)] };
    }
  }
  const set = (key, E, H) => {
    out[key].E = E;
    out[key].H = H;
  };
  const sw = Math.sin(t * TAU);
  const both = (fn) => ['L', 'R'].forEach((k) => fn(k, side ? 1 : k === 'L' ? cs : -cs));
  if (sit) both((k, sx) => (side ? set(k, [1.6, sY + UA * 0.85], [3.4, R.hipJ + 0.2]) : set(k, [sx * (R.shW - 0.2), sY + UA * 0.95], [sx * R.legX * 1.25, R.hipJ + 0.8])));
  const carry = look.carry?.type;
  if (carry === 'wigglesStick' || carry === 'cane') {
    const swing = g.moving ? g.arms[0].sa * 1.5 : 0;
    if (side) set('L', [1.4 + swing, sY + UA * 0.92], [3.4 + swing, R.waistY + 3]);
    else set('L', [cs * (R.shW + 0.9), sY + UA * 0.92], [cs * (R.shW + 2.0), R.waistY + 3.2]);
  } else if (carry === 'suitcase') {
    if (side) set('L', [-1.8, sY + UA * 0.95], [-4.0, R.crotchY + 0.2]);
    else set('L', [cs * (R.shW + 0.7), sY + UA], [cs * (R.shW + 1.5), R.crotchY + 0.6]);
  } else if (carry === 'balloon') {
    if (side) set('R', [1.3, sY + UA * 0.85], [3.0, R.waistY - 0.6]);
    else set('R', [-cs * (R.shW + 0.9), sY + UA * 0.85], [-cs * (R.shW + 1.7), R.waistY + 0.4]);
  } else if (carry === 'coffee' || carry === 'icecream') {
    const hy = carry === 'icecream' ? sY + 4.4 : R.waistY - 0.6;
    if (side) set('L', [1.0, sY + UA * 0.95], [3.4, hy]);
    else set('L', [cs * (R.shW + 0.5), sY + UA * 0.95], [cs * (R.shW - 0.6), hy]);
  }
  switch (p.action) {
    case 'phone':
      if (side) set('L', [1.4, sY + 4.2], [R.headW * 0.35, R.top + R.headH * 0.62]);
      else set('L', [cs * R.shW * 0.78, sY + 4.2], [cs * R.headW * 0.4, R.top + R.headH * 0.62]);
      break;
    case 'wave':
      if (side) set('L', [2.2, sY - 1.5], [3.2 + sw * 1.2, sY - R.foreArm - 1.2]);
      else set('L', [cs * (R.shW + 2.4), sY - 1.2], [cs * (R.shW + 3.2) + sw * 1.3, sY - R.foreArm - 1.5]);
      break;
    case 'reach':
      if (side) set('L', [2.6, sY + 3.8], [7.2, sY + 3.4]);
      else if (view === 'back') set('L', [cs * (R.shW + 0.4), sY + 3.2], [cs * R.shW * 0.6, sY + 2.4]);
      else set('L', [cs * (R.shW + 0.4), sY + 3.5], [cs * R.shW * 0.55, sY + 5.2]);
      break;
    case 'read':
    case 'piano':
      both((k, sx) => {
        const osc = p.action === 'piano' ? Math.sin(t * TAU + (k === 'L' ? 0 : 2)) * 0.4 : 0;
        if (side) set(k, [1.8, sY + 4.8], [5.8 + osc, p.action === 'read' ? R.waistY - 2.4 : sY + 6]);
        else set(k, [sx * (R.shW + 0.5), sY + 4.4], [sx * 2.4 + osc, p.action === 'read' ? R.waistY - 2.2 : sY + 5.6]);
      });
      break;
    case 'clap': {
      const gap = Math.abs(Math.sin(t * Math.PI)) * 1.3;
      both((k, sx) => (side ? set(k, [1.6, sY + 4.5], [4.6 + (k === 'L' ? gap : 0), sY + 5]) : set(k, [sx * (R.shW + 0.5), sY + 4.2], [sx * (0.55 + gap), sY + 5.2])));
      break;
    }
    case 'guitar':
      if (side) {
        set('R', [3.6, sY + 3], [6.8, sY + 1.8]);
        set('L', [1.2, sY + 4.6], [2.6, R.waistY + 0.4 + sw * 0.6]);
      } else {
        set('R', [-cs * (R.shW + 1.6), sY + 3], [-cs * (R.shW + 3.6), sY + 1.2]);
        set('L', [cs * (R.shW + 0.3), sY + 4.6], [cs * 1.2, R.waistY + 0.6 + sw * 0.7]);
      }
      break;
    case 'clean':
      if (side) {
        set('L', [1.8, sY + 4.2], [4.4, R.waistY - 0.5]);
        set('R', [1.2, sY + 3.8], [3.0, sY + 3.2]);
      } else {
        set('L', [cs * (R.shW + 0.4), sY + 4], [cs * 2.2, R.waistY - 0.5]);
        set('R', [-cs * (R.shW + 0.2), sY + 3.6], [cs * 0.6, sY + 4.2]);
      }
      break;
    default:
      break;
  }
  return out;
}

// ------------------------------------------------------------------ front & back views
function drawFront(ctx, look, p, back) {
  const R = rigOf(look);
  const o = outfitOf(look);
  const g = gaitOf(R, p);
  const sit = p.mode === 'sit';
  const cs = back ? -1 : 1;
  const view = back ? 'back' : 'front';
  const dy = sit ? (-12 * 40) / look.height - R.hipJ : g.dy;
  ellipse(ctx, 0, 0, 7 * R.b, 2.1, 0, 'rgba(0,0,0,0.17)', null);

  const arms = armPoses(look, R, g, p, view, sit);
  const carryHand = look.carry?.type === 'balloon' ? 'R' : 'L';
  if (look.carry?.type === 'suitcase') drawSuitcase(ctx, look, arms.L.H[0] + cs * 0.7, arms.L.H[1] + dy, view);

  const toward = back ? -1 : 1;
  const legs = g.legs.map((l, i) => {
    const sx = (i === 0 ? cs : -cs) * R.legX;
    const hy = R.hipJ + dy;
    if (sit) {
      const ky = hy + 1.8;
      return { hip: [sx, hy], knee: [sx * 1.2, ky], ankle: [sx * 1.15, Math.min(R.ankleY, ky + R.shin)], fwd: 0 };
    }
    return { hip: [sx, hy], knee: [sx * 0.94, hy + l.ky + toward * l.kx * 0.15], ankle: [sx * 0.86, hy + l.ay + toward * l.ax * 0.15], fwd: l.ax * toward };
  });
  legs.sort((a, b) => a.fwd - b.fwd);
  for (const l of legs) {
    drawLeg(ctx, look, R, l.hip, l.knee, l.ankle, false);
    shoeFront(ctx, look, l.ankle[0], l.ankle[1], back, false);
  }

  ctx.save();
  ctx.translate(0, dy);
  drawPelvis(ctx, look, R, view, 0);
  drawSkirt(ctx, look, R, view, 0, sit);
  neck(ctx, look, R, 0);
  drawTorso(ctx, look, R, o, view);
  if (look.back) drawBackpack(ctx, look, R, view);
  if (look.scarf) drawScarf(ctx, look, R, view);
  if (look.satchel) drawSatchel(ctx, R, view, cs);
  if (look.carry?.type === 'camera') drawCameraStrap(ctx, R, view);
  if (p.action === 'guitar' || look.carry?.type === 'guitar') drawGuitar(ctx, R, view, cs);
  const hands = {};
  for (const key of back ? ['L', 'R'] : ['R', 'L']) hands[key] = drawArm(ctx, look, R, o, arms[key], sleeveOf(look, key), false);
  if (p.action === 'clean') drawMopSweep(ctx, hands.L.x, hands.L.y, p.anim, view);
  if (look.carry?.type !== 'suitcase') drawHeld(ctx, look, R, hands[carryHand], view, p);
  else if (p.action === 'phone') drawHeld(ctx, { carry: null }, R, hands.L, view, p);
  if (p.action === 'read' && !back) newspaper(ctx, R);
  drawHeadFront(ctx, look, R, 0, back);
  ctx.restore();
}

function newspaper(ctx, R) {
  rrect(ctx, -5, R.waistY - 8.4, 10, 7.4, 0.3);
  ctx.fillStyle = '#f2f0e6';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.2;
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(-4.3, R.waistY - 7.8, 8.6, 1);
  ctx.fillStyle = '#9a9a9a';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-4.3, R.waistY - 6.2 + i * 1.0, 4, 0.35);
    ctx.fillRect(0.3, R.waistY - 6.2 + i * 1.0, 4, 0.35);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, R.waistY - 8.4);
  ctx.lineTo(0, R.waistY - 1);
  ctx.stroke();
}

// ------------------------------------------------------------------ side view (facing +x)
function drawSide(ctx, look, p) {
  const R = rigOf(look);
  const o = outfitOf(look);
  const g = gaitOf(R, p);
  const sit = p.mode === 'sit';
  const hipY = sit ? (-12 * 40) / look.height : g.hipY;
  const lean = sit ? 0 : g.lean;
  ellipse(ctx, 0.5, 0, 6.5 * R.b, 2.0, 0, 'rgba(0,0,0,0.17)', null);
  const arms = armPoses(look, R, g, p, 'side', sit);
  const upper = (fn) => {
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    ctx.translate(0, -R.hipJ);
    fn();
    ctx.restore();
  };

  // far arm (the character's right) first, slightly darker
  upper(() => {
    const h = drawArm(ctx, look, R, o, arms.R, sleeveOf(look, 'R'), true);
    if (look.carry?.type === 'balloon') drawHeld(ctx, look, R, h, 'side', p);
  });

  const legPts = g.legs.map((l) => {
    if (sit) {
      const knee = [R.thigh * 0.95, hipY + 0.4];
      return { hip: [-0.3, hipY], knee, ankle: [knee[0] + 0.6, Math.min(R.ankleY, knee[1] + R.shin)], angle: 0 };
    }
    return { hip: [0, hipY], knee: [l.kx, hipY + l.ky], ankle: [l.ax, hipY + l.ay], angle: l.lift > 0.05 ? -l.sa * 0.5 : 0 };
  });
  const [near, far] = legPts;
  drawLeg(ctx, look, R, far.hip, far.knee, far.ankle, true);
  shoeSide(ctx, look, far.ankle[0], far.ankle[1], far.angle, true);
  if (look.carry?.type === 'suitcase') {
    ctx.save();
    ctx.translate(0, hipY - R.hipJ);
    drawSuitcase(ctx, look, arms.L.H[0], arms.L.H[1], 'side');
    ctx.restore();
  }
  drawLeg(ctx, look, R, near.hip, near.knee, near.ankle, false);
  shoeSide(ctx, look, near.ankle[0], near.ankle[1], near.angle, false);

  upper(() => {
    drawPelvis(ctx, look, R, 'side', 0);
    drawSkirt(ctx, look, R, 'side', 0, sit);
    if (look.back) drawBackpack(ctx, look, R, 'side');
    neck(ctx, look, R, 0.3);
    drawTorso(ctx, look, R, o, 'side');
    if (look.satchel) drawSatchel(ctx, R, 'side', 1);
    if (look.scarf) drawScarf(ctx, look, R, 'side', g.moving ? Math.sin(p.phase * 2) : 0);
    if (look.carry?.type === 'camera') drawCameraStrap(ctx, R, 'side');
    if (p.action === 'guitar' || look.carry?.type === 'guitar') drawGuitar(ctx, R, 'side', 1);
    const h = drawArm(ctx, look, R, o, arms.L, sleeveOf(look, 'L'), false);
    if (p.action === 'clean') drawMopSweep(ctx, h.x, h.y, p.anim, 'side');
    const heldNear = look.carry && look.carry.type !== 'balloon' && look.carry.type !== 'suitcase';
    if (heldNear) drawHeld(ctx, look, R, h, 'side', p);
    else if (p.action === 'phone') drawHeld(ctx, { carry: null }, R, h, 'side', p);
    if (p.action === 'read') {
      rrect(ctx, 6.2, R.waistY - 8.6, 0.9, 8, 0.2);
      ctx.fillStyle = '#f2f0e6';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.18;
      ctx.stroke();
    }
    drawHeadSide(ctx, look, R, 0.4);
  });
}

// ------------------------------------------------------------------ far-away figures
/** Very cheap figure for tiny on-screen sizes (or while sprites are still being prepared). */
function drawSimple(ctx, look, p) {
  const R = rigOf(look);
  const g = gaitOf(R, p);
  const sit = p.mode === 'sit';
  const dy = sit ? (-12 * 40) / look.height - R.hipJ : g.dy;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(-5, -1, 10, 2);
  const legC = look.bottom.type === 'trousers' || look.bottom.type === 'knickers' ? look.bottom.color : look.skin;
  ctx.fillStyle = legC;
  const lift0 = g.legs[0].lift;
  const lift1 = g.legs[1].lift;
  ctx.fillRect(-R.legX - 1.1, R.hipJ + dy, 2.2, -R.hipJ - dy - lift1);
  ctx.fillRect(R.legX - 1.1, R.hipJ + dy, 2.2, -R.hipJ - dy - lift0);
  const hem = outfitOf(look).hemY;
  if (look.top.pattern === 'patchwork') {
    ctx.fillStyle = look.top.color;
    ctx.fillRect(-R.shW, R.shoulderY - 1 + dy, R.shW, hem - R.shoulderY + 1);
    ctx.fillStyle = look.top.color2;
    ctx.fillRect(0, R.shoulderY - 1 + dy, R.shW, hem - R.shoulderY + 1);
  } else {
    ctx.fillStyle = look.vest ?? look.top.color;
    ctx.fillRect(-R.shW, R.shoulderY - 1 + dy, R.shW * 2, hem - R.shoulderY + 1);
  }
  ctx.fillStyle = look.skin;
  ctx.fillRect(-R.headW / 2, R.top + dy, R.headW, R.headH);
  if (look.hair.style !== 'bald') {
    ctx.fillStyle = look.hair.color;
    const wide = look.hair.style === 'wiggles' ? 1.7 : 1.05;
    ctx.fillRect((-R.headW * wide) / 2, R.top - 0.3 + dy, R.headW * wide, p.dir === 'up' ? R.headH * 0.9 : R.headH * 0.32);
  }
  if (look.hat) {
    ctx.fillStyle = look.hat.color;
    if (look.hat.type === 'wiggles') {
      ctx.fillRect(-R.headW * 0.85, R.top + R.headH * 0.15 + dy, R.headW * 1.7, 1.2);
      ctx.fillRect(-R.headW * 0.55, R.top - R.headH * 1.5 + dy, R.headW * 1.1, R.headH * 1.65);
      ctx.fillStyle = look.hat.color2;
      ctx.fillRect(-R.headW * 0.55, R.top - R.headH * 0.95 + dy, R.headW * 1.1, 1.3);
      ctx.fillRect(-R.headW * 0.55, R.top - R.headH * 0.2 + dy, R.headW * 1.1, 1.2);
    } else {
      ctx.fillRect(-R.headW * 0.6, R.top - 1.2 + dy, R.headW * 1.2, 2.4);
    }
  }
  if (look.carry?.type === 'wigglesStick' || look.carry?.type === 'cane') {
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(R.shW + 1.4, R.waistY + dy, 0.9, -R.waistY - dy);
  }
  if (look.carry?.type === 'balloon') ellipse(ctx, -R.shW - 2, -59, 3.4, 4.2, 0, look.carry.color, null);
}

/** Large animated portrait used in menus and the "who to find" card. */
export function drawPortrait(ctx, look, width, height, t, { dir = 'down', action = 'wave' } = {}) {
  ctx.clearRect(0, 0, width, height);
  const scale = (height * 0.8) / 54;
  ctx.save();
  ctx.translate(width / 2, height * 0.95);
  ctx.scale(scale, scale);
  drawPerson(ctx, look, { dir, mode: 'stand', phase: 0, t, action }, 0, 0, 'full');
  ctx.restore();
}
