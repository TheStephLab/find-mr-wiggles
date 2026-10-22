import { addKiosk, addBench, addPlant, addPillar, addBin, addMachine, scatter, addSignPosts } from './builders.js';
import { tiles, gridLines, box, text, clockFace, lampPost3d, createPigeons, frontWall, infoDesk3d, OUT, shade, rrect } from './props.js';
import { drawBox, onFront, sideQuad, poly } from './draw3d.js';
import { projectBox } from '../core/projection.js';

const DESTINATIONS = ['Puddleford', 'Gigglewick', 'Mumbleton-on-Sea', 'Wobblecombe', 'Snoringham', 'Fizzbury Parkway', 'Little Dithering', 'Bramblemoor', 'Kettlewhistle', 'Upper Noodleby', 'Dozy Hollow', 'Crumbleton', 'Wigglesworth Bay'];
const LIVERIES = [
  { roof: '#2f7d4f', stripe: '#f2e3b3', front: '#f2c230' },
  { roof: '#b3343c', stripe: '#f5f0e6', front: '#f2c230' },
  { roof: '#2b4f8c', stripe: '#9fd3f0', front: '#f2c230' },
  { roof: '#6a3d8f', stripe: '#f2c94c', front: '#f2c230' },
];
const E = 56; // height of the raised concourse above the metro hall
const WALL = 170;

export const trainStation = {
  id: 'whistlebury-junction',
  title: 'Whistlebury Junction',
  kind: 'Train station',
  blurb: 'Whistles, suitcases and a very busy departures board.',
  aspect: 1.15,
  crowdFactor: 1,
  thumbColour: '#2f7d4f',
  view: { topPad: 210, bottomPad: 34 },
  build(kit) {
    const { W, H, rng, P } = kit;
    kit.background = '#3a3540';
    const bufferY = Math.round(H * 0.34);
    const divTop = Math.round(H * 0.7);
    const divBot = divTop + 46;
    const metroEdge = H - 80;
    kit.defineLevel('concourse', { x: 0, y: 0, w: W, h: divTop }, { z: E });
    kit.defineLevel('metro', { x: 0, y: divTop, w: W, h: H - divTop }, { z: 0 });
    kit.roles = [
      { role: 'commuter', weight: 5 },
      { role: 'traveller', weight: 3 },
      { role: 'tourist', weight: 1.5 },
      { role: 'child', weight: 1.2 },
      { role: 'elderly', weight: 0.8 },
      { role: 'jogger', weight: 0.25 },
      { role: 'staff', uniform: 'rail', weight: 0.25 },
      { role: 'staff', uniform: 'cleaner', weight: 0.2 },
    ];

    // ---------------------------------------------------------- platforms & tracks
    const nT = Math.max(3, Math.floor((W - 120) / 230));
    const trackW = 60;
    const platW = (W - 80 - nT * trackW) / (nT + 1);
    const tracks = [];
    const platforms = [];
    let cx = 40;
    for (let i = 0; i <= nT; i++) {
      platforms.push({ x: cx, w: platW });
      cx += platW;
      if (i < nT) {
        tracks.push({ x: cx, w: trackW });
        cx += trackW;
      }
    }

    kit.backdrop = (ctx) => stationBackdrop(ctx, P, W, H, divTop, tracks);

    kit.addFloor({ x: 0, y: 0, w: W, h: bufferY }, (ctx, view) => {
      ctx.fillStyle = '#8a7d6b';
      ctx.fillRect(0, 0, W, bufferY);
      for (const p of platforms) {
        ctx.fillStyle = '#d4cdbf';
        ctx.fillRect(p.x, 0, p.w, bufferY);
        gridLines(ctx, { x: p.x, y: 0, w: p.w, h: bufferY }, 30, 'rgba(0,0,0,0.06)', view);
        ctx.fillStyle = '#f2c230';
        ctx.fillRect(p.x + 3, 0, 4, bufferY);
        ctx.fillRect(p.x + p.w - 7, 0, 4, bufferY);
      }
      for (const t of tracks) {
        ctx.fillStyle = '#4e463d';
        ctx.fillRect(t.x, 0, t.w, bufferY);
        ctx.fillStyle = '#5a4634';
        for (let y = Math.max(0, Math.floor(view.y / 12) * 12); y < Math.min(bufferY, view.y + view.h); y += 12) ctx.fillRect(t.x + 6, y, t.w - 12, 5);
        ctx.fillStyle = '#b9bec4';
        ctx.fillRect(t.x + 15, 0, 3, bufferY);
        ctx.fillRect(t.x + t.w - 18, 0, 3, bufferY);
      }
    });

    tracks.forEach((t, i) => {
      kit.block({ x: t.x - 2, y: 0, w: t.w + 4, h: bufferY + 2 });
      kit.addDynamic(createTrain(rng, P, t, bufferY, LIVERIES[i % LIVERIES.length]));
      const bx = t.x + 8;
      const by = bufferY - 14;
      kit.addProp({
        y: bufferY,
        box: { x: bx, y: by, w: t.w - 16, d: 14, h: 18, z: E },
        draw: (ctx) => {
          drawBox(ctx, P, { x: bx, y: by, w: t.w - 16, d: 14, h: 14, z: E - 4 }, { front: '#c0392b' });
          onFront(ctx, P, bx, bufferY, E - 4, (c) => {
            c.fillStyle = '#fff';
            for (let k = 0; k < 3; k++) c.fillRect(6 + k * 12, -12, 6, 8);
            text(c, String(i + 1), (t.w - 16) / 2, -26, { size: 14, colour: 'rgba(255,255,255,0.85)' });
          });
        },
      });
    });

    // ---------------------------------------------------------- concourse floor + metro hall
    kit.addFloor({ x: 0, y: bufferY, w: W, h: divTop - bufferY }, (ctx, view) => {
      tiles(ctx, { x: 0, y: bufferY, w: W, h: divTop - bufferY }, 40, '#ece3cf', '#e0d4ba', view);
      ctx.fillStyle = '#7d6f5d';
      ctx.fillRect(0, bufferY, W, 5);
    });
    kit.addFloor({ x: 0, y: divTop, w: W, h: H - divTop }, (ctx, view) => {
      ctx.fillStyle = '#6f6253';
      ctx.fillRect(0, divTop, W, divBot - divTop);
      tiles(ctx, { x: 0, y: divBot, w: W, h: metroEdge - divBot }, 32, '#cfd8de', '#c2ccd3', view);
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, metroEdge - 8, W, 8);
      ctx.fillStyle = '#d2a514';
      for (let x = 4; x < W; x += 8) ctx.fillRect(x, metroEdge - 6, 3, 3);
      ctx.fillStyle = '#2b2826';
      ctx.fillRect(0, metroEdge, W, H - metroEdge);
      ctx.fillStyle = '#5a4634';
      for (let x = Math.max(0, Math.floor(view.x / 12) * 12); x < Math.min(W, view.x + view.w); x += 12) ctx.fillRect(x, metroEdge + 30, 5, 34);
      ctx.fillStyle = '#b9bec4';
      ctx.fillRect(0, metroEdge + 36, W, 3);
      ctx.fillRect(0, metroEdge + 56, W, 3);
    });
    kit.addDynamic(createMetro(rng, P, W, metroEdge, H));

    // ---------------------------------------------------------- the drop between levels
    const pairs = W > 2600 ? [0.17, 0.5, 0.83] : [0.2, 0.8];
    const gaps = [];
    for (const f of pairs) {
      const x = Math.round(W * f);
      kit.escalator({ x: x - 20, yTop: divTop - 44, yBottom: divBot + 40, dir: 'up' });
      kit.escalator({ x: x + 20, yTop: divTop - 44, yBottom: divBot + 40, dir: 'down' });
      gaps.push([x - 39, x + 39]);
      kit.block({ x: x - 44, y: divTop - 50, w: 88, h: divBot - divTop + 96 });
    }
    kit.block({ x: 0, y: divTop - 16, w: W, h: divBot - divTop + 16 });
    const ads = Array.from({ length: Math.ceil(W / 300) }, () => rng.pick(['Wobble Jelly!', 'Fizzbury Pop', 'Snooze Beds', 'Crumb Cakes', 'Visit Puddleford', 'Ride the Kestrel']));
    kit.addProp({
      y: divTop,
      box: { x: 0, y: divTop - 2, w: W, d: 4, h: E + 28, z: 0 },
      draw: (ctx) => {
        frontWall(ctx, P, 0, W, divTop, 0, E, '#8f8170', gaps);
        onFront(ctx, P, 0, divTop, 0, (c) => {
          c.strokeStyle = 'rgba(0,0,0,0.12)';
          c.lineWidth = 1;
          c.beginPath();
          for (let z = 8; z < E; z += 8) {
            c.moveTo(0, -z);
            c.lineTo(W, -z);
          }
          c.stroke();
          ads.forEach((label, i) => {
            const ax = 110 + i * 300;
            if (ax + 80 > W || gaps.some(([g0, g1]) => ax + 80 > g0 && ax < g1)) return;
            box(c, ax, -E + 10, 80, 34, '#f5efe0', OUT, 1, 2);
            text(c, label, ax + 40, -E + 27, { size: 9, colour: '#b3343c', maxWidth: 72 });
          });
        });
        glassRail(ctx, P, 0, W, divTop, E, gaps);
      },
    });

    // ---------------------------------------------------------- concourse features
    const conTop = bufferY + 30;
    const conRect = { x: 60, y: conTop + 40, w: W - 120, h: divTop - 80 - conTop - 40 };

    const bw = Math.min(420, W * 0.22);
    const bx = W / 2 - bw / 2;
    const by = bufferY + 110;
    kit.addProp({
      y: by,
      box: { x: bx - 4, y: by - 4, w: bw + 8, d: 8, h: 126, z: E },
      draw: (ctx, t) => onFront(ctx, P, bx, by, E, (c) => departuresBoard(c, bw, t)),
      solid: { x: bx, y: by, w: bw, d: 0, h: 78, z: E + 44 },
    });
    kit.block({ x: bx, y: by - 6, w: 8, h: 8 });
    kit.block({ x: bx + bw - 8, y: by - 6, w: 8, h: 8 });
    for (let i = 0; i < kit.count(7, 4); i++) {
      kit.poi({ x: bx + 20 + rng.range(0, bw - 40), y: by + 25 + rng.range(0, 45), facing: 'up', actions: [null, null, 'phone'], duration: [5, 14], weight: 1.4 });
    }

    const clockX = W / 2;
    const clockY = Math.round(bufferY + (divTop - bufferY) * 0.6);
    kit.addProp({
      y: clockY,
      box: { x: clockX - 20, y: clockY - 6, w: 40, d: 8, h: 132, z: E },
      draw: (ctx) => onFront(ctx, P, clockX, clockY, E, (c) => clockPost(c)),
      solid: { x: clockX - 4, y: clockY, w: 8, d: 0, h: 100, z: E },
    });
    kit.block({ x: clockX - 8, y: clockY - 6, w: 16, h: 8 });
    for (const [dx, dy, facing] of [[-30, 6, 'right'], [30, 6, 'left'], [0, 26, 'up'], [-22, 24, 'up'], [24, 22, 'up']]) {
      kit.poi({ x: clockX + dx, y: clockY + dy, facing, actions: ['phone', 'wave', null, null], duration: [6, 18], weight: 1.3 });
    }

    const catalogue = rng.shuffle([
      { name: 'Crumbs Bakery', colour: '#a0522d', colour2: '#f2c94c', goods: 'bread', keeper: 'chef' },
      { name: 'Bean There', colour: '#5a3a26', colour2: '#e0b07a', goods: 'coffee', keeper: 'barista', queue: true },
      { name: 'Petal Pushers', colour: '#3f8f4a', colour2: '#f28ab2', goods: 'flowers', keeper: 'shop' },
      { name: 'Paper Trail', colour: '#2b4f8c', colour2: '#e9e2d0', goods: 'news', keeper: 'shop' },
      { name: 'Sweet Tooth', colour: '#c9476e', colour2: '#ffd1e3', goods: 'sweets', keeper: 'shop' },
      { name: 'Choo Choo Toys', colour: '#d9822b', colour2: '#ffe08a', goods: 'sweets', keeper: 'shop' },
    ]);
    const shops = [{ name: 'Tickets', colour: '#20385e', colour2: '#ff8a1f', goods: 'news', keeper: 'rail', queue: true }, ...catalogue].slice(0, Math.min(7, kit.count(5, 3) + 1));
    const rows = [bufferY + 135, divTop - 170];
    for (const shop of shops) {
      const w = 96;
      const d = 34;
      for (let attempt = 0; attempt < 60; attempt++) {
        const y = rng.pick(rows) + rng.range(-8, 8);
        const x = rng.range(70, W - 70 - w);
        const footprint = { x: x - 30, y: y - 70, w: w + 60, h: d + (shop.queue ? 140 : 70) };
        if (!kit.isFree(footprint, 10)) continue;
        addKiosk(kit, { x, y, w, d, ...shop, customers: shop.queue ? 2 : 3 });
        break;
      }
    }

    scatter(kit, conRect, 1, 60, 70, (x, y) => {
      const px = x + 10;
      const py = y + 30;
      kit.addProp({ y: py, box: { x: px - 2, y: py - 14, w: 44, d: 16, h: 44, z: E }, draw: (ctx) => piano3d(ctx, P, px, py, E), solid: { x: px, y: py, w: 40, d: 0, h: 32, z: E } });
      kit.block({ x: px, y: py - 14, w: 40, h: 16 });
      kit.poi({ x: px + 20, y: py + 12, mode: 'sit', facing: 'up', actions: ['piano'], duration: [12, 30], weight: 1.6 });
      kit.poi({ x: px - 14, y: py + 20, facing: 'right', actions: ['clap', null], duration: [6, 14] });
      kit.poi({ x: px + 54, y: py + 20, facing: 'left', actions: ['clap', null], duration: [6, 14] });
    });
    scatter(kit, conRect, 1, 80, 70, (x, y) => {
      const mx = x + 40;
      const my = y + 20;
      kit.station({ x: mx, y: my, uniform: 'musician', dir: 'down', action: 'guitar', fixedActions: ['guitar'] });
      kit.addFloor({ x: mx - 20, y: my + 6, w: 40, h: 16 }, (ctx) => {
        box(ctx, mx - 16, my + 8, 32, 11, '#3a2a1e', OUT, 0.8, 4);
        ctx.fillStyle = '#8a1f2b';
        ctx.fillRect(mx - 13, my + 10, 26, 7);
        ctx.fillStyle = '#f2c94c';
        for (let i = 0; i < 4; i++) ctx.fillRect(mx - 10 + i * 6, my + 12, 2.4, 2.4);
      });
      kit.block({ x: mx - 16, y: my - 4, w: 32, h: 22 });
      for (let i = 0; i < 4; i++) kit.poi({ x: mx - 36 + i * 24, y: my + 52 + (i % 2) * 8, facing: 'up', actions: ['clap', null, 'wave'], duration: [6, 16], weight: 1.2 });
    });
    scatter(kit, conRect, 1, 70, 60, (x, y) => {
      const ix = x + 35;
      const iy = y + 30;
      kit.station({ x: ix, y: iy - 22, uniform: 'rail', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.addProp({ y: iy, box: { x: ix - 32, y: iy - 16, w: 64, d: 18, h: 84, z: E }, draw: (ctx) => infoDesk3d(ctx, P, ix, iy, E, '#20385e', '#1f7ad1', 'i'), solid: { x: ix - 30, y: iy, w: 60, d: 0, h: 20, z: E } });
      kit.block({ x: ix - 30, y: iy - 14, w: 60, h: 16 });
      kit.poi({ x: ix - 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
      kit.poi({ x: ix + 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
    });
    scatter(kit, conRect, 1, 40, 40, (x, y) => {
      const fx = x;
      const fy = y + 36;
      kit.addProp({ y: fy, box: { x: fx - 2, y: fy - 26, w: 40, d: 28, h: 70, z: E }, draw: (ctx) => photoBooth3d(ctx, P, fx, fy, E), solid: { x: fx, y: fy, w: 36, d: 0, h: 66, z: E } });
      kit.block({ x: fx, y: fy - 24, w: 36, h: 25 });
    });

    scatter(kit, conRect, kit.count(3, 2), 30, 20, (x, y) => addMachine(kit, x, y + 16, { colour: '#20385e', screen: '#9fe0ff' }));
    scatter(kit, conRect, kit.count(6, 2), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: rng.chance(0.6) ? 'down' : 'up' }));
    scatter(kit, conRect, kit.count(5, 2), 24, 24, (x, y) => addPillar(kit, x + 12, y + 12, 140, 20, '#d9cfbb'));
    scatter(kit, conRect, kit.count(6, 2), 24, 18, (x, y) => addPlant(kit, x + 12, y + 10, rng.range(0.8, 1.1)));
    scatter(kit, conRect, kit.count(5, 2), 14, 12, (x, y) => addBin(kit, x + 7, y + 8));
    for (let i = 0; i < kit.count(2, 1); i++) {
      kit.addDynamic(createPigeons(rng, P, rng.range(conRect.x + 60, conRect.x + conRect.w - 60), rng.range(conRect.y + 20, conRect.y + conRect.h - 20), rng.int(4, 7), 50, E));
    }

    // ---------------------------------------------------------- platform furniture
    platforms.forEach((p, i) => {
      if (p.w < 60) return;
      const mid = p.x + p.w / 2;
      addSignPosts(kit, p.x + 12, bufferY - 6, p.w - 24, `Platform ${i + 1}`, { colour: '#20385e' });
      for (let y = 90; y < bufferY - 60; y += 150) {
        kit.addProp({ y, box: { x: mid - 8, y: y - 4, w: 16, d: 6, h: 86, z: E }, draw: (ctx) => lampPost3d(ctx, P, mid, y, 74, '#2f5a46', E) });
        kit.block({ x: mid - 3, y: y - 3, w: 6, h: 4 });
      }
      for (let b = 0; b < kit.count(1.2, 1); b++) {
        const y = rng.range(70, bufferY - 70);
        if (kit.isFree({ x: mid - 23, y: y - 14, w: 46, h: 14 }, 6)) addBench(kit, { x: mid - 23, y, facing: 'down', wood: '#2f5a46' });
      }
      for (let k = 0; k < kit.count(5, 2); k++) {
        const left = rng.chance(0.5);
        const x = left ? p.x + 22 : p.x + p.w - 22;
        const facing = left ? (i === 0 ? 'right' : 'left') : i === platforms.length - 1 ? 'left' : 'right';
        kit.poi({ x, y: rng.range(40, bufferY - 30), facing, actions: [null, 'phone', 'read', null], duration: [8, 25], weight: 1.1 });
      }
    });

    // ---------------------------------------------------------- metro hall
    const metroRect = { x: 60, y: divBot + 50, w: W - 120, h: metroEdge - 40 - divBot - 50 };
    scatter(kit, { x: 60, y: divBot + 20, w: W - 120, h: 20 }, kit.count(4, 2), 50, 16, (x, y) => addBench(kit, { x, y: y + 14, facing: 'down', wood: '#3a6ea5' }));
    scatter(kit, metroRect, kit.count(2, 1), 30, 20, (x, y) => addMachine(kit, x, y + 16, { colour: '#c0392b', screen: '#ffe08a', label: 'SNACKS' }));
    scatter(kit, metroRect, kit.count(3, 1), 22, 22, (x, y) => addPillar(kit, x + 11, y + 11, 100, 18, '#9fb3c8'));
    for (let k = 0; k < kit.count(10, 4); k++) {
      kit.poi({ x: rng.range(60, W - 60), y: metroEdge - 14, facing: 'down', actions: [null, 'phone', 'read'], duration: [8, 22], weight: 1 });
    }

    // ---------------------------------------------------------- walkable grids
    kit.grid({ x: 50, y: 30, w: W - 100, h: divTop - 40 - 30 }, 60);
    kit.grid({ x: 50, y: divBot + 30, w: W - 100, h: metroEdge - 20 - divBot - 30 }, 56);
  },
};

// ------------------------------------------------------------------ drawings
function stationBackdrop(ctx, P, W, H, divTop, tracks) {
  const top = E + WALL;
  // back wall with the station name, a clock and tunnel mouths
  poly(ctx, [P.pt(0, 0, E - 20), P.pt(W, 0, E - 20), P.pt(W, 0, top), P.pt(0, 0, top)], '#a8644a', OUT, 1);
  onFront(ctx, P, 0, 0, E, (c) => {
    c.strokeStyle = 'rgba(60,20,10,0.18)';
    c.lineWidth = 1;
    c.beginPath();
    for (let z = 10; z < WALL; z += 10) {
      c.moveTo(0, -z);
      c.lineTo(W, -z);
    }
    c.stroke();
    for (const t of tracks) {
      c.fillStyle = '#1b1715';
      c.beginPath();
      c.moveTo(t.x + 4, 20);
      c.lineTo(t.x + 4, -34);
      c.arc(t.x + t.w / 2, -34, t.w / 2 - 4, Math.PI, 0);
      c.lineTo(t.x + t.w - 4, 20);
      c.fill();
    }
    for (let x = 140; x < W - 140; x += 260) {
      if (Math.abs(x - W / 2) < 260) continue;
      c.fillStyle = '#cfe7f2';
      c.beginPath();
      c.moveTo(x - 40, -70);
      c.lineTo(x - 40, -130);
      c.arc(x, -130, 40, Math.PI, 0);
      c.lineTo(x + 40, -70);
      c.fill();
      c.strokeStyle = '#5b3a2a';
      c.lineWidth = 3;
      c.stroke();
      c.beginPath();
      c.moveTo(x, -70);
      c.lineTo(x, -170);
      c.moveTo(x - 40, -110);
      c.lineTo(x + 40, -110);
      c.stroke();
    }
    box(c, W / 2 - 230, -150, 460, 46, '#20385e', OUT, 2, 6);
    text(c, 'WHISTLEBURY JUNCTION', W / 2, -127, { size: 30, colour: '#f2c94c' });
    c.save();
    c.translate(W / 2, -68);
    clockFace(c, 0, 0, 26);
    c.restore();
  });
  // side walls with tall windows
  for (const x of [0, W]) {
    poly(ctx, [P.pt(x, 0, E - 20), P.pt(x, divTop, E), P.pt(x, divTop, 0), P.pt(x, H, 0), P.pt(x, H, top), P.pt(x, 0, top)], '#94573f', OUT, 1);
    for (let y = 80; y < H - 60; y += 170) {
      const z0 = (y < divTop ? E : 0) + 40;
      sideQuad(ctx, P, x, y, y + 90, z0, top - 20, '#bfdbe6', '#5b3a2a', 1.5);
    }
  }
}

function glassRail(ctx, P, x0, x1, y, z, gaps) {
  let cursor = x0;
  for (const [g0, g1] of [...gaps, [x1, x1]]) {
    if (g0 > cursor) {
      poly(ctx, [P.pt(cursor, y, z), P.pt(g0, y, z), P.pt(g0, y, z + 22), P.pt(cursor, y, z + 22)], 'rgba(170,215,235,0.35)', null);
      poly(ctx, [P.pt(cursor, y, z + 22), P.pt(g0, y, z + 22), P.pt(g0, y, z + 25), P.pt(cursor, y, z + 25)], '#6b6f75', null);
    }
    cursor = Math.max(cursor, g1);
  }
}

function departuresBoard(c, w, t) {
  const h = 78;
  const top = -122;
  c.fillStyle = '#3b4250';
  c.fillRect(2, top + h, 5, 122 - h);
  c.fillRect(w - 7, top + h, 5, 122 - h);
  box(c, 0, top, w, h, '#14171c', OUT, 2, 4);
  text(c, 'DEPARTURES', w / 2, top + 9, { size: 9, colour: '#ffcf3f' });
  const shift = Math.floor(t / 5);
  for (let r = 0; r < 5; r++) {
    const i = (r + shift) % DESTINATIONS.length;
    const ry = top + 21 + r * 11.5;
    const hh = 6 + ((i * 7 + 3) % 12);
    const mm = (i * 13) % 60;
    const status = i % 5 === 2 ? (Math.floor(t * 2) % 2 ? 'DELAYED' : '') : i % 4 === 0 ? 'BOARDING' : 'ON TIME';
    text(c, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 8, ry, { size: 7.5, colour: '#ffcf3f', align: 'left' });
    text(c, DESTINATIONS[i], 40, ry, { size: 7.5, colour: '#ffcf3f', align: 'left', maxWidth: w - 120 });
    text(c, `P${(i % 6) + 1}`, w - 66, ry, { size: 7.5, colour: '#ffcf3f', align: 'left' });
    text(c, status, w - 8, ry, { size: 6.5, colour: status === 'DELAYED' ? '#ff6b5a' : '#9ff09a', align: 'right' });
  }
}

function clockPost(c) {
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.beginPath();
  c.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  c.fill();
  box(c, -9, -10, 18, 10, '#2f5a46', OUT, 1, 2);
  c.fillStyle = '#2f5a46';
  c.fillRect(-3, -100, 6, 92);
  box(c, -18, -128, 36, 30, '#2f5a46', OUT, 1, 6);
  clockFace(c, 0, -113, 12);
}

function piano3d(ctx, P, x, y, z) {
  drawBox(ctx, P, { x, y: y - 12, w: 40, d: 10, h: 34, z }, { front: '#4a2d1e' });
  drawBox(ctx, P, { x: x - 2, y: y - 2, w: 44, d: 5, h: 2, z: z + 14 }, { front: '#3a2216', top: '#f5f5f0' });
  onFront(ctx, P, x, y - 2, z, (c) => {
    c.fillStyle = '#f2c94c';
    c.fillRect(6, -30, 28, 5);
    text(c, 'PLAY ME', 20, -27.5, { size: 4.5, colour: '#4a2d1e' });
  });
  topQuadKeys(ctx, P, x, y, z + 16);
}

function topQuadKeys(ctx, P, x, y, z) {
  for (let i = 0; i < 9; i++) poly(ctx, [P.pt(x + 1 + i * 4.6, y - 2, z), P.pt(x + 3 + i * 4.6, y - 2, z), P.pt(x + 3 + i * 4.6, y + 1, z), P.pt(x + 1 + i * 4.6, y + 1, z)], '#111', null);
}

function photoBooth3d(ctx, P, x, y, z) {
  drawBox(ctx, P, { x, y: y - 24, w: 36, d: 24, h: 66, z }, { front: '#e0a030' });
  onFront(ctx, P, x, y, z, (c) => {
    c.fillStyle = '#8a1f2b';
    c.fillRect(4, -50, 18, 46);
    text(c, 'PHOTOS', 18, -58, { size: 6.5, colour: '#3a2216' });
    c.fillStyle = '#fff';
    c.fillRect(26, -46, 6, 18);
  });
}

function createTrain(rng, P, track, bufferY, livery) {
  const len = Math.max(160, bufferY - 30);
  const dockY = bufferY - 18;
  const st = { state: rng.pick(['dwell', 'dwell', 'away', 'arriving']), front: dockY, v: 0, timer: rng.range(2, 14), doors: 0 };
  if (st.state === 'away') st.front = -12;
  if (st.state === 'arriving') st.front = dockY - rng.range(60, 200);
  const x = track.x + 7;
  const w = track.w - 14;
  const z = E - 14;
  const h = 40;
  const carLen = 104;
  const visibleSide = x + w < P.cx ? x + w : x > P.cx ? x : null;

  function drawCar(ctx, y0, y1, lead) {
    drawBox(ctx, P, { x, y: y0, w, d: y1 - y0, h, z }, { front: lead ? livery.front : shade(livery.roof, -0.1), side: livery.roof, top: shade(livery.roof, 0.18) });
    if (visibleSide !== null) {
      sideQuad(ctx, P, visibleSide, y0 + 3, y1 - 3, z + 10, z + 13, livery.stripe);
      for (let wy = y0 + 10; wy < y1 - 14; wy += 18) sideQuad(ctx, P, visibleSide, wy, wy + 11, z + 19, z + 30, '#2a3440');
      if (st.doors > 0) {
        for (const f of [0.3, 0.72]) {
          const dy = y0 + (y1 - y0) * f;
          sideQuad(ctx, P, visibleSide, dy - 5 * st.doors, dy + 5 * st.doors, z + 3, z + 34, '#111');
        }
      }
    }
    if (lead) {
      onFront(ctx, P, x, y1, z, (c) => {
        box(c, 6, -h + 6, w - 12, 12, '#2a3440', OUT, 0.8, 2);
        c.fillStyle = '#fff6c4';
        c.fillRect(4, -10, 6, 4);
        c.fillRect(w - 10, -10, 6, 4);
      });
    }
  }

  return {
    update(dt) {
      switch (st.state) {
        case 'away':
          st.timer -= dt;
          if (st.timer <= 0) {
            st.state = 'arriving';
            st.front = -12;
          }
          break;
        case 'arriving': {
          const dist = dockY - st.front;
          st.front += Math.max(14, Math.min(130, dist * 0.8)) * dt;
          if (dist < 0.5) {
            st.front = dockY;
            st.state = 'dwell';
            st.timer = rng.range(12, 24);
          }
          break;
        }
        case 'dwell':
          st.timer -= dt;
          st.doors = st.timer > 2.5 ? Math.min(1, st.doors + dt * 1.5) : Math.max(0, st.doors - dt * 1.5);
          if (st.timer <= 0) {
            st.state = 'departing';
            st.v = 0;
          }
          break;
        case 'departing':
          st.v = Math.min(150, st.v + 22 * dt);
          st.front -= st.v * dt;
          if (st.front < -12) {
            st.state = 'away';
            st.timer = rng.range(5, 16);
          }
          break;
        default:
          break;
      }
    },
    parts() {
      if (st.front <= 2) return [];
      const out = [];
      const back = Math.max(0, st.front - len);
      let lead = true;
      for (let y1 = st.front; y1 > back + 4; y1 -= carLen + 4) {
        const y0 = Math.max(back, y1 - carLen);
        const isLead = lead;
        out.push({ sortY: y1, bounds: projectBox(P, { x, y: y0, w, d: y1 - y0, h, z }, 4), draw: (ctx) => drawCar(ctx, y0, y1, isLead) });
        lead = false;
      }
      return out;
    },
  };
}

function createMetro(rng, P, W, edge, H) {
  const len = Math.min(W * 0.62, 820);
  const stopX = W / 2 + len / 2;
  const st = { state: 'away', front: -20, v: 0, timer: rng.range(2, 8), doors: 0 };
  const y0 = edge + 10;
  const y1 = H - 10;
  const z = -24;
  const h = 40;
  return {
    update(dt) {
      switch (st.state) {
        case 'away':
          st.timer -= dt;
          if (st.timer <= 0) {
            st.state = 'arriving';
            st.front = -10;
          }
          break;
        case 'arriving': {
          const dist = stopX - st.front;
          st.front += Math.max(16, Math.min(220, dist * 0.9)) * dt;
          if (dist < 0.5) {
            st.state = 'dwell';
            st.front = stopX;
            st.timer = rng.range(8, 14);
          }
          break;
        }
        case 'dwell':
          st.timer -= dt;
          st.doors = st.timer > 2 ? Math.min(1, st.doors + dt * 2) : Math.max(0, st.doors - dt * 2);
          if (st.timer <= 0) {
            st.state = 'departing';
            st.v = 20;
          }
          break;
        case 'departing':
          st.v = Math.min(260, st.v + 40 * dt);
          st.front += st.v * dt;
          if (st.front - len > W + 20) {
            st.state = 'away';
            st.timer = rng.range(6, 14);
          }
          break;
        default:
          break;
      }
    },
    parts() {
      if (st.state === 'away') return [];
      const x0 = Math.max(0, st.front - len);
      const x1 = Math.min(W, st.front);
      if (x1 <= x0) return [];
      return [{
        sortY: y1,
        bounds: projectBox(P, { x: x0, y: y0, w: x1 - x0, d: y1 - y0, h, z }, 4),
        draw: (ctx) => {
          const carLen = 130;
          for (let cx = st.front - len; cx < st.front; cx += carLen + 6) {
            const a = Math.max(0, cx);
            const b = Math.min(W, cx + carLen, st.front);
            if (b <= a) continue;
            drawBox(ctx, P, { x: a, y: y0, w: b - a, d: y1 - y0, h, z }, { front: '#e8e8e8', top: '#f6f6f6', side: '#c9c9c9' });
            onFront(ctx, P, a, y1, z, (c) => {
              c.fillStyle = '#c0392b';
              c.fillRect(2, -10, b - a - 4, 5);
              c.fillStyle = '#2a3440';
              for (let wx = 10; wx < b - a - 20; wx += 26) {
                rrect(c, wx, -h + 8, 18, 14, 3);
                c.fill();
              }
              if (st.doors > 0) {
                c.fillStyle = '#111';
                c.fillRect((b - a) / 2 - 8 * st.doors, -h + 6, 16 * st.doors, h - 12);
              }
            });
          }
        },
      }];
    },
  };
}
