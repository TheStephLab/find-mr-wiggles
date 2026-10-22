/**
 * 3D drawing helpers. Everything takes the projection `P` (see core/projection.js)
 * and draws in picture space.
 *
 * - drawBox:  an extruded box with top, front and the side facing the camera
 * - onFront:  draw flat artwork on a camera-facing plane (affine, so ordinary
 *             2D canvas drawing works – used for signs, shop fronts, people)
 * - sideQuad / topQuad: decorate the other faces
 */
import { shade } from './props.js';

export const OUT3 = '#2a2230';

export function poly(ctx, pts, fill, stroke = OUT3, lw = 0.8) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
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

/**
 * b = { x, y, w, d, h, z } – footprint x..x+w, depth y..y+d (y+d is the near face),
 * height z..z+h. style = { top, front, side, stroke, lw }.
 */
export function drawBox(ctx, P, b, style) {
  const { x, y, w, d, h, z = 0 } = b;
  const front = style.front ?? style.colour;
  const top = style.top ?? shade(front, 0.25);
  const side = style.side ?? shade(front, -0.22);
  const stroke = style.stroke === undefined ? OUT3 : style.stroke;
  const lw = style.lw ?? 0.8;
  const zt = z + h;
  if (d > 0 && h > 0) {
    if (x + w < P.cx) poly(ctx, [P.pt(x + w, y, z), P.pt(x + w, y + d, z), P.pt(x + w, y + d, zt), P.pt(x + w, y, zt)], side, stroke, lw);
    else if (x > P.cx) poly(ctx, [P.pt(x, y, z), P.pt(x, y + d, z), P.pt(x, y + d, zt), P.pt(x, y, zt)], side, stroke, lw);
  }
  if (h > 0) poly(ctx, [P.pt(x, y + d, z), P.pt(x + w, y + d, z), P.pt(x + w, y + d, zt), P.pt(x, y + d, zt)], front, stroke, lw);
  if (d > 0) poly(ctx, [P.pt(x, y, zt), P.pt(x + w, y, zt), P.pt(x + w, y + d, zt), P.pt(x, y + d, zt)], top, stroke, lw);
}

/** Contact shadow under a footprint. */
export function shadow(ctx, P, x, y, w, d, z = 0, alpha = 0.16) {
  poly(ctx, [P.pt(x - 2, y - 1, z), P.pt(x + w + 4, y - 1, z), P.pt(x + w + 6, y + d + 3, z), P.pt(x, y + d + 3, z)], `rgba(0,0,0,${alpha})`, null);
}

/**
 * Draw on the camera-facing plane through (x, y, z). Inside `fn`, the origin is
 * that point, +x is right, -y is up and one unit is one world unit.
 */
export function onFront(ctx, P, x, y, z, fn) {
  const s = P.s(y);
  ctx.save();
  ctx.translate(P.X(x, y), P.Y(y, z));
  ctx.scale(s, s);
  fn(ctx, s);
  ctx.restore();
}

/** Quad on the vertical plane x = const, spanning depth y0..y1 and height z0..z1. */
export function sideQuad(ctx, P, x, y0, y1, z0, z1, fill, stroke = null, lw = 0.6) {
  poly(ctx, [P.pt(x, y0, z0), P.pt(x, y1, z0), P.pt(x, y1, z1), P.pt(x, y0, z1)], fill, stroke, lw);
}

/** Quad on the horizontal plane z = const. */
export function topQuad(ctx, P, x, y, w, d, z, fill, stroke = null, lw = 0.6) {
  poly(ctx, [P.pt(x, y, z), P.pt(x + w, y, z), P.pt(x + w, y + d, z), P.pt(x, y + d, z)], fill, stroke, lw);
}

/** Line between two 3D points. */
export function line3(ctx, P, a, b, colour, width) {
  const p = P.pt(...a);
  const q = P.pt(...b);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(q[0], q[1]);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width * P.s(Math.max(a[1], b[1]));
  ctx.stroke();
}
