import { createCamera, resizeCamera, screenToWorld, zoomAt, panBy, centreOn } from '../core/camera.js';
import { createWorld } from './world.js';
import { createRenderer } from './renderer.js';
import { attachInput } from './input.js';

const FOUND_DELAY_MS = 1600;
const HINT_COOLDOWN_MS = 8000;

/**
 * One play-through of a scene: owns the world, camera, render loop, timer,
 * guesses and hints. The UI layer talks to it through the returned API.
 */
export function createGame({ canvas, scene, level, seed, perfFactor = 1, reducedMotion = false, onFound, onGuess, onAutoPause }) {
  const world = createWorld(scene, { level, seed, perfFactor });
  const renderer = createRenderer(canvas, world);
  const rect = canvas.getBoundingClientRect();
  const camera = createCamera({ viewW: rect.width || 800, viewH: rect.height || 600, worldW: world.width, worldH: world.height });
  const speed = reducedMotion ? 0.55 : 1;
  // Portrait phones: start zoomed to fill the height rather than showing a thin strip.
  const cover = Math.max(camera.viewW / world.width, camera.viewH / world.height);
  centreOn(camera, world.width / 2, world.height / 2, Math.min(cover, camera.minScale * 2.6));

  let state = 'ready'; // ready | running | paused | found | destroyed
  let elapsed = 0;
  let misses = 0;
  let hintsUsed = 0;
  let lastHintAt = -Infinity;
  let hint = null;
  let tween = null;
  let crosshair = false;
  let last = performance.now();
  let frame = 0;
  const markers = [];
  const confetti = [];

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    resizeCamera(camera, r.width, r.height);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  function tweenCamera(toX, toY, toScale, ms = 700) {
    const from = { cx: camera.x + camera.viewW / camera.scale / 2, cy: camera.y + camera.viewH / camera.scale / 2, s: camera.scale };
    tween = { from, to: { cx: toX, cy: toY, s: toScale }, t0: performance.now(), ms };
  }

  function stepTween(now) {
    if (!tween) return;
    const k = Math.min(1, (now - tween.t0) / tween.ms);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const { from, to } = tween;
    centreOn(camera, from.cx + (to.cx - from.cx) * e, from.cy + (to.cy - from.cy) * e, from.s * (to.s / from.s) ** e);
    if (k >= 1) tween = null;
  }

  function overlay(ctx, cam, t) {
    const now = performance.now();
    if (hint) {
      const age = (now - hint.t0) / 1000;
      if (age > 6) hint = null;
      else {
        const alpha = age < 5 ? 1 : 6 - age;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = -t * 30;
        ctx.lineWidth = Math.max(3, 4 / cam.scale);
        ctx.strokeStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(hint.x, hint.y, hint.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,210,63,0.08)';
        ctx.fill();
        ctx.restore();
      }
    }
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      const age = (now - m.t0) / 1000;
      if (age > 1.2) {
        markers.splice(i, 1);
        continue;
      }
      const r = (10 + age * 30) / cam.scale;
      ctx.save();
      ctx.globalAlpha = 1 - age / 1.2;
      ctx.lineWidth = 3 / cam.scale;
      ctx.strokeStyle = m.person ? '#ff5a5f' : '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (m.person) {
        const s = 8 / cam.scale;
        ctx.beginPath();
        ctx.moveTo(m.x - s, m.y - s);
        ctx.lineTo(m.x + s, m.y + s);
        ctx.moveTo(m.x + s, m.y - s);
        ctx.lineTo(m.x - s, m.y + s);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (state === 'found') {
      const w = world.wiggles;
      const pulse = 1 + Math.sin(t * 6) * 0.08;
      ctx.save();
      ctx.lineWidth = Math.max(2.5, 4 / cam.scale);
      ctx.strokeStyle = '#ffd23f';
      ctx.shadowColor = 'rgba(255,210,63,0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(w.x, w.y - 24, 26 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      for (const p of confetti) {
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillRect(-2, -1, 4, 2);
        ctx.restore();
      }
    }
    if (crosshair && state === 'running') {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = canvas.width / cam.viewW;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * dpr;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 16 * dpr, 0, Math.PI * 2);
      ctx.moveTo(cx - 26 * dpr, cy);
      ctx.lineTo(cx - 8 * dpr, cy);
      ctx.moveTo(cx + 8 * dpr, cy);
      ctx.lineTo(cx + 26 * dpr, cy);
      ctx.moveTo(cx, cy - 26 * dpr);
      ctx.lineTo(cx, cy - 8 * dpr);
      ctx.moveTo(cx, cy + 8 * dpr);
      ctx.lineTo(cx, cy + 26 * dpr);
      ctx.stroke();
      ctx.restore();
    }
  }

  function loop(now) {
    if (state === 'destroyed') return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state === 'running') {
      elapsed += dt * 1000;
      world.update(dt * speed);
    } else if (state === 'found' || state === 'ready') {
      world.update(dt * speed);
      for (const p of confetti) {
        p.vy += 260 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
      }
    }
    stepTween(now);
    renderer.render(camera, world.time, overlay);
    if (state !== 'paused') frame = requestAnimationFrame(loop);
  }

  function guessAt(sx, sy) {
    if (state !== 'running') return;
    const p = screenToWorld(camera, sx, sy);
    const tolerance = Math.min(22, 9 / camera.scale);
    if (world.isWigglesAt(p.x, p.y, tolerance)) {
      found();
      return;
    }
    const person = world.agentAt(p.x, p.y, Math.min(6, 4 / camera.scale));
    markers.push({ x: p.x, y: p.y, t0: performance.now(), person: Boolean(person) });
    if (person) misses++;
    onGuess?.({ person, misses });
  }

  function found() {
    state = 'found';
    const w = world.wiggles;
    if (w.poi) w.poi.occupants = Math.max(0, w.poi.occupants - 1);
    w.queue?.leave(w);
    Object.assign(w, { state: 'fixed', mode: 'stand', dir: 'down', action: 'wave', fixedActions: ['wave'], path: null, poi: null, queue: null, sortBias: 0 });
    const colours = ['#ffd23f', '#ff6fb5', '#3bceac', '#5b8def', '#e98a3a', '#8b5cc7'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 140;
      confetti.push({ x: w.x, y: w.y - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, c: colours[i % colours.length] });
    }
    // Frame him in the upper part of the screen; the results card docks at the bottom.
    const target = Math.max(camera.scale, Math.min(3, camera.maxScale));
    tweenCamera(w.x, w.y - 20 + (camera.viewH * 0.24) / target, target, 900);
    navigator.vibrate?.(60);
    setTimeout(() => {
      if (state === 'found') onFound?.({ timeMs: elapsed, misses, hintsUsed });
    }, FOUND_DELAY_MS);
  }

  const input = attachInput(canvas, camera, {
    onTap: guessAt,
    onInteract: () => {
      tween = null;
      crosshair = false;
    },
  });

  function onKey(e) {
    if (state !== 'running') return;
    const step = 80;
    const k = e.key;
    let handled = true;
    if (k === 'ArrowLeft' || k === 'a') panBy(camera, step, 0);
    else if (k === 'ArrowRight' || k === 'd') panBy(camera, -step, 0);
    else if (k === 'ArrowUp' || k === 'w') panBy(camera, 0, step);
    else if (k === 'ArrowDown' || k === 's') panBy(camera, 0, -step);
    else if (k === '+' || k === '=') zoomAt(camera, camera.viewW / 2, camera.viewH / 2, 1.3);
    else if (k === '-' || k === '_') zoomAt(camera, camera.viewW / 2, camera.viewH / 2, 1 / 1.3);
    else if (k === 'Enter' || k === ' ') guessAt(camera.viewW / 2, camera.viewH / 2);
    else handled = false;
    if (handled) {
      crosshair = true;
      tween = null;
      e.preventDefault();
    }
  }
  canvas.addEventListener('keydown', onKey);

  function onVisibility() {
    if (document.hidden && state === 'running') onAutoPause?.();
  }
  document.addEventListener('visibilitychange', onVisibility);

  frame = requestAnimationFrame(loop);

  return {
    world,
    camera,
    get state() {
      return state;
    },
    get elapsed() {
      return elapsed;
    },
    get stats() {
      return { timeMs: elapsed, misses, hintsUsed };
    },
    start() {
      if (state === 'ready') state = 'running';
      canvas.focus({ preventScroll: true });
    },
    pause() {
      if (state !== 'running') return;
      state = 'paused';
      cancelAnimationFrame(frame);
    },
    resume() {
      if (state !== 'paused') return;
      state = 'running';
      last = performance.now();
      frame = requestAnimationFrame(loop);
      canvas.focus({ preventScroll: true });
    },
    zoomBy(factor) {
      tween = null;
      zoomAt(camera, camera.viewW / 2, camera.viewH / 2, factor);
    },
    /** Returns false while the hint is cooling down. */
    hint() {
      if (state !== 'running') return false;
      const now = performance.now();
      if (now - lastHintAt < HINT_COOLDOWN_MS) return false;
      lastHintAt = now;
      hintsUsed++;
      const w = world.wiggles;
      const base = Math.min(world.width, world.height) * 0.32;
      const r = Math.max(70, base / (1 + (hintsUsed - 1) * 0.8));
      const a = Math.random() * Math.PI * 2;
      const off = Math.random() * r * 0.55;
      hint = { x: w.x + Math.cos(a) * off, y: w.y - 20 + Math.sin(a) * off, r, t0: now };
      const fit = Math.min(camera.viewW, camera.viewH) / (r * 2.6);
      tweenCamera(hint.x, hint.y, Math.max(camera.minScale, Math.min(fit, camera.maxScale)), 800);
      return true;
    },
    hintCooldownLeft() {
      return Math.max(0, HINT_COOLDOWN_MS - (performance.now() - lastHintAt));
    },
    destroy() {
      state = 'destroyed';
      cancelAnimationFrame(frame);
      input.detach();
      resizeObserver.disconnect();
      canvas.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
