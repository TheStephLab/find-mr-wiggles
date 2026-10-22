import { visibleRect } from '../core/camera.js';
import { rectsOverlap } from '../core/geometry.js';
import { drawPerson } from './draw-person.js';
import { agentPose, agentBounds } from './agents.js';

const MAX_CACHE_PIXELS = 9_000_000; // stays well under mobile canvas limits
const LOD_PIXELS = 26; // characters shorter than this on screen use the cheap renderer

/**
 * Canvas renderer. Static floor art is rasterised once into an offscreen
 * bitmap; when the player zooms in beyond that bitmap's resolution we switch
 * to drawing the visible floor items as vectors so everything stays crisp.
 */
export function createRenderer(canvas, world, { dpr: fixedDpr } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const cacheScale = Math.min(2, Math.sqrt(MAX_CACHE_PIXELS / (world.width * world.height)));
  let floorCache = null;
  const drawList = [];

  function buildFloorCache() {
    const w = Math.ceil(world.width * cacheScale);
    const h = Math.ceil(world.height * cacheScale);
    const off = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const octx = off.getContext('2d');
    octx.scale(cacheScale, cacheScale);
    octx.fillStyle = world.background;
    octx.fillRect(0, 0, world.width, world.height);
    const all = { x: 0, y: 0, w: world.width, h: world.height };
    for (const f of world.floor) {
      octx.save();
      f.draw(octx, all);
      octx.restore();
    }
    floorCache = off;
  }

  function render(camera, t, overlay) {
    const dpr = fixedDpr ?? Math.min(globalThis.devicePixelRatio || 1, 2.5);
    const s = camera.scale * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d1a22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, -camera.x * s, -camera.y * s);
    const view = visibleRect(camera, 8);
    const clip = {
      x: Math.max(0, view.x),
      y: Math.max(0, view.y),
      w: Math.min(world.width, view.x + view.w) - Math.max(0, view.x),
      h: Math.min(world.height, view.y + view.h) - Math.max(0, view.y),
    };

    // floor
    if (clip.w <= 0 || clip.h <= 0) {
      /* camera is outside the world – nothing to draw for the floor */
    } else if (s <= cacheScale * 1.35) {
      if (!floorCache) buildFloorCache();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(floorCache, clip.x * cacheScale, clip.y * cacheScale, clip.w * cacheScale, clip.h * cacheScale, clip.x, clip.y, clip.w, clip.h);
    } else {
      ctx.fillStyle = world.background;
      ctx.fillRect(clip.x, clip.y, clip.w, clip.h);
      for (const f of world.floor) {
        if (!rectsOverlap(f.bounds, view)) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(f.bounds.x, f.bounds.y, f.bounds.w, f.bounds.h);
        ctx.clip();
        f.draw(ctx, view);
        ctx.restore();
      }
    }

    // animated things under the crowd
    for (const d of world.dynamic) {
      if (rectsOverlap(d.bounds, view)) d.draw(ctx, t);
    }

    // depth-sorted props + people
    drawList.length = 0;
    for (const p of world.props) if (rectsOverlap(p.bounds, view)) drawList.push(p);
    for (const a of world.agents) if (rectsOverlap(agentBounds(a), view)) drawList.push(a);
    drawList.sort((a, b) => a.sortY - b.sortY);
    const lod = camera.scale * 40 < LOD_PIXELS ? 'simple' : 'full';
    for (const item of drawList) {
      if (item.look) drawPerson(ctx, item.look, agentPose(item, t), item.x, item.y, lod);
      else item.draw(ctx, t);
    }

    overlay?.(ctx, camera, t);
  }

  return {
    render,
    invalidate() {
      floorCache = null;
    },
  };
}
