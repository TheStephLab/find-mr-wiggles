/**
 * One-point perspective for a tilted camera looking across the scene.
 *
 * World space is a ground plan: x across, y depth (0 = far, H = near), z height.
 * Picture space is the flat "painting" the camera pans and zooms over.
 *   s(y)  scale at depth y (1 at the near edge, sFar at the far edge)
 *   X     converges towards the centre line as things get further away
 *   Y     ground rows are foreshortened (by `tilt` at the near edge, more further back)
 * Heights (z) are drawn at full size × s(y), so people and props stand upright.
 */
export function createProjection({ width, height, sFar = 0.64, tilt = 0.86, topPad = 200, bottomPad = 24 }) {
  const W = width;
  const H = height;
  const cx = W / 2;
  const k = (1 / sFar - 1) / H;
  const D = tilt / k;
  const s = (y) => 1 / (1 + (H - y) * k);
  const groundY = (y) => topPad + D * (s(y) - sFar);

  return {
    W,
    H,
    cx,
    sFar,
    tilt,
    topPad,
    width: W,
    height: Math.ceil(groundY(H) + bottomPad),
    s,
    X: (x, y) => cx + (x - cx) * s(y),
    Y: (y, z = 0) => groundY(y) - z * s(y),
    pt: (x, y, z = 0) => {
      const sc = s(y);
      return [cx + (x - cx) * sc, groundY(y) - z * sc];
    },
    /** World depth y whose ground (at height z) projects to picture row py. */
    yAt(py, z = 0) {
      const sc = (py - topPad + D * sFar) / (D - z);
      return H - (1 / Math.max(1e-6, sc) - 1) / k;
    },
    xAt: (px, y) => cx + (px - cx) / s(y),
  };
}

/** Picture-space bounding rect of a 3D box {x, y, w, d, h, z}. */
export function projectBox(P, { x, y, w, d = 0, h = 0, z = 0 }, pad = 0) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const yy of [y, y + d]) {
    for (const xx of [x, x + w]) {
      for (const zz of [z, z + h]) {
        const [px, py] = P.pt(xx, yy, zz);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}
