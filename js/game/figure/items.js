/**
 * Things people hold or carry. `h` is the hand position {x, y} in the
 * figure's frame; `ground` is the floor line (y = 0).
 */
import { INK, TAU, shade, shadedFill, ellipse, rrect, stroke } from './core.js';

export function drawHeld(ctx, look, R, h, view, p) {
  const c = look.carry;
  if (p.action === 'phone') phone(ctx, h);
  if (!c) return;
  switch (c.type) {
    case 'wigglesStick':
      wigglesStick(ctx, h, view);
      break;
    case 'cane': {
      const gx = h.x + (view === 'side' ? 0.9 : 0.5);
      stroke(ctx, [[h.x - 0.9, h.y - 0.6], [h.x - 0.4, h.y - 1.2], [h.x + 0.3, h.y - 0.9], [gx, 0]], '#3b3b3b', 0.45);
      break;
    }
    case 'coffee':
      rrect(ctx, h.x - 0.7, h.y - 2.1, 1.4, 2.1, 0.25);
      shadedFill(ctx, '#f4efe6', h.x - 0.7, h.x + 0.7);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(h.x - 0.7, h.y - 1.4, 1.4, 0.8);
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(h.x - 0.75, h.y - 2.35, 1.5, 0.35);
      break;
    case 'phone':
      if (p.action !== 'phone') phone(ctx, h);
      break;
    case 'umbrella': {
      stroke(ctx, [[h.x, h.y - 0.4], [h.x + 0.3, h.y + 1.4]], '#333', 0.35);
      ctx.beginPath();
      ctx.moveTo(h.x + 0.3, h.y + 1.2);
      ctx.lineTo(h.x + 1.3, h.y + 3.2);
      ctx.lineTo(h.x + 1.0, h.y + 10.5);
      ctx.lineTo(h.x - 0.3, h.y + 3.2);
      ctx.closePath();
      shadedFill(ctx, c.color, h.x - 0.4, h.x + 1.4);
      stroke(ctx, [[h.x + 1.0, h.y + 10.4], [h.x + 1.1, h.y + 11.6]], '#333', 0.3);
      break;
    }
    case 'balloon': {
      const bx = h.x + 2.5;
      const by = -59;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.quadraticCurveTo(h.x + 2.5, (h.y + by) / 2, bx, by + 4.6);
      ctx.strokeStyle = 'rgba(80,80,80,0.8)';
      ctx.lineWidth = 0.12;
      ctx.stroke();
      const g = ctx.createRadialGradient(bx - 1.2, by - 1.4, 0.3, bx, by, 4.6);
      g.addColorStop(0, shade(c.color, 0.45));
      g.addColorStop(1, shade(c.color, -0.2));
      ellipse(ctx, bx, by, 3.6, 4.4, 0, g, INK, 0.2);
      ctx.beginPath();
      ctx.moveTo(bx - 0.4, by + 4.6);
      ctx.lineTo(bx + 0.4, by + 4.6);
      ctx.lineTo(bx, by + 4.1);
      ctx.fillStyle = shade(c.color, -0.2);
      ctx.fill();
      break;
    }
    case 'icecream':
      ctx.beginPath();
      ctx.moveTo(h.x - 0.7, h.y - 0.9);
      ctx.lineTo(h.x + 0.7, h.y - 0.9);
      ctx.lineTo(h.x, h.y + 1.2);
      ctx.closePath();
      shadedFill(ctx, '#d9a25f', h.x - 0.7, h.x + 0.7);
      ellipse(ctx, h.x, h.y - 1.5, 0.9, 0.85, 0, c.color);
      break;
    case 'newspaper':
      if (p.action !== 'read') {
        rrect(ctx, h.x - 0.4, h.y - 1.8, 1.2, 4, 0.2);
        shadedFill(ctx, '#efefe6', h.x - 0.4, h.x + 0.8);
      }
      break;
    case 'bag': {
      stroke(ctx, [[h.x - 0.8, h.y + 1.2], [h.x, h.y - 0.3], [h.x + 0.8, h.y + 1.2]], shade(c.color, -0.3), 0.3);
      ctx.beginPath();
      ctx.moveTo(h.x - 1.6, h.y + 1.2);
      ctx.lineTo(h.x + 1.6, h.y + 1.2);
      ctx.lineTo(h.x + 2.0, h.y + 4.4);
      ctx.lineTo(h.x - 2.0, h.y + 4.4);
      ctx.closePath();
      shadedFill(ctx, c.color, h.x - 2, h.x + 2);
      break;
    }
    case 'mop':
      if (p.action !== 'clean') mop(ctx, h.x + 1.5, h.y - 6, h.x + 3.5);
      break;
    default:
      break;
  }
}

function phone(ctx, h) {
  rrect(ctx, h.x - 0.45, h.y - 1.5, 0.9, 1.7, 0.2);
  ctx.fillStyle = '#1e1e22';
  ctx.fill();
  ctx.fillStyle = 'rgba(140,200,255,0.5)';
  ctx.fillRect(h.x - 0.3, h.y - 1.3, 0.6, 1.2);
}

function wigglesStick(ctx, h, view) {
  const gx = h.x + (view === 'side' ? 1.1 : 0.7);
  const top = h.y - 2.4;
  ctx.beginPath();
  ctx.moveTo(h.x - 0.2, top + 0.6);
  ctx.quadraticCurveTo(h.x + 0.6, top - 1.6, h.x + 1.8, top - 0.4);
  ctx.quadraticCurveTo(h.x + 2.1, top + 0.4, h.x + 1.5, top + 0.7);
  ctx.moveTo(h.x - 0.2, top + 0.6);
  ctx.lineTo(h.x + 0.1, h.y + 2);
  ctx.lineTo(h.x - 0.15, h.y + 5);
  ctx.lineTo(h.x + 0.35, h.y + 9);
  ctx.lineTo(gx - 0.2, h.y + 13);
  ctx.lineTo(gx, 0);
  ctx.strokeStyle = '#4a2f18';
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.strokeStyle = '#8a5a30';
  ctx.lineWidth = 0.25;
  ctx.stroke();
  for (const ky of [3.5, 7.2, 11]) ellipse(ctx, h.x + ky * 0.04, h.y + ky, 0.42, 0.3, 0.3, '#5a3a1e', null);
  stroke(ctx, [[h.x + 1.6, top + 0.6], [h.x + 1.75, top + 1.6]], '#444', 0.12);
  rrect(ctx, h.x + 1.1, top + 1.6, 1.3, 1.7, 0.3);
  ctx.fillStyle = '#ffd36a';
  ctx.fill();
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 0.2;
  ctx.stroke();
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(h.x + 1.0, top + 1.4, 1.5, 0.35);
  ellipse(ctx, h.x + 1.75, top + 2.5, 1.4, 1.4, 0, 'rgba(255,210,90,0.18)', null);
}

function mop(ctx, x0, y0, xHead) {
  stroke(ctx, [[x0, y0], [xHead, -0.8]], '#c9b27a', 0.45);
  ellipse(ctx, xHead + 0.4, -0.5, 2.8, 0.75, 0, '#e8e2c8', '#999', 0.15);
}

/** A wheeled suitcase whose handle meets the hand at (hx, hy). Side view tilts it behind. */
export function drawSuitcase(ctx, look, hx, hy, view) {
  const c = look.carry.color ?? '#555';
  if (view === 'side') {
    ctx.save();
    ctx.translate(hx - 5.2, -0.9);
    ctx.rotate(-0.42);
    stroke(ctx, [[2.3, -10], [2.3 + 0.2, -10 - (hy < -15 ? 6.5 : 4)]], '#666', 0.35);
    rrect(ctx, -0.2, -10.2, 4.8, 10.2, 0.9);
    shadedFill(ctx, c, -0.2, 4.6);
    ctx.fillStyle = shade(c, -0.25);
    ctx.fillRect(-0.2, -6, 4.8, 0.5);
    ellipse(ctx, 0.6, 0.1, 0.7, 0.7, 0, '#222', null);
    ctx.restore();
    return;
  }
  stroke(ctx, [[hx, hy + 0.6], [hx, -10.4]], '#666', 0.35);
  rrect(ctx, hx - 2.6, -10.5, 5.2, 9.6, 0.9);
  shadedFill(ctx, c, hx - 2.6, hx + 2.6);
  ctx.fillStyle = shade(c, -0.25);
  ctx.fillRect(hx - 2.6, -6.2, 5.2, 0.5);
  for (const s of [-1.7, 1.7]) ellipse(ctx, hx + s, -0.55, 0.6, 0.55, 0, '#222', null);
}

/** Busker's guitar across the body. */
export function drawGuitar(ctx, R, view, cs) {
  ctx.save();
  if (view === 'side') {
    ctx.translate(R.depthF + 0.6, R.waistY + 1);
    ctx.rotate(-1.15);
  } else {
    ctx.translate(cs * 0.6, R.waistY + 1.2);
    ctx.rotate(cs * 0.95);
  }
  stroke(ctx, [[0, -1], [0, -13]], '#5a3a1e', 1.1);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(-0.7, -14.4, 1.4, 1.8);
  ctx.beginPath();
  ctx.ellipse(0, 1.6, 3.1, 3.6, 0, 0, TAU);
  ctx.ellipse(0, -2.4, 2.3, 2.6, 0, 0, TAU);
  shadedFill(ctx, '#c47a2c', -3, 3);
  ellipse(ctx, 0, -0.6, 0.9, 0.9, 0, '#3a2410', null);
  ctx.restore();
}

/** Mop held in both hands while cleaning; `t` (0..1) sweeps it to and fro. */
export function drawMopSweep(ctx, hx, hy, t, view) {
  const sweep = Math.sin(t * TAU) * 1.8;
  mop(ctx, hx, hy - 6, hx + (view === 'side' ? 4.5 : 3) + sweep);
}
