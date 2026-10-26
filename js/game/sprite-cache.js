/**
 * Sprite cache for characters.
 *
 * Drawing a detailed figure costs about a millisecond, far too much to do
 * for hundreds of people every frame. Instead each (look, animation frame,
 * scale bucket) is rendered once into a shared 1024² atlas page and
 * blitted with drawImage.
 *
 * Smoothness rules:
 *  - coverage and sharpness are prepared fairly before animation refinements;
 *  - preparation is bounded by time and a hard sprite count, with one render
 *    allowed to make progress even when its estimated cost exceeds the budget;
 *  - otherwise the nearest cached scale or animation frame is reused, and
 *    the caller falls back to a cheap figure only if nothing is cached yet;
 *  - pages are recycled least-recently-used first, keeping memory bounded.
 */
import { drawPerson, spriteFrame, spriteBounds } from './draw-person.js';

export const PAGE = 1024;
const STEPS = 3; // scale buckets per doubling (≈26% apart)

function defaultPages() {
  const mem = globalThis.navigator?.deviceMemory ?? 4;
  return mem >= 8 ? 20 : mem >= 4 ? 14 : 8;
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

export function createSpriteCache({ maxPages = defaultPages() } = {}) {
  const pages = [];
  const byLook = new WeakMap();
  const preparedAt = new WeakMap();
  let tick = 0;
  let budgetEnd = 0;
  let rendersLeft = Infinity;
  let renderedThisFrame = 0;
  let enabled = false;
  const stats = { rendered: 0, hits: 0, fallbacks: 0, misses: 0, coarseFallbacks: 0 };

  function newPage() {
    const canvas = makeCanvas(PAGE, PAGE);
    return { canvas, ctx: canvas.getContext('2d'), shelves: [], cursorY: 0, gen: 0, used: 0 };
  }

  function fit(page, w, h) {
    for (const s of page.shelves) {
      if (h <= s.h && h >= s.h * 0.7 && s.x + w <= PAGE) {
        const spot = { page, x: s.x, y: s.y };
        s.x += w + 1;
        return spot;
      }
    }
    if (page.cursorY + h > PAGE) return null;
    const shelf = { y: page.cursorY, h, x: w + 1 };
    page.shelves.push(shelf);
    page.cursorY += h + 1;
    return { page, x: 0, y: shelf.y };
  }

  function allocate(w, h) {
    for (let i = pages.length - 1; i >= 0; i--) {
      const spot = fit(pages[i], w, h);
      if (spot) return spot;
    }
    if (pages.length < maxPages) {
      const page = newPage();
      pages.push(page);
      return fit(page, w, h);
    }
    let lru = pages[0];
    for (const p of pages) if (p.used < lru.used) lru = p;
    lru.gen++;
    lru.shelves = [];
    lru.cursorY = 0;
    lru.ctx.setTransform(1, 0, 0, 1, 0, 0);
    lru.ctx.clearRect(0, 0, PAGE, PAGE);
    // move to the end so the newest page is searched first
    pages.splice(pages.indexOf(lru), 1);
    pages.push(lru);
    return fit(lru, w, h);
  }

  function render(look, frame, bucket) {
    const q = 2 ** (bucket / STEPS);
    const bd = spriteBounds(look);
    const w = Math.ceil((bd.R - bd.L) * q) + 2;
    const h = Math.ceil((bd.B - bd.T) * q) + 2;
    if (w > PAGE / 2 || h > PAGE / 2) return 'direct';
    const spot = allocate(w, h);
    if (!spot) return null;
    const { page } = spot;
    const ctx = page.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(spot.x, spot.y, w, h);
    ctx.beginPath();
    ctx.rect(spot.x, spot.y, w, h);
    ctx.clip();
    ctx.setTransform(q, 0, 0, q, spot.x + 1 - bd.L * q, spot.y + 1 - bd.T * q);
    drawPerson(ctx, look, frame.pose, 0, 0, 'full', 1);
    ctx.restore();
    page.used = tick;
    stats.rendered++;
    return { page, gen: page.gen, sx: spot.x, sy: spot.y, sw: w, sh: h, L: bd.L - 1 / q, T: bd.T - 1 / q, W: w / q, H: h / q, bucket };
  }

  const valid = (e) => e && e !== 'direct' && e.page.gen === e.gen;
  // Learned cost of rendering a sprite: fixed overhead + per-pixel raster time (ms).
  let msPerPixel = 0.00008;
  const BASE_MS = 0.35;
  const predict = (look, bucket) => {
    const q = 2 ** (bucket / STEPS);
    const bd = spriteBounds(look);
    return BASE_MS + (bd.R - bd.L) * (bd.B - bd.T) * q * q * msPerPixel;
  };
  const nearest = (buckets, bucket) => {
    let best = null;
    for (const e of buckets.values()) if (valid(e) && (!best || Math.abs(e.bucket - bucket) < Math.abs(best.bucket - bucket))) best = e;
    return best;
  };

  function request(look, pose, q) {
    const frame = spriteFrame(look, pose);
    // Round up: even an exact hit must have enough pixels for the display.
    const bucket = Math.ceil(Math.log2(Math.max(q, 1e-3)) * STEPS);
    let frames = byLook.get(look);
    if (!frames) byLook.set(look, (frames = new Map()));
    let buckets = frames.get(frame.key);
    if (!buckets) {
      buckets = new Map();
      buckets.family = frame.family;
      frames.set(frame.key, buckets);
    }
    const hit = buckets.get(bucket);
    if (hit === 'direct' || valid(hit)) return { look, frame, bucket, buckets, hit, best: hit };
    let best = nearest(buckets, bucket);
    const family = frame.family;
    for (const [key, m] of frames) {
      if (key === frame.key || m.family !== family) continue;
      const e = nearest(m, bucket);
      if (e && (!best || Math.abs(e.bucket - bucket) < Math.abs(best.bucket - bucket))) best = e;
    }
    return { look, frame, bucket, buckets, hit, best };
  }

  function obtain(r, allowRender) {
    const { look, frame, bucket, buckets, hit, best } = r;
    if (hit === 'direct') return { direct: true };
    if (valid(hit)) return { entry: hit, mirror: frame.mirror, exact: true };
    const qb = 2 ** (bucket / STEPS);
    const bd = spriteBounds(look);
    if ((bd.R - bd.L) * qb + 2 > PAGE / 2 || (bd.B - bd.T) * qb + 2 > PAGE / 2) {
      buckets.set(bucket, 'direct');
      return { direct: true };
    }
    const now = performance.now();
    if (allowRender && enabled && rendersLeft > 0 && (renderedThisFrame === 0 || now + predict(look, bucket) <= budgetEnd)) {
      rendersLeft--;
      renderedThisFrame++;
      const made = render(look, frame, bucket);
      const took = performance.now() - now;
      if (made && made !== 'direct') {
        msPerPixel = Math.max(1e-6, msPerPixel * 0.9 + (Math.max(0, took - BASE_MS) / (made.sw * made.sh)) * 0.1);
        buckets.set(bucket, made);
        preparedAt.set(look, tick);
        return { entry: made, mirror: frame.mirror, exact: true };
      }
    }
    return valid(best) ? { entry: best, mirror: frame.mirror, exact: false } : null;
  }

  return {
    stats,
    /**
     * Allow sprite rendering for `ms` milliseconds and at most `maxRenders` sprites.
     * The count matters because canvas rasterisation is deferred: its cost lands
     * after our JavaScript timing, so time alone under-counts the real work.
     */
    beginFrame(ms, maxRenders = Infinity) {
      tick++;
      budgetEnd = performance.now() + ms;
      rendersLeft = maxRenders;
      renderedThisFrame = 0;
      enabled = ms > 0;
    },
    /**
     * Prepare the current visible requests before depth-ordered blitting.
     * Missing people come first, then under-resolved sprites, then animation.
     * Age breaks ties so the front/back of the crowd get the same treatment.
     */
    prepare(requests) {
      const pending = requests.map(({ look, pose, q }) => request(look, pose, q))
        .filter((r) => r.hit !== 'direct' && !valid(r.hit));
      const priority = (r) => !r.best ? 0 : r.best.bucket < r.bucket - 1 ? 1 : 2;
      pending.sort((a, b) => priority(a) - priority(b) || (preparedAt.get(a.look) ?? -1) - (preparedAt.get(b.look) ?? -1));
      for (const r of pending) {
        if (!enabled || rendersLeft <= 0 || (renderedThisFrame > 0 && performance.now() >= budgetEnd)) break;
        obtain(r, true);
      }
    },
    /**
     * Sprite for a pose at `q` device pixels per world unit.
     * Returns { entry, mirror } | { direct: true } | null (nothing usable yet).
     */
    get(look, pose, q, allowRender = true) {
      const r = request(look, pose, q);
      const result = obtain(r, allowRender);
      if (!result) stats.misses++;
      else if (result.entry) {
        result.entry.page.used = tick;
        if (result.exact) stats.hits++;
        else {
          stats.fallbacks++;
          if (result.entry.bucket < r.bucket - 1) stats.coarseFallbacks++;
        }
      }
      return result;
    },
    get pageCount() {
      return pages.length;
    },
  };
}
