import { visibleRect } from '../core/camera.js';
import { rectsOverlap } from '../core/geometry.js';
import { drawPerson } from './draw-person.js';
import { agentPose, agentBounds } from './agents.js';
import { createSpriteCache } from './sprite-cache.js';

const MAX_CACHE_PIXELS = 9_000_000; // stays well under mobile canvas limits
const MAX_DETAIL_PIXELS = 6_000_000;
const TINY_PX = 7; // characters shorter than this on screen are drawn as simple blocks
const SETTLE_MS = 120; // rebuild the sharp close-up floor once the camera pauses

/**
 * Canvas renderer for the perspective picture.
 *
 * The static backdrop and floor are rendered once: the flat floor plan is
 * drawn in bands and warped into perspective strip by strip ("mode 7"). When
 * the player zooms in past that bitmap's resolution, a sharper copy of just
 * the visible region is rebuilt after the camera settles.
 *
 * Characters come from a sprite cache (see sprite-cache.js) so hundreds of
 * detailed people cost little more than hundreds of drawImage calls.
 * Options: `sprites: false` draws people directly; `people: 'simple'` draws
 * cheap blocks (used for tiny thumbnails).
 */
export function createRenderer(canvas, world, { dpr: fixedDpr, sprites: useSprites = true, people = 'full', spriteBudgetMs = 6 } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const { P } = world;
  const PW = P.width;
  const PH = P.height;
  const baseScale = Math.min(2, Math.sqrt(MAX_CACHE_PIXELS / (PW * PH)));
  let base = null;
  let detail = null;
  let camKey = '';
  let camChangedAt = 0;
  let budgetMs = spriteBudgetMs;
  let budgetCount = Infinity;
  const sprites = useSprites && people !== 'simple' ? createSpriteCache() : null;
  const drawList = [];
  const segments = levelSegments(world);

  function makeCanvas(w, h) {
    return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  }

  function renderRegion(rect, scale) {
    const out = makeCanvas(Math.max(1, Math.ceil(rect.w * scale)), Math.max(1, Math.ceil(rect.h * scale)));
    const o = out.getContext('2d');
    o.setTransform(scale, 0, 0, scale, -rect.x * scale, -rect.y * scale);
    o.fillStyle = world.background;
    o.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (world.backdrop) {
      o.save();
      world.backdrop(o, P);
      o.restore();
    }
    for (const seg of segments) warpFloor(o, rect, scale, seg);
    for (const seg of segments) {
      if (seg.cliff) {
        const { y, zFar, zNear } = seg.cliff;
        o.beginPath();
        o.moveTo(...P.pt(0, y, zFar));
        o.lineTo(...P.pt(P.W, y, zFar));
        o.lineTo(...P.pt(P.W, y, zNear));
        o.lineTo(...P.pt(0, y, zNear));
        o.closePath();
        o.fillStyle = '#2a2622';
        o.fill();
      }
    }
    return { canvas: out, rect, scale };
  }

  /** Draw the flat floor rows y0..y1 (all at height z) into perspective. */
  function warpFloor(o, rect, scale, { y0, y1, z }) {
    const pyTop = P.Y(y0, z);
    const pyBot = P.Y(y1, z);
    if (pyBot < rect.y || pyTop > rect.y + rect.h) return;
    const yFrom = Math.max(y0, Math.min(y1, P.yAt(rect.y, z) - 2));
    const yTo = Math.min(y1, Math.max(y0, P.yAt(rect.y + rect.h, z) + 2));
    const xa = Math.max(0, Math.floor(P.xAt(rect.x, yFrom)) - 2);
    const xb = Math.min(P.W, Math.ceil(P.xAt(rect.x + rect.w, yFrom)) + 2);
    if (xb <= xa) return;
    const r = scale;
    const bandH = Math.max(16, Math.min(400, Math.floor(3_000_000 / ((xb - xa) * r * r))));
    const band = makeCanvas(Math.ceil((xb - xa) * r), Math.ceil(bandH * r) + 2);
    const b = band.getContext('2d');
    for (let by = yFrom; by < yTo; by += bandH) {
      const by1 = Math.min(yTo, by + bandH);
      const view = { x: xa, y: by, w: xb - xa, h: by1 - by };
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, band.width, band.height);
      b.setTransform(r, 0, 0, r, -xa * r, -by * r);
      for (const f of world.floor) {
        if (!rectsOverlap(f.bounds, view)) continue;
        b.save();
        f.draw(b, view);
        b.restore();
      }
      let y = by;
      while (y < by1) {
        const sy = P.s(y);
        const rowPx = (P.Y(y, z) - P.Y(y + 1, z)) * -scale || sy * sy * scale;
        const dy = Math.max(0.25, Math.min(by1 - y, 1.4 / Math.max(1e-3, rowPx)));
        const ym = y + dy / 2;
        const sm = P.s(ym);
        const top = P.Y(y, z);
        const h = P.Y(y + dy, z) - top;
        if (top + h >= rect.y && top <= rect.y + rect.h) {
          o.drawImage(band, 0, (y - by) * r, (xb - xa) * r, dy * r, P.X(xa, ym), top, (xb - xa) * sm, h + 0.7 / scale);
        }
        y += dy;
      }
    }
  }

  function chooseFloor(camera, s, view, now) {
    if (!base) base = renderRegion({ x: 0, y: 0, w: PW, h: PH }, baseScale);
    if (s <= baseScale * 1.35) return base;
    const key = `${camera.x.toFixed(1)}|${camera.y.toFixed(1)}|${camera.scale.toFixed(3)}`;
    if (key !== camKey) {
      camKey = key;
      camChangedAt = now;
    }
    const fits = detail && detail.scale >= s * 0.75 && detail.scale <= s * 1.8 && contains(detail.rect, view);
    if (fits) return detail;
    if (now - camChangedAt >= SETTLE_MS) {
      const pad = 0.2;
      const rect = clampRect({ x: view.x - view.w * pad, y: view.y - view.h * pad, w: view.w * (1 + pad * 2), h: view.h * (1 + pad * 2) }, PW, PH);
      const scale = Math.min(s, Math.sqrt(MAX_DETAIL_PIXELS / Math.max(1, rect.w * rect.h)));
      if (scale > baseScale * 1.2) {
        detail = renderRegion(rect, scale);
        return detail;
      }
    }
    return detail && rectsOverlap(detail.rect, view) && detail.scale > baseScale ? [base, detail] : base;
  }

  function blit(layer, view) {
    const { rect, scale } = layer;
    const x0 = Math.max(view.x, rect.x);
    const y0 = Math.max(view.y, rect.y);
    const x1 = Math.min(view.x + view.w, rect.x + rect.w);
    const y1 = Math.min(view.y + view.h, rect.y + rect.h);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.drawImage(layer.canvas, (x0 - rect.x) * scale, (y0 - rect.y) * scale, (x1 - x0) * scale, (y1 - y0) * scale, x0, y0, x1 - x0, y1 - y0);
  }

  function render(camera, t, overlay) {
    const dpr = fixedDpr ?? Math.min(globalThis.devicePixelRatio || 1, 2.5);
    const s = camera.scale * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1a22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, -camera.x * s, -camera.y * s);
    ctx.imageSmoothingEnabled = true;
    const view = visibleRect(camera, 8);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const floor = chooseFloor(camera, s, view, now);
    for (const layer of [].concat(floor)) blit(layer, view);

    drawList.length = 0;
    for (const d of world.dynamic) {
      if (d.parts) {
        for (const part of d.parts()) if (rectsOverlap(part.bounds, view)) drawList.push(part);
      } else if (!d.bounds || rectsOverlap(d.bounds, view)) {
        d.draw(ctx, t, P);
      }
    }
    for (const p of world.props) if (rectsOverlap(p.bounds, view)) drawList.push(p);
    for (const a of world.agents) if (rectsOverlap(agentBounds(a, P), view)) drawList.push(a);
    drawList.sort((a, b) => a.sortY - b.sortY);
    sprites?.beginFrame(budgetMs, budgetCount);
    const ex = -camera.x * s;
    const ey = -camera.y * s;
    for (const item of drawList) {
      if (!item.look) {
        item.draw(ctx, t, P);
        continue;
      }
      const k = P.s(item.y);
      const px = P.X(item.x, item.y);
      const py = P.Y(item.y, item.z ?? 0);
      const pose = agentPose(item, t);
      if (people === 'simple' || camera.scale * 40 * k < TINY_PX) {
        drawPerson(ctx, item.look, pose, px, py, 'simple', k);
        continue;
      }
      if (!sprites) {
        drawPerson(ctx, item.look, pose, px, py, 'full', k);
        continue;
      }
      const hit = sprites.get(item.look, pose, s * k);
      if (!hit) {
        drawPerson(ctx, item.look, pose, px, py, 'simple', k);
      } else if (hit.direct) {
        drawPerson(ctx, item.look, pose, px, py, 'full', k);
      } else {
        const e = hit.entry;
        if (hit.mirror) ctx.setTransform(-s, 0, 0, s, 2 * px * s + ex, ey);
        ctx.drawImage(e.page.canvas, e.sx, e.sy, e.sw, e.sh, px + e.L * k, py + e.T * k, e.W * k, e.H * k);
        if (hit.mirror) ctx.setTransform(s, 0, 0, s, ex, ey);
      }
    }

    overlay?.(ctx, camera, t);
  }

  return {
    render,
    sprites,
    /** Time (ms) and number of new character sprites allowed per frame. */
    setSpriteBudget(ms, count = Infinity) {
      budgetMs = ms;
      budgetCount = count;
    },
    invalidate() {
      base = null;
      detail = null;
    },
  };
}

/** Split the depth axis wherever the floor height changes. */
function levelSegments(world) {
  const { P } = world;
  const cuts = new Set([0, P.H]);
  for (const l of world.levels ?? []) {
    cuts.add(Math.max(0, Math.min(P.H, l.rect.y)));
    cuts.add(Math.max(0, Math.min(P.H, l.rect.y + l.rect.h)));
  }
  const ys = [...cuts].sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (y1 - y0 < 0.5) continue;
    const z = world.floorZ(P.W / 2, (y0 + y1) / 2);
    const prev = segs[segs.length - 1];
    const seg = { y0, y1, z };
    if (prev && prev.z > z) seg.cliff = { y: y0, zFar: prev.z, zNear: z };
    segs.push(seg);
  }
  return segs;
}

function contains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

function clampRect(r, W, H) {
  const x = Math.max(0, r.x);
  const y = Math.max(0, r.y);
  return { x, y, w: Math.min(W, r.x + r.w) - x, h: Math.min(H, r.y + r.h) - y };
}
