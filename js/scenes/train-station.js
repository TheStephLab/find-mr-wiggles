import { addKiosk, addBench, addPlant, addPillar, addBin, addMachine, scatter, addSignPosts } from './builders.js';
import { tiles, gridLines, box, text, clockFace, lampPost, createPigeons, OUT, shade, rrect } from './props.js';

const DESTINATIONS = ['Puddleford', 'Gigglewick', 'Mumbleton-on-Sea', 'Wobblecombe', 'Snoringham', 'Fizzbury Parkway', 'Little Dithering', 'Bramblemoor', 'Kettlewhistle', 'Upper Noodleby', 'Dozy Hollow', 'Crumbleton', 'Wigglesworth Bay'];
const LIVERIES = [
  { roof: '#2f7d4f', stripe: '#f2e3b3', front: '#f2c230', name: 'Puffin Rail' },
  { roof: '#b3343c', stripe: '#f5f0e6', front: '#f2c230', name: 'Kestrel Express' },
  { roof: '#2b4f8c', stripe: '#9fd3f0', front: '#f2c230', name: 'Bluebell Lines' },
  { roof: '#6a3d8f', stripe: '#f2c94c', front: '#f2c230', name: 'Heron Coast' },
];

export const trainStation = {
  id: 'whistlebury-junction',
  title: 'Whistlebury Junction',
  kind: 'Train station',
  blurb: 'Whistles, suitcases and a very busy departures board.',
  aspect: 1.6,
  crowdFactor: 1,
  thumbColour: '#2f7d4f',
  build(kit) {
    const { W, H, rng } = kit;
    kit.background = '#4a443c';
    const bufferY = Math.round(H * 0.36);
    const divTop = Math.round(H * 0.73);
    const divBot = divTop + 46;
    const metroEdge = H - 80;
    kit.defineLevel('concourse', { x: 0, y: 0, w: W, h: divTop });
    kit.defineLevel('metro', { x: 0, y: divBot, w: W, h: H - divBot });
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

    // ---------------------------------------------------------- platforms
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
      tracks.forEach((t, i) => {
        ctx.fillStyle = '#6f665a';
        ctx.fillRect(t.x, 0, t.w, bufferY);
        ctx.fillStyle = '#5a4634';
        for (let y = Math.max(0, Math.floor(view.y / 12) * 12); y < Math.min(bufferY, view.y + view.h); y += 12) ctx.fillRect(t.x + 6, y, t.w - 12, 5);
        ctx.fillStyle = '#b9bec4';
        ctx.fillRect(t.x + 15, 0, 3, bufferY);
        ctx.fillRect(t.x + t.w - 18, 0, 3, bufferY);
        box(ctx, t.x + 8, bufferY - 12, t.w - 16, 12, '#c0392b', OUT, 1);
        ctx.fillStyle = '#fff';
        for (let k = 0; k < 3; k++) ctx.fillRect(t.x + 14 + k * 12, bufferY - 10, 6, 8);
        text(ctx, String(i + 1), t.x + t.w / 2, bufferY - 30, { size: 16, colour: 'rgba(255,255,255,0.75)' });
      });
    });

    tracks.forEach((t, i) => {
      kit.block({ x: t.x - 2, y: 0, w: t.w + 4, h: bufferY + 2 });
      kit.addDynamic(createTrain(rng, t, bufferY, LIVERIES[i % LIVERIES.length]));
    });

    // ---------------------------------------------------------- concourse floor + divider
    kit.addFloor({ x: 0, y: bufferY, w: W, h: divTop - bufferY }, (ctx, view) => {
      tiles(ctx, { x: 0, y: bufferY, w: W, h: divTop - bufferY }, 40, '#ece3cf', '#e0d4ba', view);
      ctx.fillStyle = '#7d6f5d';
      ctx.fillRect(0, bufferY, W, 5);
    });

    const ads = Array.from({ length: Math.ceil(W / 360) }, () => rng.pick(['Wobble Jelly!', 'Fizzbury Pop', 'Snooze Beds', 'Crumb Cakes', 'Visit Puddleford']));
    kit.addFloor({ x: 0, y: divTop, w: W, h: H - divTop }, (ctx, view) => {
      ctx.fillStyle = '#8f8170';
      ctx.fillRect(0, divTop, W, divBot - divTop);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = divTop + 8; y < divBot; y += 8) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
      for (let x = 120; x < W - 120; x += 360) {
        box(ctx, x, divTop + 10, 70, 28, '#f5efe0', OUT, 1, 2);
        text(ctx, ads[Math.floor(x / 360)], x + 35, divTop + 24, { size: 8, colour: '#b3343c', maxWidth: 64 });
      }
      tiles(ctx, { x: 0, y: divBot, w: W, h: metroEdge - divBot }, 32, '#cfd8de', '#c2ccd3', view);
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, metroEdge - 8, W, 8);
      ctx.fillStyle = '#d2a514';
      for (let x = 4; x < W; x += 8) ctx.fillRect(x, metroEdge - 6, 3, 3);
      ctx.fillStyle = '#3d3a37';
      ctx.fillRect(0, metroEdge, W, H - metroEdge);
      ctx.fillStyle = '#5a4634';
      for (let x = Math.max(0, Math.floor(view.x / 12) * 12); x < Math.min(W, view.x + view.w); x += 12) ctx.fillRect(x, metroEdge + 30, 5, 34);
      ctx.fillStyle = '#b9bec4';
      ctx.fillRect(0, metroEdge + 36, W, 3);
      ctx.fillRect(0, metroEdge + 56, W, 3);
    });
    kit.addDynamic(createMetro(rng, W, metroEdge, H));

    // ---------------------------------------------------------- escalators + railing
    const pairs = W > 2600 ? [0.17, 0.5, 0.83] : [0.2, 0.8];
    const gaps = [];
    for (const f of pairs) {
      const x = Math.round(W * f);
      kit.escalator({ x: x - 20, yTop: divTop - 44, yBottom: divBot + 40, dir: 'up' });
      kit.escalator({ x: x + 20, yTop: divTop - 44, yBottom: divBot + 40, dir: 'down' });
      gaps.push([x - 40, x + 40]);
      kit.block({ x: x - 44, y: divTop - 50, w: 88, h: divBot - divTop + 96 });
    }
    kit.block({ x: 0, y: divTop - 16, w: W, h: divBot - divTop + 16 });
    let rx = 0;
    for (const [g0, g1] of [...gaps, [W, W]]) {
      const x0 = rx;
      const x1 = g0;
      kit.addProp({ y: divTop, bounds: { x: x0, y: divTop - 30, w: x1 - x0, h: 32 }, draw: (ctx) => railing(ctx, x0, x1, divTop) });
      rx = g1;
    }

    // ---------------------------------------------------------- concourse features
    const conTop = bufferY + 30;
    const conRect = { x: 60, y: conTop + 40, w: W - 120, h: divTop - 80 - conTop - 40 };

    // departures board
    const bw = Math.min(400, W * 0.24);
    const bx = W / 2 - bw / 2;
    const by = bufferY + 105;
    kit.addProp({ y: by, bounds: { x: bx - 6, y: by - 128, w: bw + 12, h: 130 }, draw: (ctx, t) => departuresBoard(ctx, bx, by, bw, t) });
    kit.block({ x: bx, y: by - 6, w: 8, h: 8 });
    kit.block({ x: bx + bw - 8, y: by - 6, w: 8, h: 8 });
    kit.block({ x: bx, y: by - 6, w: bw, h: 8 });
    for (let i = 0; i < kit.count(7, 4); i++) {
      kit.poi({ x: bx + 20 + rng.range(0, bw - 40), y: by + 25 + rng.range(0, 45), facing: 'up', actions: [null, null, 'phone'], duration: [5, 14], weight: 1.4, capacity: 1 });
    }

    // meeting-point clock
    const clockX = W / 2;
    const clockY = Math.round(bufferY + (divTop - bufferY) * 0.6);
    kit.addProp({ y: clockY, bounds: { x: clockX - 22, y: clockY - 130, w: 44, h: 134 }, draw: (ctx) => clockPost(ctx, clockX, clockY) });
    kit.block({ x: clockX - 8, y: clockY - 6, w: 16, h: 8 });
    for (const [dx, dy, facing] of [[-30, 6, 'right'], [30, 6, 'left'], [0, 26, 'up'], [-22, 24, 'up'], [24, 22, 'up']]) {
      kit.poi({ x: clockX + dx, y: clockY + dy, facing, actions: ['phone', 'wave', null, null], duration: [6, 18], weight: 1.3 });
    }

    // kiosks (ticket office always first)
    const catalogue = rng.shuffle([
      { name: 'Crumbs Bakery', colour: '#a0522d', colour2: '#f2c94c', goods: 'bread', keeper: 'chef' },
      { name: 'Bean There', colour: '#5a3a26', colour2: '#e0b07a', goods: 'coffee', keeper: 'barista', queue: true },
      { name: 'Petal Pushers', colour: '#3f8f4a', colour2: '#f28ab2', goods: 'flowers', keeper: 'shop' },
      { name: 'Paper Trail', colour: '#2b4f8c', colour2: '#e9e2d0', goods: 'news', keeper: 'shop' },
      { name: 'Sweet Tooth', colour: '#c9476e', colour2: '#ffd1e3', goods: 'sweets', keeper: 'shop' },
      { name: 'Choo Choo Toys', colour: '#d9822b', colour2: '#ffe08a', goods: 'sweets', keeper: 'shop' },
    ]);
    const shops = [{ name: 'Tickets', colour: '#20385e', colour2: '#ff8a1f', goods: 'news', keeper: 'rail', queue: true }, ...catalogue].slice(0, Math.min(7, kit.count(5, 3) + 1));
    const rows = [bufferY + 125, divTop - 170];
    for (const shop of shops) {
      const w = 96;
      const d = 34;
      let placed = false;
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        const y = rng.pick(rows) + rng.range(-8, 8);
        const x = rng.range(70, W - 70 - w);
        const footprint = { x: x - 30, y: y - 70, w: w + 60, h: d + (shop.queue ? 140 : 70) };
        if (!kit.isFree(footprint, 10)) continue;
        addKiosk(kit, { x, y, w, d, ...shop, customers: shop.queue ? 2 : 3 });
        placed = true;
      }
    }

    // street piano, busker, info desk, photo booth
    scatter(kit, conRect, 1, 60, 70, (x, y) => {
      const px = x + 10;
      const py = y + 30;
      kit.addProp({ y: py, bounds: { x: px - 4, y: py - 46, w: 48, h: 50 }, draw: (ctx) => piano(ctx, px, py) });
      kit.block({ x: px, y: py - 10, w: 40, h: 12 });
      kit.poi({ x: px + 20, y: py + 12, mode: 'sit', facing: 'up', actions: ['piano'], duration: [12, 30], weight: 1.6, sortBias: 0 });
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
      kit.station({ x: ix, y: iy - 10, uniform: 'rail', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.addProp({ y: iy, bounds: { x: ix - 34, y: iy - 70, w: 68, h: 74 }, draw: (ctx) => infoDesk(ctx, ix, iy) });
      kit.block({ x: ix - 30, y: iy - 14, w: 60, h: 16 });
      kit.poi({ x: ix - 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
      kit.poi({ x: ix + 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
    });
    scatter(kit, conRect, 1, 40, 40, (x, y) => {
      const fx = x;
      const fy = y + 36;
      kit.addProp({ y: fy, bounds: { x: fx - 2, y: fy - 70, w: 40, h: 72 }, draw: (ctx) => photoBooth(ctx, fx, fy) });
      kit.block({ x: fx, y: fy - 12, w: 36, h: 13 });
    });

    // ticket machines, benches, pillars, plants, bins
    scatter(kit, conRect, kit.count(3, 2), 30, 20, (x, y) => addMachine(kit, x, y + 16, { colour: '#20385e', screen: '#9fe0ff' }));
    scatter(kit, conRect, kit.count(6, 2), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: rng.chance(0.6) ? 'down' : 'up' }));
    scatter(kit, conRect, kit.count(5, 2), 20, 14, (x, y) => addPillar(kit, x + 10, y + 10, 130, 20, '#d9cfbb'));
    scatter(kit, conRect, kit.count(6, 2), 20, 14, (x, y) => addPlant(kit, x + 10, y + 10, rng.range(0.8, 1.1)));
    scatter(kit, conRect, kit.count(5, 2), 14, 8, (x, y) => addBin(kit, x + 7, y + 6));
    for (let i = 0; i < kit.count(2, 1); i++) {
      kit.addDynamic(createPigeons(rng, rng.range(conRect.x + 60, conRect.x + conRect.w - 60), rng.range(conRect.y + 20, conRect.y + conRect.h - 20), rng.int(4, 7), 50));
    }

    // ---------------------------------------------------------- platform furniture
    platforms.forEach((p, i) => {
      if (p.w < 60) return;
      const mid = p.x + p.w / 2;
      addSignPosts(kit, p.x + 12, bufferY - 6, p.w - 24, `Platform ${i + 1}`, { colour: '#20385e' });
      for (let y = 90; y < bufferY - 60; y += 150) {
        kit.addProp({ y, bounds: { x: mid - 8, y: y - 82, w: 16, h: 86 }, draw: (ctx) => lampPost(ctx, mid, y, 74, '#2f5a46') });
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
    scatter(kit, metroRect, kit.count(3, 1), 20, 14, (x, y) => addPillar(kit, x + 10, y + 10, 90, 16, '#9fb3c8'));
    for (let k = 0; k < kit.count(10, 4); k++) {
      kit.poi({ x: rng.range(60, W - 60), y: metroEdge - 14, facing: 'down', actions: [null, 'phone', 'read'], duration: [8, 22], weight: 1 });
    }

    // ---------------------------------------------------------- walkable grids
    kit.grid({ x: 50, y: 30, w: W - 100, h: divTop - 40 - 30 }, 60);
    kit.grid({ x: 50, y: divBot + 30, w: W - 100, h: metroEdge - 20 - divBot - 30 }, 56);
  },
};

// ------------------------------------------------------------------ drawings
function railing(ctx, x0, x1, y) {
  if (x1 - x0 < 4) return;
  ctx.fillStyle = 'rgba(170,215,235,0.35)';
  ctx.fillRect(x0, y - 22, x1 - x0, 20);
  ctx.strokeStyle = 'rgba(80,110,130,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0 + 20; x < x1; x += 40) {
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#6b6f75';
  ctx.fillRect(x0, y - 25, x1 - x0, 4);
  ctx.fillRect(x0, y - 2, x1 - x0, 3);
}

function departuresBoard(ctx, x, y, w, t) {
  const h = 78;
  const top = y - 122;
  ctx.fillStyle = '#3b4250';
  ctx.fillRect(x + 2, top + h, 5, 122 - h);
  ctx.fillRect(x + w - 7, top + h, 5, 122 - h);
  box(ctx, x, top, w, h, '#14171c', OUT, 2, 4);
  text(ctx, 'DEPARTURES', x + w / 2, top + 9, { size: 9, colour: '#ffcf3f' });
  const shift = Math.floor(t / 5);
  const flip = (t % 5) < 0.25;
  for (let r = 0; r < 5; r++) {
    const i = (r + shift) % DESTINATIONS.length;
    const ry = top + 21 + r * 11.5;
    const hh = 6 + ((i * 7 + 3) % 12);
    const mm = (i * 13) % 60;
    const status = i % 5 === 2 ? (Math.floor(t * 2) % 2 ? 'DELAYED' : '') : i % 4 === 0 ? 'BOARDING' : 'ON TIME';
    ctx.globalAlpha = flip && r === 0 ? 0.3 : 1;
    text(ctx, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, x + 8, ry, { size: 7.5, colour: '#ffcf3f', align: 'left' });
    text(ctx, DESTINATIONS[i], x + 40, ry, { size: 7.5, colour: '#ffcf3f', align: 'left', maxWidth: w - 120 });
    text(ctx, `P${(i % 6) + 1}`, x + w - 66, ry, { size: 7.5, colour: '#ffcf3f', align: 'left' });
    text(ctx, status, x + w - 8, ry, { size: 6.5, colour: status === 'DELAYED' ? '#ff6b5a' : '#9ff09a', align: 'right' });
  }
  ctx.globalAlpha = 1;
}

function clockPost(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  box(ctx, x - 9, y - 10, 18, 10, '#2f5a46', OUT, 1, 2);
  ctx.fillStyle = '#2f5a46';
  ctx.fillRect(x - 3, y - 100, 6, 92);
  box(ctx, x - 18, y - 128, 36, 30, '#2f5a46', OUT, 1, 6);
  clockFace(ctx, x, y - 113, 12);
}

function piano(ctx, x, y) {
  box(ctx, x, y - 42, 40, 32, '#4a2d1e', OUT, 1, 2);
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(x + 6, y - 38, 28, 5);
  text(ctx, 'PLAY ME', x + 20, y - 35.5, { size: 4.5, colour: '#4a2d1e' });
  box(ctx, x - 2, y - 14, 44, 6, '#f5f5f0', OUT, 0.6);
  ctx.fillStyle = '#111';
  for (let i = 0; i < 9; i++) ctx.fillRect(x + 1 + i * 4.6, y - 14, 2, 3.5);
  box(ctx, x + 2, y - 8, 36, 8, '#3a2216', OUT, 0.6);
}

function infoDesk(ctx, x, y) {
  box(ctx, x - 30, y - 18, 60, 18, '#20385e', OUT, 1, 8);
  box(ctx, x - 32, y - 22, 64, 5, '#e9e2d0', OUT, 0.8, 3);
  ctx.fillStyle = '#3b4250';
  ctx.fillRect(x - 1.5, y - 66, 3, 44);
  ctx.beginPath();
  ctx.arc(x, y - 70, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#1f7ad1';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.stroke();
  text(ctx, 'i', x, y - 70, { size: 14, colour: '#fff', weight: 'bold' });
}

function photoBooth(ctx, x, y) {
  box(ctx, x, y - 66, 36, 66, '#e0a030', OUT, 1, 3);
  ctx.fillStyle = '#8a1f2b';
  ctx.fillRect(x + 4, y - 50, 18, 46);
  text(ctx, 'PHOTOS', x + 18, y - 58, { size: 6.5, colour: '#3a2216' });
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 26, y - 46, 6, 18);
}

function createTrain(rng, track, bufferY, livery) {
  const len = Math.max(160, bufferY - 30);
  const dockY = bufferY - 16;
  const st = { state: rng.pick(['dwell', 'dwell', 'away', 'arriving']), front: dockY, v: 0, timer: rng.range(2, 14), doors: 0 };
  if (st.state === 'away') st.front = -12;
  if (st.state === 'arriving') st.front = dockY - rng.range(60, 200);
  const x = track.x + 7;
  const w = track.w - 14;
  return {
    bounds: { x: track.x, y: 0, w: track.w, h: bufferY },
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
    draw(ctx) {
      if (st.front <= -10) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(track.x, 0, track.w, bufferY);
      ctx.clip();
      const carLen = 104;
      const backY = st.front - len;
      for (let cy = st.front; cy > backY; cy -= carLen + 4) {
        const top = Math.max(backY, cy - carLen);
        const h = cy - top;
        box(ctx, x, top, w, h, livery.roof, OUT, 1.2, 5);
        ctx.fillStyle = livery.stripe;
        ctx.fillRect(x + 3, top + 4, 4, h - 8);
        ctx.fillRect(x + w - 7, top + 4, 4, h - 8);
        ctx.fillStyle = shade(livery.roof, -0.25);
        for (let v = top + 14; v < cy - 10; v += 26) ctx.fillRect(x + w / 2 - 5, v, 10, 8);
        if (st.doors > 0) {
          ctx.fillStyle = '#1b1b1b';
          for (const f of [0.3, 0.7]) {
            const dy = top + h * f;
            ctx.fillRect(x - 1, dy - 5 * st.doors, 4, 10 * st.doors);
            ctx.fillRect(x + w - 3, dy - 5 * st.doors, 4, 10 * st.doors);
          }
        }
      }
      box(ctx, x, st.front - 16, w, 16, livery.front, OUT, 1.2, 4);
      box(ctx, x + 6, st.front - 14, w - 12, 7, '#2a3440', OUT, 0.8, 2);
      ctx.fillStyle = '#fff6c4';
      ctx.fillRect(x + 4, st.front - 5, 5, 3);
      ctx.fillRect(x + w - 9, st.front - 5, 5, 3);
      ctx.restore();
    },
  };
}

function createMetro(rng, W, edge, H) {
  const len = Math.min(W * 0.62, 820);
  const stopX = W / 2 + len / 2;
  const st = { state: 'away', front: -20, v: 0, timer: rng.range(2, 8), doors: 0 };
  const top = edge + 6;
  const h = H - edge - 12;
  return {
    bounds: { x: 0, y: edge, w: W, h: H - edge },
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
    draw(ctx) {
      if (st.state === 'away') return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, edge, W, H - edge);
      ctx.clip();
      const back = st.front - len;
      const carLen = 130;
      for (let cx = back; cx < st.front; cx += carLen + 6) {
        const cw = Math.min(carLen, st.front - cx);
        box(ctx, cx, top, cw, h, '#e8e8e8', OUT, 1.2, 8);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(cx + 2, top + h - 14, cw - 4, 6);
        ctx.fillStyle = '#2a3440';
        for (let wx = cx + 10; wx < cx + cw - 20; wx += 26) {
          rrect(ctx, wx, top + 8, 18, 18, 3);
          ctx.fill();
        }
        if (st.doors > 0) {
          ctx.fillStyle = '#111';
          ctx.fillRect(cx + cw / 2 - 8 * st.doors, top + 6, 16 * st.doors, h - 10);
        }
      }
      box(ctx, st.front - 14, top + 4, 12, h - 10, '#2a3440', OUT, 0.8, 4);
      text(ctx, 'M', back + 40, top + h - 24, { size: 10, colour: '#c0392b' });
      ctx.restore();
    },
  };
}
