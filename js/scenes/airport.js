import { addKiosk, addBench, addPlant, addPillar, addBin, addMachine, scatter, addSignPosts } from './builders.js';
import { gridLines, box, text, OUT } from './props.js';
import { CLOTHES } from '../game/people.js';

const AIRLINES = [
  { name: 'Puffin Air', body: '#ffffff', stripe: '#1f6fbf', tail: '#f2a33a' },
  { name: 'Zephyr Wings', body: '#ffffff', stripe: '#7d4bb3', tail: '#7d4bb3' },
  { name: 'Bumblebee', body: '#fff7d6', stripe: '#2c2c2c', tail: '#f4c430' },
  { name: 'Nimbus Jet', body: '#f4f7fb', stripe: '#d64545', tail: '#d64545' },
  { name: 'Kiwi Cloud', body: '#ffffff', stripe: '#3a9a5b', tail: '#1f2d4a' },
];
const CITIES = ['Port Pemberly', 'Sunnyvale-on-Sea', 'Glimmerholm', 'Frostwick', 'Isla Marzipan', 'Cobbleton', 'New Doodleburg', 'Lake Tumbleweed', 'Saint Snuffle', 'Pebble Point'];

export const airport = {
  id: 'skyhaven-international',
  title: 'Skyhaven International',
  kind: 'Airport',
  blurb: 'Check-in queues, moving walkways and planes galore.',
  aspect: 1.6,
  crowdFactor: 1.05,
  thumbColour: '#1f6fbf',
  build(kit) {
    const { W, H, rng } = kit;
    kit.background = '#2c3440';
    const apronBot = Math.round(H * 0.23);
    const winBot = apronBot + 18;
    const divTop = Math.round(H * 0.62);
    const divBot = divTop + 46;
    kit.defineLevel('gates', { x: 0, y: winBot, w: W, h: divTop - winBot });
    kit.defineLevel('hall', { x: 0, y: divBot, w: W, h: H - divBot });
    kit.roles = [
      { role: 'traveller', weight: 6 },
      { role: 'tourist', weight: 2.5 },
      { role: 'commuter', weight: 1.2 },
      { role: 'child', weight: 1.5 },
      { role: 'elderly', weight: 0.8 },
      { role: 'jogger', weight: 0.15 },
      { role: 'staff', uniform: 'pilot', weight: 0.25 },
      { role: 'staff', uniform: 'crew', weight: 0.3 },
      { role: 'staff', uniform: 'cleaner', weight: 0.2 },
    ];

    // ---------------------------------------------------------- apron
    const nP = Math.max(2, Math.floor(W / 460));
    const parked = Array.from({ length: nP }, (_, i) => ({
      x: (W * (i + 0.5)) / nP,
      y: apronBot - 26,
      airline: AIRLINES[(i + rng.int(0, 4)) % AIRLINES.length],
      facing: i % 2 ? -1 : 1,
    }));
    kit.addFloor({ x: 0, y: 0, w: W, h: winBot }, (ctx, view) => {
      ctx.fillStyle = '#7a8088';
      ctx.fillRect(0, 0, W, apronBot);
      ctx.fillStyle = '#8fb86a';
      ctx.fillRect(0, 0, W, apronBot * 0.14);
      ctx.fillStyle = '#5f646b';
      ctx.fillRect(0, apronBot * 0.14, W, apronBot * 0.3);
      ctx.fillStyle = '#f2f2f2';
      for (let x = Math.max(0, Math.floor(view.x / 60) * 60); x < Math.min(W, view.x + view.w); x += 60) ctx.fillRect(x, apronBot * 0.29, 30, 3);
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, apronBot * 0.52, W, 2.5);
      for (const p of parked) {
        ctx.fillStyle = '#f2c230';
        ctx.fillRect(p.x - 1, apronBot * 0.55, 2, apronBot * 0.45);
        drawPlane(ctx, p.x, p.y, 0.95, p.facing, p.airline);
        const doorX = p.x + p.facing * 70;
        box(ctx, doorX - 11, p.y - 30, 22, apronBot - p.y + 30, '#9aa3ad', OUT, 1, 2);
        ctx.fillStyle = '#7d8590';
        for (let y = p.y - 24; y < apronBot; y += 10) ctx.fillRect(doorX - 11, y, 22, 2);
      }
      // window wall
      ctx.fillStyle = '#a8d8ef';
      ctx.fillRect(0, apronBot, W, winBot - apronBot);
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(0, apronBot, W, 3);
      ctx.fillRect(0, winBot - 3, W, 3);
      for (let x = 0; x < W; x += 64) ctx.fillRect(x, apronBot, 3, winBot - apronBot);
    });
    kit.addDynamic(createTaxiingPlane(rng, W, Math.round(apronBot * 0.5)));
    kit.addDynamic(createBaggageTrain(rng, W, apronBot - 6));
    for (const p of parked) {
      kit.station({ x: p.x - p.facing * 40, y: apronBot - 8, uniform: 'hivis', dir: 'down', action: 'wave', fixedActions: ['wave', null, 'wave'] });
    }

    // ---------------------------------------------------------- floors + divider
    kit.addFloor({ x: 0, y: winBot, w: W, h: H - winBot }, (ctx, view) => {
      ctx.fillStyle = '#e4e1da';
      ctx.fillRect(0, winBot, W, divTop - winBot);
      gridLines(ctx, { x: 0, y: winBot, w: W, h: divTop - winBot }, 48, 'rgba(0,0,0,0.05)', view);
      ctx.fillStyle = '#7c6a58';
      ctx.fillRect(0, divTop, W, divBot - divTop);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let x = 0; x < W; x += 80) ctx.fillRect(x, divTop + 6, 60, divBot - divTop - 12);
      ctx.fillStyle = '#efece6';
      ctx.fillRect(0, divBot, W, H - divBot);
      gridLines(ctx, { x: 0, y: divBot, w: W, h: H - divBot }, 40, 'rgba(0,0,0,0.05)', view);
      // entrance doors on the bottom wall
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(0, H - 14, W, 14);
      for (let x = W * 0.15; x < W; x += W * 0.35) {
        ctx.fillStyle = '#a8d8ef';
        ctx.fillRect(x, H - 13, 70, 12);
        ctx.fillStyle = '#3b4250';
        ctx.fillRect(x + 34, H - 13, 2, 12);
        text(ctx, 'EXIT', x + 35, H - 20, { size: 7, colour: '#1f6fbf' });
      }
    });

    // ---------------------------------------------------------- gates level
    const nG = Math.max(2, Math.floor(W / 520));
    for (let i = 0; i < nG; i++) {
      const gx = Math.round((W * (i + 0.5)) / nG);
      const deskY = winBot + 46;
      const label = `Gate ${String.fromCharCode(65 + (i % 3))}${i + 1}`;
      const flight = { city: rng.pick(CITIES), airline: rng.pick(AIRLINES) };
      kit.addProp({ y: deskY, bounds: { x: gx - 46, y: deskY - 74, w: 92, h: 78 }, draw: (ctx, t) => gateDesk(ctx, gx, deskY, label, flight, t) });
      kit.block({ x: gx - 40, y: deskY - 14, w: 80, h: 16 });
      kit.station({ x: gx - 16, y: deskY - 12, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.station({ x: gx + 16, y: deskY - 12, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach'] });
      kit.queue({ slots: Array.from({ length: 6 }, (_, k) => ({ x: gx, y: deskY + 14 + k * 13 })), facing: 'up', serviceTime: [2, 5], action: 'reach', weight: 1.2 });
      for (const side of [-1, 1]) {
        for (let r = 0; r < kit.count(2, 1); r++) {
          const bx = gx + side * 70 + (side < 0 ? -96 : 0);
          const by = winBot + 110 + r * 40;
          if (kit.isFree({ x: bx, y: by - 14, w: 96, h: 16 }, 6)) addBench(kit, { x: bx, y: by, w: 96, seats: 4, facing: r % 2 ? 'down' : 'up', wood: '#2b4f8c', weight: 1.3 });
        }
      }
    }
    for (let k = 0; k < Math.round(kit.count(8, 3) * (W / 1600)); k++) {
      const x = rng.range(40, W - 40);
      kit.poi({ x, y: winBot + 14, facing: 'up', actions: [null, 'wave', 'phone'], duration: [6, 18], weight: 1.2 });
      if (k % 2 === 0) kit.poi({ x: x + 14, y: winBot + 16, facing: 'up', roles: ['child'], actions: ['wave', null], duration: [8, 20], weight: 3 });
    }

    const travY = Math.round(winBot + (divTop - winBot) * 0.5);
    for (const [a, b] of [[0.07, 0.4], [0.6, 0.93]]) {
      kit.travelator({ x1: W * a, x2: W * b, y: travY - 13, dir: 'right' });
      kit.travelator({ x1: W * a, x2: W * b, y: travY + 13, dir: 'left' });
      kit.block({ x: W * a - 4, y: travY - 26, w: W * (b - a) + 8, h: 52 });
    }

    const shopRow = travY + 92;
    const catalogue = rng.shuffle([
      { name: 'Cloud Nine Café', colour: '#5a3a26', colour2: '#e0b07a', goods: 'coffee', keeper: 'barista' },
      { name: 'Duty Free', colour: '#1f2d4a', colour2: '#e1b84a', goods: 'bottles', keeper: 'shop' },
      { name: 'Page Turner', colour: '#2b4f8c', colour2: '#9fd3f0', goods: 'books', keeper: 'shop' },
      { name: 'Snack Attack', colour: '#c9476e', colour2: '#ffd1e3', goods: 'sweets', keeper: 'shop' },
      { name: 'Jet Set Gifts', colour: '#3a9a5b', colour2: '#f2c94c', goods: 'sweets', keeper: 'shop' },
      { name: 'Sky Bites', colour: '#a0522d', colour2: '#f2c94c', goods: 'bread', keeper: 'chef' },
    ]).slice(0, Math.min(6, kit.count(4, 3)));
    for (const shop of catalogue) {
      for (let attempt = 0; attempt < 60; attempt++) {
        const x = rng.range(60, W - 160);
        const y = shopRow + rng.range(-4, 4);
        if (!kit.isFree({ x: x - 30, y: y - 12, w: 152, h: 34 + 40 }, 6)) continue;
        addKiosk(kit, { x, y, ...shop, customers: 3 });
        break;
      }
    }
    const gatesRect = { x: 60, y: winBot + 60, w: W - 120, h: divTop - winBot - 100 };
    scatter(kit, gatesRect, 1, 120, 70, (x, y) => playArea(kit, x, y));
    scatter(kit, gatesRect, kit.count(3, 1), 30, 20, (x, y) => flightScreen(kit, x + 15, y + 16));
    scatter(kit, gatesRect, kit.count(5, 2), 20, 14, (x, y) => addPlant(kit, x + 10, y + 10, rng.range(0.8, 1.1), '#2f8f5a'));
    scatter(kit, gatesRect, kit.count(4, 2), 20, 14, (x, y) => addPillar(kit, x + 10, y + 10, 120, 18, '#d2d6db'));
    scatter(kit, gatesRect, kit.count(4, 2), 14, 8, (x, y) => addBin(kit, x + 7, y + 6, '#3b4250'));
    scatter(kit, gatesRect, kit.count(3, 1), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: rng.chance(0.5) ? 'down' : 'up', wood: '#2b4f8c' }));

    // ---------------------------------------------------------- escalators + security
    kit.block({ x: 0, y: divTop - 16, w: W, h: divBot - divTop + 16 });
    const upX = Math.round(W * 0.36);
    const downX = Math.round(W * 0.64);
    const up = kit.escalator({ x: upX, yTop: divTop - 44, yBottom: divBot + 40, dir: 'up', connect: 'top' });
    kit.escalator({ x: downX, yTop: divTop - 44, yBottom: divBot + 40, dir: 'down' });
    for (const ex of [upX, downX]) kit.block({ x: ex - 24, y: divTop - 50, w: 48, h: 50 });
    let rx = 0;
    for (const [g0, g1] of [[upX - 22, upX + 22], [downX - 22, downX + 22], [W, W]]) {
      const x0 = rx;
      const x1 = g0;
      kit.addProp({ y: divTop, bounds: { x: x0, y: divTop - 30, w: x1 - x0, h: 32 }, draw: (ctx) => glassRail(ctx, x0, x1, divTop) });
      rx = g1;
    }

    const encL = upX - 80;
    const encR = upX + 80;
    const encBot = divBot + 112;
    kit.block({ x: encL, y: divBot, w: encR - encL, h: encBot - divBot + 2 });
    kit.block({ x: encL - 4, y: divBot, w: 6, h: encBot - divBot + 4 });
    kit.block({ x: encR - 2, y: divBot, w: 6, h: encBot - divBot + 4 });
    kit.block({ x: encL - 4, y: encBot - 2, w: encR - encL + 8, h: 5 });
    const lanes = W > 2200 ? 3 : 2;
    const queueLen = 7;
    kit.block({ x: encL, y: encBot, w: encR - encL, h: 14 + queueLen * 12 });
    kit.addFloor({ x: encL - 6, y: divBot, w: encR - encL + 12, h: encBot - divBot + 16 + queueLen * 12 }, (ctx) => {
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(encL, divBot, encR - encL, encBot - divBot);
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(encL - 3, divBot, 4, encBot - divBot);
      ctx.fillRect(encR - 1, divBot, 4, encBot - divBot);
      text(ctx, 'SECURITY', upX, divBot + 70, { size: 10, colour: 'rgba(31,45,74,0.55)' });
      for (let k = 0; k <= lanes; k++) {
        const lx = upX + (k - lanes / 2) * 46;
        ctx.strokeStyle = '#1f6fbf';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(lx, encBot + 4);
        ctx.lineTo(lx, encBot + 14 + queueLen * 12);
        ctx.stroke();
        ctx.fillStyle = '#555';
        for (let y = encBot + 4; y <= encBot + 14 + queueLen * 12; y += 30) ctx.fillRect(lx - 1, y - 9, 2, 10);
      }
    });
    for (let k = 0; k < lanes; k++) {
      const lx = Math.round(upX + (k - (lanes - 1) / 2) * 46);
      const slots = Array.from({ length: queueLen }, (_, i) => ({ x: lx, y: encBot + 14 + i * 12 }));
      const gate = kit.gateQueue({ slots, entry: { x: lx, y: encBot + 22 + queueLen * 12 }, exit: { x: lx, y: encBot - 22 }, facing: 'up', serviceTime: [1.2, 2.6] });
      kit.link(gate.exitNode, up.bottom);
      kit.addProp({ y: encBot, bounds: { x: lx - 20, y: encBot - 58, w: 40, h: 60 }, draw: (ctx) => scannerArch(ctx, lx, encBot) });
      kit.station({ x: lx + 17, y: encBot - 8, uniform: 'security', dir: 'down', fixedActions: [null, 'reach', 'wave'] });
    }

    // ---------------------------------------------------------- hall: check-in
    const airlines = rng.shuffle(AIRLINES);
    const desksRight = encL - 40;
    const nDesks = Math.max(2, Math.floor((desksRight - 60) / 100));
    const deskY = divBot + 44;
    kit.addFloor({ x: 40, y: divBot, w: desksRight - 40, h: 30 }, (ctx) => {
      box(ctx, 50, divBot + 6, desksRight - 60, 12, '#5b6470', OUT, 1, 2);
      for (let x = 60; x < desksRight - 20; x += 22) box(ctx, x, divBot + 3, 12, 9, CLOTHES[(x / 22) % CLOTHES.length | 0], OUT, 0.5, 2);
    });
    for (let i = 0; i < nDesks; i++) {
      const dx = 60 + i * 100;
      const airline = airlines[Math.floor(i / 2) % airlines.length];
      kit.addProp({ y: deskY, bounds: { x: dx - 4, y: deskY - 60, w: 88, h: 64 }, draw: (ctx) => checkInDesk(ctx, dx, deskY, airline) });
      kit.block({ x: dx, y: deskY - 12, w: 80, h: 14 });
      kit.station({ x: dx + 40, y: deskY - 12, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'reach'] });
      const slots = Array.from({ length: 6 }, (_, k) => ({ x: dx + 40, y: deskY + 14 + k * 13 }));
      kit.queue({
        slots,
        facing: 'up',
        serviceTime: [4, 8],
        action: 'reach',
        weight: 3,
        exit: { x: dx + 90, y: deskY + 20 },
        requires: (agent) => agent.look.carry?.type === 'suitcase' && !agent.isWiggles,
        onServed: (agent) => {
          if (!agent.isWiggles) agent.look.carry = null;
        },
      });
    }

    // ---------------------------------------------------------- hall: baggage reclaim
    const recL = downX + 70;
    const recR = W - 60;
    const cw = Math.min(280, recR - recL - 60);
    const cxr = (recL + recR) / 2;
    const cyr = Math.round(divBot + (H - divBot) * 0.52);
    const carousel = { x: cxr - cw / 2, y: cyr - 36, w: cw, h: 72 };
    kit.block({ x: carousel.x - 4, y: carousel.y - 4, w: carousel.w + 8, h: carousel.h + 8 });
    kit.addDynamic(createCarousel(rng, carousel));
    addSignPosts(kit, carousel.x + carousel.w / 2 - 50, carousel.y - 26, 100, 'Baggage Reclaim', { colour: '#f2c230', textColour: '#1f2d4a', height: 60 });
    const reclaimSpots = [];
    for (let i = 0; i < kit.count(10, 5); i++) {
      const side = i % 4;
      if (side === 0) reclaimSpots.push({ x: carousel.x + rng.range(10, carousel.w - 10), y: carousel.y + carousel.h + 14, facing: 'up' });
      else if (side === 1) reclaimSpots.push({ x: carousel.x + rng.range(10, carousel.w - 10), y: carousel.y - 6, facing: 'down' });
      else if (side === 2) reclaimSpots.push({ x: carousel.x - 14, y: carousel.y + rng.range(12, carousel.h), facing: 'right' });
      else reclaimSpots.push({ x: carousel.x + carousel.w + 14, y: carousel.y + rng.range(12, carousel.h), facing: 'left' });
    }
    for (const s of reclaimSpots) {
      kit.poi({
        ...s,
        actions: [null, 'phone', 'reach'],
        duration: [8, 22],
        weight: 1.6,
        onDone: (agent) => {
          if (!agent.isWiggles && !agent.look.carry && agent.role !== 'staff') agent.look.carry = { type: 'suitcase', color: rng.pick(CLOTHES) };
        },
      });
    }
    for (let i = 0; i < kit.count(4, 2); i++) {
      kit.poi({ x: downX + rng.range(-60, 60), y: divBot + 80 + rng.range(0, 30), facing: 'up', actions: ['wave', 'wave', null, 'phone'], duration: [8, 20], weight: 1.3 });
    }

    // ---------------------------------------------------------- hall: other bits
    const hallRect = { x: 60, y: divBot + 150, w: W - 120, h: H - divBot - 200 };
    addKiosk(kit, { x: Math.round(W * 0.5) - 46, y: hallRect.y + 10, name: 'Runway Roasters', colour: '#5a3a26', colour2: '#e0b07a', goods: 'coffee', keeper: 'barista', queue: false, customers: 3 });
    scatter(kit, hallRect, 1, 70, 60, (x, y) => {
      const ix = x + 35;
      const iy = y + 30;
      kit.station({ x: ix, y: iy - 10, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.addProp({ y: iy, bounds: { x: ix - 34, y: iy - 70, w: 68, h: 74 }, draw: (ctx) => infoPoint(ctx, ix, iy) });
      kit.block({ x: ix - 30, y: iy - 14, w: 60, h: 16 });
      kit.poi({ x: ix - 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
      kit.poi({ x: ix + 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
    });
    scatter(kit, hallRect, kit.count(2, 1), 30, 20, (x, y) => addMachine(kit, x, y + 16, { colour: '#3a9a5b', screen: '#d8ffd8', label: 'CASH' }));
    scatter(kit, hallRect, kit.count(4, 2), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: 'down', wood: '#6b7480' }));
    scatter(kit, hallRect, kit.count(4, 2), 20, 14, (x, y) => addPlant(kit, x + 10, y + 10, rng.range(0.8, 1.1), '#2f8f5a'));
    scatter(kit, hallRect, kit.count(3, 1), 20, 14, (x, y) => addPillar(kit, x + 10, y + 10, 120, 18, '#d2d6db'));
    scatter(kit, hallRect, kit.count(3, 1), 14, 8, (x, y) => addBin(kit, x + 7, y + 6, '#3b4250'));
    for (let i = 0; i < kit.count(5, 2); i++) {
      kit.poi({ x: rng.range(80, W - 80), y: H - 36, facing: 'down', actions: [null, 'phone', 'wave'], duration: [5, 14], weight: 0.8 });
    }

    // ---------------------------------------------------------- walkable grids
    kit.grid({ x: 40, y: winBot + 26, w: W - 80, h: divTop - 40 - winBot - 26 }, 58);
    kit.grid({ x: 40, y: divBot + 26, w: W - 80, h: H - 44 - divBot - 26 }, 54);
  },
};

// ------------------------------------------------------------------ drawings
function drawPlane(ctx, x, y, s, facing, airline) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  const L = 230;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 4, L * 0.45, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  for (const wx of [-60, 70]) {
    ctx.fillRect(wx - 1, -12, 2, 12);
    ctx.beginPath();
    ctx.arc(wx, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 10, -38);
  ctx.lineTo(-L / 2 - 4, -84);
  ctx.lineTo(-L / 2 + 22, -84);
  ctx.lineTo(-L / 2 + 46, -38);
  ctx.closePath();
  ctx.fillStyle = airline.tail;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.stroke();
  box(ctx, -L / 2, -42, L, 30, airline.body, OUT, 1.2, 15);
  ctx.fillStyle = airline.stripe;
  ctx.fillRect(-L / 2 + 8, -22, L - 22, 4);
  ctx.fillStyle = '#2a3440';
  for (let wx = -L / 2 + 34; wx < L / 2 - 30; wx += 9) ctx.fillRect(wx, -33, 4, 5);
  ctx.fillRect(L / 2 - 20, -36, 11, 6);
  ctx.save();
  ctx.scale(facing, 1);
  text(ctx, airline.name, 0, -38 + 2, { size: 7, colour: airline.stripe });
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-40, -16);
  ctx.lineTo(20, -16);
  ctx.lineTo(-6, 6);
  ctx.lineTo(-66, 6);
  ctx.closePath();
  ctx.fillStyle = '#9aa3ad';
  ctx.fill();
  ctx.stroke();
  box(ctx, -34, -10, 34, 12, '#c9ced6', OUT, 0.8, 6);
  ctx.restore();
}

function createTaxiingPlane(rng, W, y) {
  const st = { x: -300, dir: 1, airline: rng.pick(AIRLINES), wait: rng.range(0, 6) };
  return {
    bounds: { x: -300, y: y - 90, w: W + 600, h: 100 },
    update(dt) {
      if (st.wait > 0) {
        st.wait -= dt;
        return;
      }
      st.x += st.dir * 46 * dt;
      if ((st.dir > 0 && st.x > W + 260) || (st.dir < 0 && st.x < -260)) {
        st.dir *= -1;
        st.airline = rng.pick(AIRLINES);
        st.wait = rng.range(3, 10);
      }
    },
    draw(ctx, t) {
      if (st.wait > 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, y + 20);
      ctx.clip();
      drawPlane(ctx, st.x, y, 0.8, st.dir, st.airline);
      if (Math.floor(t * 2) % 2) {
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(st.x, y - 36, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

function createBaggageTrain(rng, W, y) {
  const st = { x: rng.range(60, W - 60), dir: 1 };
  const carts = ['#d64545', '#2f6fbf', '#f2a33a', '#3a9a5b'];
  return {
    bounds: { x: 0, y: y - 30, w: W, h: 34 },
    update(dt) {
      st.x += st.dir * 34 * dt;
      if (st.x > W - 40) st.dir = -1;
      if (st.x < 160) st.dir = 1;
    },
    draw(ctx) {
      ctx.save();
      ctx.translate(st.x, y);
      ctx.scale(st.dir, 1);
      box(ctx, -14, -16, 26, 14, '#f2c230', OUT, 1, 3);
      box(ctx, -10, -24, 12, 9, '#a8d8ef', OUT, 0.8, 2);
      for (let i = 0; i < 3; i++) {
        const cx = -48 - i * 32;
        box(ctx, cx, -14, 28, 12, '#6b7480', OUT, 0.8, 2);
        for (let b = 0; b < 3; b++) box(ctx, cx + 2 + b * 9, -21, 7, 8, carts[(i + b) % carts.length], OUT, 0.5, 1.5);
      }
      ctx.fillStyle = '#111';
      for (let wx = -100; wx < 10; wx += 16) {
        ctx.beginPath();
        ctx.arc(wx, -1, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

function createCarousel(rng, rect) {
  const { x, y, w, h } = rect;
  const r = h / 2;
  const straight = w - h;
  const perimeter = straight * 2 + Math.PI * r * 2;
  const inset = 9;
  const bags = Array.from({ length: Math.round(perimeter / 26) }, (_, i) => ({ s: i * 26 + rng.range(0, 10), c: rng.pick(CLOTHES), show: rng.chance(0.7) }));
  const at = (s) => {
    s %= perimeter;
    const rr = r - inset;
    if (s < straight) return { px: x + r + s, py: y + inset };
    s -= straight;
    if (s < Math.PI * r) {
      const a = -Math.PI / 2 + s / r;
      return { px: x + w - r + Math.cos(a) * rr, py: y + r + Math.sin(a) * rr };
    }
    s -= Math.PI * r;
    if (s < straight) return { px: x + w - r - s, py: y + h - inset };
    s -= straight;
    const a = Math.PI / 2 + s / r;
    return { px: x + r + Math.cos(a) * rr, py: y + r + Math.sin(a) * rr };
  };
  return {
    bounds: { x: x - 4, y: y - 14, w: w + 8, h: h + 18 },
    update(dt) {
      for (const b of bags) b.s += dt * 18;
    },
    draw(ctx) {
      box(ctx, x, y, w, h, '#4a5260', OUT, 1.2, r);
      box(ctx, x + 18, y + 18, w - 36, h - 36, '#9aa3ad', OUT, 1, r - 18);
      for (const b of bags) {
        if (!b.show) continue;
        const { px, py } = at(b.s);
        box(ctx, px - 5, py - 6, 10, 8, b.c, OUT, 0.6, 2);
      }
    },
  };
}

function glassRail(ctx, x0, x1, y) {
  if (x1 - x0 < 4) return;
  ctx.fillStyle = 'rgba(170,215,235,0.4)';
  ctx.fillRect(x0, y - 22, x1 - x0, 20);
  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(x0, y - 25, x1 - x0, 4);
  ctx.fillRect(x0, y - 2, x1 - x0, 3);
}

function gateDesk(ctx, x, y, label, flight, t) {
  ctx.fillStyle = '#3b4250';
  ctx.fillRect(x - 2, y - 70, 4, 40);
  box(ctx, x - 40, y - 74, 80, 24, '#1f2d4a', OUT, 1, 3);
  text(ctx, label, x - 20, y - 66, { size: 8, colour: '#ffcf3f' });
  text(ctx, flight.city, x + 14, y - 66, { size: 6, colour: '#fff', maxWidth: 44 });
  text(ctx, Math.floor(t) % 4 < 2 ? 'BOARDING' : flight.airline.name, x, y - 56, { size: 6, colour: '#9ff09a', maxWidth: 70 });
  box(ctx, x - 40, y - 18, 80, 18, '#e9e2d0', OUT, 1, 3);
  box(ctx, x - 42, y - 22, 84, 5, '#1f2d4a', OUT, 0.8, 2);
}

function checkInDesk(ctx, x, y, airline) {
  box(ctx, x + 6, y - 58, 68, 16, airline.stripe, OUT, 1, 3);
  text(ctx, airline.name, x + 40, y - 50, { size: 7.5, colour: '#fff', maxWidth: 62 });
  ctx.fillStyle = '#3b4250';
  ctx.fillRect(x + 38, y - 42, 4, 22);
  box(ctx, x, y - 18, 80, 18, '#d2d6db', OUT, 1, 2);
  box(ctx, x - 2, y - 22, 84, 5, airline.stripe, OUT, 0.8, 2);
  box(ctx, x + 56, y - 10, 20, 9, '#5b6470', OUT, 0.6, 1);
}

function scannerArch(ctx, x, y) {
  box(ctx, x - 14, y - 52, 4, 52, '#9aa3ad', OUT, 0.8);
  box(ctx, x + 10, y - 52, 4, 52, '#9aa3ad', OUT, 0.8);
  box(ctx, x - 15, y - 56, 30, 6, '#5b6470', OUT, 0.8, 2);
  ctx.fillStyle = '#9ff09a';
  ctx.fillRect(x - 4, y - 55, 8, 3);
}

function infoPoint(ctx, x, y) {
  box(ctx, x - 30, y - 18, 60, 18, '#1f6fbf', OUT, 1, 8);
  box(ctx, x - 32, y - 22, 64, 5, '#e9e2d0', OUT, 0.8, 3);
  ctx.fillStyle = '#3b4250';
  ctx.fillRect(x - 1.5, y - 66, 3, 44);
  ctx.beginPath();
  ctx.arc(x, y - 70, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#f2c230';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.stroke();
  text(ctx, '?', x, y - 70, { size: 14, colour: '#1f2d4a' });
}

function flightScreen(kit, x, y) {
  const city = kit.rng.pick(CITIES);
  kit.addProp({
    y,
    bounds: { x: x - 24, y: y - 92, w: 48, h: 94 },
    draw: (ctx, t) => {
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(x - 2, y - 60, 4, 60);
      box(ctx, x - 22, y - 90, 44, 32, '#14171c', OUT, 1, 3);
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = r === Math.floor(t) % 4 ? '#ffcf3f' : '#6fa8dc';
        ctx.fillRect(x - 18, y - 84 + r * 7, 22, 3);
        ctx.fillStyle = '#9ff09a';
        ctx.fillRect(x + 7, y - 84 + r * 7, 10, 3);
      }
      text(ctx, city, x, y - 52, { size: 5, colour: '#222', maxWidth: 46 });
    },
  });
  kit.block({ x: x - 3, y: y - 3, w: 6, h: 4 });
  kit.poi({ x, y: y + 20, facing: 'up', actions: [null, 'phone'], duration: [4, 10], weight: 1 });
}

function playArea(kit, x, y) {
  const w = 120;
  const h = 70;
  kit.addFloor({ x, y, w, h }, (ctx) => {
    const colours = ['#ff6fb5', '#ffd23f', '#3bceac', '#5b8def'];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = colours[(i + j) % 4];
        ctx.fillRect(x + i * (w / 4), y + j * (h / 3), w / 4, h / 3);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeRect(x, y, w, h);
  });
  const sx = x + w - 34;
  const sy = y + 30;
  kit.addProp({
    y: sy,
    bounds: { x: sx - 30, y: sy - 46, w: 64, h: 50 },
    draw: (ctx) => {
      box(ctx, sx, sy - 42, 26, 42, '#5b8def', OUT, 1, 3);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 38);
      ctx.quadraticCurveTo(sx - 16, sy - 20, sx - 28, sy);
      ctx.lineTo(sx - 18, sy);
      ctx.quadraticCurveTo(sx - 8, sy - 18, sx, sy - 28);
      ctx.closePath();
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.stroke();
    },
  });
  kit.block({ x: sx - 4, y: sy - 8, w: 30, h: 9 });
  for (let i = 0; i < 4; i++) {
    kit.poi({ x: x + 14 + i * 22, y: y + h - 12 - (i % 2) * 20, facing: kit.rng.pick(['down', 'left', 'right']), roles: ['child'], actions: ['wave', null, 'clap'], duration: [8, 20], weight: 3 });
  }
  kit.poi({ x: x - 12, y: y + h / 2, facing: 'right', actions: ['phone', null], duration: [10, 20], weight: 1.2 });
}

