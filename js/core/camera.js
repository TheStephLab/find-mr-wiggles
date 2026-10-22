/**
 * Pure-ish 2D camera maths. `x`/`y` are the world coordinates at the top-left
 * of the viewport and `scale` is CSS pixels per world unit.
 */
export const MAX_SCALE = 6;

export function createCamera({ viewW, viewH, worldW, worldH }) {
  const cam = { x: 0, y: 0, scale: 1, viewW, viewH, worldW, worldH, minScale: 1, maxScale: MAX_SCALE };
  updateLimits(cam);
  cam.scale = cam.minScale;
  return clampCamera(cam);
}

export function fitScale(viewW, viewH, worldW, worldH) {
  return Math.min(viewW / worldW, viewH / worldH);
}

function updateLimits(cam) {
  cam.minScale = fitScale(cam.viewW, cam.viewH, cam.worldW, cam.worldH);
  cam.maxScale = Math.max(MAX_SCALE, cam.minScale * 2);
}

/** Keep the world on screen: centre it when smaller than the view, otherwise clamp edges. */
export function clampCamera(cam) {
  cam.scale = Math.min(cam.maxScale, Math.max(cam.minScale, cam.scale));
  const visW = cam.viewW / cam.scale;
  const visH = cam.viewH / cam.scale;
  cam.x = visW >= cam.worldW ? (cam.worldW - visW) / 2 : Math.min(cam.worldW - visW, Math.max(0, cam.x));
  cam.y = visH >= cam.worldH ? (cam.worldH - visH) / 2 : Math.min(cam.worldH - visH, Math.max(0, cam.y));
  return cam;
}

export function screenToWorld(cam, sx, sy) {
  return { x: cam.x + sx / cam.scale, y: cam.y + sy / cam.scale };
}

export function worldToScreen(cam, wx, wy) {
  return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
}

/** Zoom by `factor`, keeping the world point under screen point (sx, sy) fixed. */
export function zoomAt(cam, sx, sy, factor) {
  const anchor = screenToWorld(cam, sx, sy);
  cam.scale = Math.min(cam.maxScale, Math.max(cam.minScale, cam.scale * factor));
  cam.x = anchor.x - sx / cam.scale;
  cam.y = anchor.y - sy / cam.scale;
  return clampCamera(cam);
}

/** Set an absolute scale while pinning a world point to a screen point (used by pinch). */
export function pinTo(cam, worldPoint, sx, sy, scale) {
  cam.scale = Math.min(cam.maxScale, Math.max(cam.minScale, scale));
  cam.x = worldPoint.x - sx / cam.scale;
  cam.y = worldPoint.y - sy / cam.scale;
  return clampCamera(cam);
}

export function panBy(cam, dxScreen, dyScreen) {
  cam.x -= dxScreen / cam.scale;
  cam.y -= dyScreen / cam.scale;
  return clampCamera(cam);
}

export function centreOn(cam, wx, wy, scale = cam.scale) {
  cam.scale = Math.min(cam.maxScale, Math.max(cam.minScale, scale));
  cam.x = wx - cam.viewW / cam.scale / 2;
  cam.y = wy - cam.viewH / cam.scale / 2;
  return clampCamera(cam);
}

/** Resize the viewport, keeping the same world point centred. */
export function resizeCamera(cam, viewW, viewH) {
  const centre = screenToWorld(cam, cam.viewW / 2, cam.viewH / 2);
  const wasFitted = cam.scale <= cam.minScale * 1.0001;
  cam.viewW = viewW;
  cam.viewH = viewH;
  updateLimits(cam);
  if (wasFitted) cam.scale = cam.minScale;
  return centreOn(cam, centre.x, centre.y);
}

export function visibleRect(cam, pad = 0) {
  return {
    x: cam.x - pad,
    y: cam.y - pad,
    w: cam.viewW / cam.scale + pad * 2,
    h: cam.viewH / cam.scale + pad * 2,
  };
}
