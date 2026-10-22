import { panBy, zoomAt, pinTo, screenToWorld } from '../core/camera.js';

const TAP_SLOP = 9; // px a finger may wander and still count as a tap
const TAP_TIME = 600; // ms

/**
 * Unified mouse/touch/pen input via Pointer Events:
 *  - one pointer drags to pan (with a little inertia)
 *  - two pointers pinch-zoom around their midpoint
 *  - a short, still press is a tap
 *  - mouse wheel / trackpad pinch zooms at the cursor
 */
export function attachInput(el, camera, { onTap, onInteract } = {}) {
  const pointers = new Map();
  let gesture = null;
  let tap = null;
  let velocity = { x: 0, y: 0 };
  let lastMoveAt = 0;
  let inertiaFrame = 0;

  const local = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

  function stopInertia() {
    cancelAnimationFrame(inertiaFrame);
    inertiaFrame = 0;
  }

  function startInertia() {
    stopInertia();
    const step = () => {
      velocity.x *= 0.9;
      velocity.y *= 0.9;
      if (Math.hypot(velocity.x, velocity.y) < 0.3) return;
      panBy(camera, velocity.x, velocity.y);
      inertiaFrame = requestAnimationFrame(step);
    };
    inertiaFrame = requestAnimationFrame(step);
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()];
    const m = mid(a, b);
    gesture = { type: 'pinch', startDist: dist(a, b), startScale: camera.scale, anchor: screenToWorld(camera, m.x, m.y) };
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    stopInertia();
    onInteract?.(e.pointerType);
    if (pointers.size === 1) {
      tap = { ...p, time: performance.now(), id: e.pointerId };
      gesture = { type: 'pan' };
      velocity = { x: 0, y: 0 };
    } else if (pointers.size === 2) {
      tap = null;
      beginPinch();
    }
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_SLOP) tap = null;
    if (gesture?.type === 'pan' && pointers.size === 1 && !tap) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      panBy(camera, dx, dy);
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveAt);
      velocity = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
      lastMoveAt = now;
    } else if (gesture?.type === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const m = mid(a, b);
      pinTo(camera, gesture.anchor, m.x, m.y, (gesture.startScale * dist(a, b)) / gesture.startDist);
    }
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && tap && tap.id === e.pointerId && performance.now() - tap.time < TAP_TIME) {
      onTap?.(tap.x, tap.y);
    }
    tap = null;
    if (pointers.size === 1) {
      gesture = { type: 'pan' };
    } else if (pointers.size >= 2) {
      beginPinch();
    } else {
      if (gesture?.type === 'pan' && performance.now() - lastMoveAt < 60) startInertia();
      gesture = null;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    stopInertia();
    const p = local(e);
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 400;
    zoomAt(camera, p.x, p.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)));
    onInteract?.('mouse');
  }

  const prevent = (e) => e.preventDefault();
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('lostpointercapture', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('gesturestart', prevent);
  el.addEventListener('gesturechange', prevent);
  el.addEventListener('contextmenu', prevent);

  return {
    detach() {
      stopInertia();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('lostpointercapture', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('gesturestart', prevent);
      el.removeEventListener('gesturechange', prevent);
      el.removeEventListener('contextmenu', prevent);
    },
  };
}
