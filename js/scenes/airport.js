import { addKiosk, addBench, addPlant, addPillar, addBin, addMachine, scatter, addSignPosts, addStanchionLines } from './builders.js';
import { gridLines, box, text, frontWall, infoDesk3d, OUT } from './props.js';
import { drawBox, onFront, poly, sideQuad } from './draw3d.js';
import { projectBox } from '../core/projection.js';
import { CLOTHES } from '../game/people.js';
import { AIRCRAFT_BOUNDS, drawAircraft } from './transport.js';

const AIRLINES = [
  { name: 'Puffin Air', body: '#ffffff', stripe: '#1f6fbf', tail: '#f2a33a' },
  { name: 'Zephyr Wings', body: '#ffffff', stripe: '#7d4bb3', tail: '#7d4bb3' },
  { name: 'Bumblebee', body: '#fff7d6', stripe: '#2c2c2c', tail: '#f4c430' },
  { name: 'Nimbus Jet', body: '#f4f7fb', stripe: '#d64545', tail: '#d64545' },
  { name: 'Kiwi Cloud', body: '#ffffff', stripe: '#3a9a5b', tail: '#1f2d4a' },
];
const CITIES = ['Port Pemberly', 'Sunnyvale-on-Sea', 'Glimmerholm', 'Frostwick', 'Isla Marzipan', 'Cobbleton', 'New Doodleburg', 'Lake Tumbleweed', 'Saint Snuffle', 'Pebble Point'];
const E = 56; // the gates level sits one storey above the hall

export const airport = {
  id: 'skyhaven-international',
  title: 'Skyhaven International',
  kind: 'Airport',
  blurb: 'Check-in queues, moving walkways and planes galore.',
  aspect: 1.15,
  crowdFactor: 1.05,
  thumbColour: '#1f6fbf',
  view: { topPad: 230, bottomPad: 24 },
  build(kit) {
    const { W, H, rng, P } = kit;
    kit.background = '#9fd0ee';
    const apronBot = Math.round(H * 0.2);
    const winBot = apronBot + 18;
    const divTop = Math.round(H * 0.6);
    const divBot = divTop + 46;
    kit.defineLevel('gates', { x: 0, y: 0, w: W, h: divTop }, { z: E });
    kit.defineLevel('hall', { x: 0, y: divTop, w: W, h: H - divTop }, { z: 0 });
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

    kit.backdrop = (ctx) => airportBackdrop(ctx, P, W, H, winBot, divTop);

    // ---------------------------------------------------------- apron
    const nP = Math.max(2, Math.floor(W / 460));
    const parked = Array.from({ length: nP }, (_, i) => ({
      x: (W * (i + 0.5)) / nP,
      y: apronBot - 34,
      airline: AIRLINES[(i + rng.int(0, 4)) % AIRLINES.length],
      facing: i % 2 ? -1 : 1,
    }));
    kit.addFloor({ x: 0, y: 0, w: W, h: winBot }, (ctx, view) => {
      ctx.fillStyle = '#7a8088';
      ctx.fillRect(0, 0, W, apronBot);
      ctx.fillStyle = '#5f646b';
      ctx.fillRect(0, 0, W, apronBot * 0.42);
      ctx.fillStyle = '#f2f2f2';
      for (let x = Math.max(0, Math.floor(view.x / 60) * 60); x < Math.min(W, view.x + view.w); x += 60) ctx.fillRect(x, apronBot * 0.2, 30, 3);
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(0, apronBot * 0.5, W, 2.5);
      for (const p of parked) ctx.fillRect(p.x - 1, apronBot * 0.52, 2, apronBot * 0.48);
      ctx.fillStyle = '#c9ced6';
      ctx.fillRect(0, apronBot, W, winBot - apronBot);
    });
    for (const p of parked) {
      kit.addProp({ y: p.y, box: { x: p.x + AIRCRAFT_BOUNDS.x, y: p.y - 4, w: AIRCRAFT_BOUNDS.w, d: 8, h: AIRCRAFT_BOUNDS.h, z: E - 20 }, draw: (ctx) => onFront(ctx, P, p.x, p.y, E, (c) => drawAircraft(c, .95, p.facing, p.airline)) });
      const doorX = p.x + p.facing * 70;
      kit.addProp({
        y: apronBot,
        box: { x: doorX - 12, y: p.y, w: 24, d: apronBot - p.y, h: 44, z: E },
        draw: (ctx) => {
          drawBox(ctx, P, { x: doorX - 11, y: p.y + 2, w: 22, d: apronBot - p.y - 2, h: 20, z: E + 14 }, { front: '#9aa3ad' });
          drawBox(ctx, P, { x: doorX - 3, y: apronBot - 18, w: 6, d: 6, h: 14, z: E }, { front: '#5b6470' });
        },
      });
      kit.station({ x: p.x - p.facing * 40, y: apronBot - 8, uniform: 'hivis', dir: 'down', action: 'wave', fixedActions: ['wave', null, 'wave'] });
    }
    kit.addDynamic(createTaxiingPlane(rng, P, W, Math.round(apronBot * 0.32)));
    kit.addDynamic(createBaggageTrain(rng, P, W, apronBot - 10));

    // the glass curtain wall between the apron and the gates
    kit.addProp({
      y: winBot,
      box: { x: 0, y: winBot - 2, w: W, d: 4, h: 100, z: E },
      draw: (ctx) => {
        drawBox(ctx, P, { x: 0, y: winBot - 4, w: W, d: 4, h: 8, z: E }, { front: '#3b4250', top: '#5b6470' });
        poly(ctx, [P.pt(0, winBot, E + 8), P.pt(W, winBot, E + 8), P.pt(W, winBot, E + 96), P.pt(0, winBot, E + 96)], 'rgba(168,216,239,0.28)', null);
        onFront(ctx, P, 0, winBot, E, (c) => {
          c.fillStyle = '#3b4250';
          for (let x = 0; x <= W; x += 64) c.fillRect(x - 1.5, -96, 3, 96);
          c.fillRect(0, -98, W, 4);
          c.fillStyle = 'rgba(255,255,255,0.35)';
          for (let x = 20; x < W; x += 128) {
            c.beginPath();
            c.moveTo(x, -20);
            c.lineTo(x + 18, -90);
            c.lineTo(x + 26, -90);
            c.lineTo(x + 8, -20);
            c.fill();
          }
        });
      },
    });

    // ---------------------------------------------------------- floors
    kit.addFloor({ x: 0, y: winBot, w: W, h: H - winBot }, (ctx, view) => {
      ctx.fillStyle = '#e4e1da';
      ctx.fillRect(0, winBot, W, divTop - winBot);
      gridLines(ctx, { x: 0, y: winBot, w: W, h: divTop - winBot }, 48, 'rgba(0,0,0,0.06)', view);
      ctx.fillStyle = '#7c6a58';
      ctx.fillRect(0, divTop, W, divBot - divTop);
      ctx.fillStyle = '#efece6';
      ctx.fillRect(0, divBot, W, H - divBot);
      gridLines(ctx, { x: 0, y: divBot, w: W, h: H - divBot }, 40, 'rgba(0,0,0,0.06)', view);
      ctx.fillStyle = '#3b4250';
      ctx.fillRect(0, H - 14, W, 14);
      for (let x = W * 0.15; x < W; x += W * 0.35) {
        ctx.fillStyle = '#a8d8ef';
        ctx.fillRect(x, H - 13, 70, 12);
        text(ctx, 'EXIT', x + 35, H - 20, { size: 7, colour: '#1f6fbf' });
      }
    });

    // ---------------------------------------------------------- gates level
    const nG = Math.max(2, Math.floor(W / 520));
    for (let i = 0; i < nG; i++) {
      const gx = Math.round((W * (i + 0.5)) / nG);
      const deskY = winBot + 50;
      const label = `Gate ${String.fromCharCode(65 + (i % 3))}${i + 1}`;
      const flight = { city: rng.pick(CITIES), airline: rng.pick(AIRLINES) };
      kit.addProp({
        y: deskY,
        box: { x: gx - 44, y: deskY - 16, w: 88, d: 18, h: 80, z: E },
        draw: (ctx, t) => gateDesk3d(ctx, P, gx, deskY, label, flight, t),
        solid: { x: gx - 40, y: deskY, w: 80, d: 0, h: 18, z: E },
      });
      kit.block({ x: gx - 42, y: deskY - 30, w: 84, h: 32 });
      kit.station({ x: gx - 16, y: deskY - 20, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.station({ x: gx + 16, y: deskY - 20, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach'] });
      kit.queue({ slots: Array.from({ length: 6 }, (_, k) => ({ x: gx, y: deskY + 14 + k * 13 })), facing: 'up', serviceTime: [2, 5], action: 'reach', weight: 1.2 });
      for (const side of [-1, 1]) {
        for (let r = 0; r < kit.count(2, 1); r++) {
          const bx = gx + side * 70 + (side < 0 ? -96 : 0);
          const by = winBot + 118 + r * 44;
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
    scatter(kit, gatesRect, 1, 120, 70, (x, y) => playArea(kit, P, x, y));
    scatter(kit, gatesRect, kit.count(3, 1), 30, 20, (x, y) => flightScreen(kit, P, x + 15, y + 16));
    scatter(kit, gatesRect, kit.count(5, 2), 24, 18, (x, y) => addPlant(kit, x + 12, y + 10, rng.range(0.8, 1.1), '#2f8f5a'));
    scatter(kit, gatesRect, kit.count(4, 2), 24, 24, (x, y) => addPillar(kit, x + 12, y + 12, 130, 18, '#d2d6db'));
    scatter(kit, gatesRect, kit.count(4, 2), 14, 12, (x, y) => addBin(kit, x + 7, y + 8, '#3b4250'));
    scatter(kit, gatesRect, kit.count(3, 1), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: rng.chance(0.5) ? 'down' : 'up', wood: '#2b4f8c' }));

    // ---------------------------------------------------------- the drop, escalators + security
    kit.block({ x: 0, y: divTop - 16, w: W, h: divBot - divTop + 16 });
    const upX = Math.round(W * 0.36);
    const downX = Math.round(W * 0.64);
    const up = kit.escalator({ x: upX, yTop: divTop - 44, yBottom: divBot + 40, dir: 'up', connect: 'top' });
    kit.escalator({ x: downX, yTop: divTop - 44, yBottom: divBot + 40, dir: 'down' });
    for (const ex of [upX, downX]) kit.block({ x: ex - 24, y: divTop - 50, w: 48, h: 50 });
    const gaps = [[upX - 19, upX + 19], [downX - 19, downX + 19]];
    kit.addProp({
      y: divTop,
      box: { x: 0, y: divTop - 2, w: W, d: 4, h: E + 28, z: 0 },
      draw: (ctx) => {
        frontWall(ctx, P, 0, W, divTop, 0, E, '#7c6a58', gaps);
        onFront(ctx, P, 0, divTop, 0, (c) => {
          c.fillStyle = 'rgba(255,255,255,0.12)';
          for (let x = 0; x < W; x += 80) {
            if (gaps.some(([g0, g1]) => x + 60 > g0 && x < g1)) continue;
            c.fillRect(x, -E + 8, 60, E - 16);
          }
          c.fillStyle = '#1f6fbf';
          for (const [label, gx] of [['Departures ↑', upX], ['Arrivals ↓', downX]]) {
            box(c, gx + 26, -E + 10, 86, 20, '#1f6fbf', OUT, 1, 3);
            text(c, label, gx + 69, -E + 20, { size: 9, colour: '#fff' });
          }
        });
        let cursor = 0;
        for (const [g0, g1] of [...gaps, [W, W]]) {
          if (g0 > cursor) {
            poly(ctx, [P.pt(cursor, divTop, E), P.pt(g0, divTop, E), P.pt(g0, divTop, E + 22), P.pt(cursor, divTop, E + 22)], 'rgba(170,215,235,0.4)', null);
            poly(ctx, [P.pt(cursor, divTop, E + 22), P.pt(g0, divTop, E + 22), P.pt(g0, divTop, E + 25), P.pt(cursor, divTop, E + 25)], '#9aa3ad', null);
          }
          cursor = g1;
        }
      },
    });

    const encL = upX - 80;
    const encR = upX + 80;
    const encBot = divBot + 112;
    kit.block({ x: encL - 4, y: divBot, w: encR - encL + 8, h: encBot - divBot + 4 });
    const lanes = W > 2200 ? 3 : 2;
    const queueLen = 7;
    kit.block({ x: encL, y: encBot, w: encR - encL, h: 14 + queueLen * 12 });
    const laneXs = Array.from({ length: lanes }, (_, k) => Math.round(upX + (k - (lanes - 1) / 2) * 46));
    kit.addFloor({ x: encL, y: divBot, w: encR - encL, h: encBot - divBot }, (ctx) => {
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(encL, divBot, encR - encL, encBot - divBot);
      text(ctx, 'SECURITY', upX, divBot + 70, { size: 12, colour: 'rgba(31,45,74,0.45)' });
    });
    for (const side of [encL - 4, encR]) {
      kit.addProp({ y: encBot, box: { x: side, y: divBot, w: 4, d: encBot - divBot, h: 34, z: 0 }, draw: (ctx) => drawBox(ctx, P, { x: side, y: divBot, w: 4, d: encBot - divBot, h: 30, z: 0 }, { front: '#9aa3ad', top: '#c9ced6', side: 'rgba(168,216,239,0.6)' }) });
    }
    const separators = [];
    for (let k = 0; k <= lanes; k++) {
      const lx = upX + (k - lanes / 2) * 46;
      separators.push([[lx, encBot + 4], [lx, encBot + 14 + queueLen * 12]]);
    }
    addStanchionLines(kit, separators, '#1f6fbf');
    laneXs.forEach((lx) => {
      const slots = Array.from({ length: queueLen }, (_, i) => ({ x: lx, y: encBot + 14 + i * 12 }));
      const gate = kit.gateQueue({ slots, entry: { x: lx, y: encBot + 22 + queueLen * 12 }, exit: { x: lx, y: encBot - 22 }, facing: 'up', serviceTime: [1.2, 2.6] });
      kit.link(gate.exitNode, up.bottom);
      kit.station({ x: lx + 17, y: encBot - 8, uniform: 'security', dir: 'down', fixedActions: [null, 'reach', 'wave'] });
    });
    kit.addProp({
      y: encBot + 2,
      box: { x: encL - 4, y: encBot - 4, w: encR - encL + 8, d: 6, h: 60, z: 0 },
      draw: (ctx) => {
        let cursor = encL - 4;
        for (const lx of [...laneXs, encR + 4 + 15]) {
          const g0 = lx - 15;
          if (g0 > cursor) drawBox(ctx, P, { x: cursor, y: encBot - 2, w: g0 - cursor, d: 4, h: 30, z: 0 }, { front: 'rgba(168,216,239,0.55)', top: '#9aa3ad', side: 'rgba(120,170,200,0.6)' });
          cursor = lx + 15;
        }
        for (const lx of laneXs) scannerArch3d(ctx, P, lx, encBot);
      },
    });

    // ---------------------------------------------------------- hall: check-in
    const airlines = rng.shuffle(AIRLINES);
    const desksRight = encL - 40;
    const nDesks = Math.max(2, Math.floor((desksRight - 60) / 100));
    const deskY = divBot + 48;
    kit.addProp({
      y: divBot + 16,
      box: { x: 50, y: divBot + 4, w: desksRight - 60, d: 12, h: 26, z: 0 },
      draw: (ctx) => {
        drawBox(ctx, P, { x: 50, y: divBot + 4, w: desksRight - 60, d: 12, h: 12, z: 0 }, { front: '#5b6470' });
        for (let x = 60; x < desksRight - 24; x += 22) drawBox(ctx, P, { x, y: divBot + 6, w: 12, d: 8, h: 9, z: 12 }, { front: CLOTHES[(x / 22) % CLOTHES.length | 0] });
      },
    });
    for (let i = 0; i < nDesks; i++) {
      const dx = 60 + i * 100;
      const airline = airlines[Math.floor(i / 2) % airlines.length];
      kit.addProp({ y: deskY, box: { x: dx - 2, y: deskY - 14, w: 84, d: 16, h: 64, z: 0 }, draw: (ctx) => checkInDesk3d(ctx, P, dx, deskY, airline), solid: { x: dx, y: deskY, w: 80, d: 0, h: 18, z: 0 } });
      kit.block({ x: dx, y: deskY - 24, w: 80, h: 26 });
      kit.station({ x: dx + 40, y: deskY - 18, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'reach'] });
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
    kit.addDynamic(createCarousel(rng, P, carousel));
    addSignPosts(kit, carousel.x + carousel.w / 2 - 50, carousel.y - 26, 100, 'Baggage Reclaim', { colour: '#f2c230', textColour: '#1f2d4a', height: 60 });
    for (let i = 0; i < kit.count(10, 5); i++) {
      const side = i % 4;
      let spot;
      if (side === 0) spot = { x: carousel.x + rng.range(10, carousel.w - 10), y: carousel.y + carousel.h + 14, facing: 'up' };
      else if (side === 1) spot = { x: carousel.x + rng.range(10, carousel.w - 10), y: carousel.y - 6, facing: 'down' };
      else if (side === 2) spot = { x: carousel.x - 14, y: carousel.y + rng.range(12, carousel.h), facing: 'right' };
      else spot = { x: carousel.x + carousel.w + 14, y: carousel.y + rng.range(12, carousel.h), facing: 'left' };
      kit.poi({
        ...spot,
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
    addKiosk(kit, { x: Math.round(W * 0.5) - 46, y: hallRect.y + 10, name: 'Runway Roasters', colour: '#5a3a26', colour2: '#e0b07a', goods: 'coffee', keeper: 'barista', customers: 3 });
    scatter(kit, hallRect, 1, 70, 60, (x, y) => {
      const ix = x + 35;
      const iy = y + 30;
      kit.station({ x: ix, y: iy - 22, uniform: 'crew', dir: 'down', fixedActions: [null, 'reach', 'phone'] });
      kit.addProp({ y: iy, box: { x: ix - 32, y: iy - 16, w: 64, d: 18, h: 84, z: 0 }, draw: (ctx) => infoDesk3d(ctx, P, ix, iy, 0, '#1f6fbf', '#f2c230', '?'), solid: { x: ix - 30, y: iy, w: 60, d: 0, h: 20, z: 0 } });
      kit.block({ x: ix - 30, y: iy - 14, w: 60, h: 16 });
      kit.poi({ x: ix - 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
      kit.poi({ x: ix + 12, y: iy + 12, facing: 'up', actions: ['reach', null], duration: [4, 10] });
    });
    scatter(kit, hallRect, kit.count(2, 1), 30, 20, (x, y) => addMachine(kit, x, y + 16, { colour: '#3a9a5b', screen: '#d8ffd8', label: 'CASH' }));
    scatter(kit, hallRect, kit.count(4, 2), 50, 20, (x, y) => addBench(kit, { x, y: y + 16, facing: 'down', wood: '#6b7480' }));
    scatter(kit, hallRect, kit.count(4, 2), 24, 18, (x, y) => addPlant(kit, x + 12, y + 10, rng.range(0.8, 1.1), '#2f8f5a'));
    scatter(kit, hallRect, kit.count(3, 1), 24, 24, (x, y) => addPillar(kit, x + 12, y + 12, 130, 18, '#d2d6db'));
    scatter(kit, hallRect, kit.count(3, 1), 14, 12, (x, y) => addBin(kit, x + 7, y + 8, '#3b4250'));
    for (let i = 0; i < kit.count(5, 2); i++) {
      kit.poi({ x: rng.range(80, W - 80), y: H - 36, facing: 'down', actions: [null, 'phone', 'wave'], duration: [5, 14], weight: 0.8 });
    }

    // ---------------------------------------------------------- walkable grids
    kit.grid({ x: 40, y: winBot + 26, w: W - 80, h: divTop - 40 - winBot - 26 }, 58);
    kit.grid({ x: 40, y: divBot + 26, w: W - 80, h: H - 44 - divBot - 26 }, 54);
  },
};

// ------------------------------------------------------------------ drawings
function airportBackdrop(ctx, P, W, H, winBot, divTop) {
  const horizon = P.Y(0, E);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#6fb6e6');
  g.addColorStop(1, '#d6eefa');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, P.width, horizon + 2);
  ctx.fillStyle = '#a9cf8e';
  ctx.fillRect(0, horizon, P.width, P.height - horizon);
  onFront(ctx, P, 0, 0, E, (c) => {
    c.fillStyle = '#9cc58a';
    c.beginPath();
    c.moveTo(-200, 0);
    for (let x = -200; x <= W + 200; x += 80) c.lineTo(x, -18 - Math.abs(Math.sin(x * 0.007)) * 46);
    c.lineTo(W + 200, 0);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[W * 0.15, -200, 26], [W * 0.18, -206, 20], [W * 0.62, -240, 30], [W * 0.66, -236, 22], [W * 0.88, -190, 18]]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.arc(x + r, y + 6, r * 0.8, 0, Math.PI * 2);
      c.arc(x - r, y + 8, r * 0.7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#5b6470';
    c.fillRect(W * 0.78, -120, 18, 120);
    box(c, W * 0.78 - 16, -146, 50, 28, '#a8d8ef', OUT, 1.5, 4);
  });
  for (const x of [0, W]) {
    poly(ctx, [P.pt(x, winBot, E), P.pt(x, divTop, E), P.pt(x, divTop, 0), P.pt(x, H, 0), P.pt(x, H, E + 120), P.pt(x, winBot, E + 120)], '#c9d3dc', OUT, 1);
    for (let y = winBot + 40; y < H - 60; y += 140) sideQuad(ctx, P, x, y, y + 100, (y < divTop ? E : 0) + 30, E + 110, '#a8d8ef', '#5b6470', 1.2);
  }
}

function createTaxiingPlane(rng, P, W, y) {
  const st = { x: -300, dir: 1, airline: rng.pick(AIRLINES), wait: rng.range(0, 6) };
  return {
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
    parts() {
      if (st.wait > 0) return [];
      return [{
        sortY: y,
        bounds: projectBox(P, { x: st.x + AIRCRAFT_BOUNDS.x * .8, y, w: AIRCRAFT_BOUNDS.w * .8, d: 1, h: AIRCRAFT_BOUNDS.h * .8, z: E - 20 * .8 }, 6),
        draw: (ctx, t) => onFront(ctx, P, st.x, y, E, (c) => {
          drawAircraft(c, .8, st.dir, st.airline);
          if (Math.floor(t * 2) % 2) {
            c.fillStyle = '#ff3b3b';
            c.beginPath();
            c.arc(0, -36, 2.5, 0, Math.PI * 2);
            c.fill();
          }
        }),
      }];
    },
  };
}

function createBaggageTrain(rng, P, W, y) {
  const st = { x: rng.range(160, W - 60), dir: 1 };
  const carts = ['#d64545', '#2f6fbf', '#f2a33a', '#3a9a5b'];
  return {
    update(dt) {
      st.x += st.dir * 34 * dt;
      if (st.x > W - 40) st.dir = -1;
      if (st.x < 160) st.dir = 1;
    },
    parts() {
      const x0 = st.dir > 0 ? st.x - 110 : st.x - 14;
      return [{
        sortY: y + 8,
        bounds: projectBox(P, { x: x0 - 10, y: y - 6, w: 140, d: 16, h: 30, z: E }, 4),
        draw: (ctx) => {
          drawBox(ctx, P, { x: st.x - 14, y: y - 6, w: 26, d: 14, h: 14, z: E }, { front: '#f2c230' });
          drawBox(ctx, P, { x: st.x - 8, y: y - 2, w: 12, d: 8, h: 10, z: E + 14 }, { front: 'rgba(168,216,239,0.85)' });
          for (let i = 0; i < 3; i++) {
            const cx = st.x - st.dir * (40 + i * 32) - 14;
            drawBox(ctx, P, { x: cx, y: y - 5, w: 28, d: 12, h: 10, z: E }, { front: '#6b7480' });
            for (let b = 0; b < 3; b++) drawBox(ctx, P, { x: cx + 2 + b * 9, y: y - 3, w: 7, d: 8, h: 8, z: E + 10 }, { front: carts[(i + b) % carts.length] });
          }
        },
      }];
    },
  };
}

function createCarousel(rng, P, rect) {
  const { x, y, w, h } = rect;
  const r = h / 2;
  const straight = w - h;
  const perimeter = straight * 2 + Math.PI * r * 2;
  const bags = Array.from({ length: Math.round(perimeter / 26) }, (_, i) => ({ s: i * 26 + rng.range(0, 10), c: rng.pick(CLOTHES), show: rng.chance(0.7) }));
  const at = (s, inset) => {
    s = ((s % perimeter) + perimeter) % perimeter;
    const rr = r - inset;
    if (s < straight) return [x + r + s, y + inset];
    s -= straight;
    if (s < Math.PI * r) {
      const a = -Math.PI / 2 + s / r;
      return [x + w - r + Math.cos(a) * rr, y + r + Math.sin(a) * rr];
    }
    s -= Math.PI * r;
    if (s < straight) return [x + w - r - s, y + h - inset];
    s -= straight;
    const a = Math.PI / 2 + s / r;
    return [x + r + Math.cos(a) * rr, y + r + Math.sin(a) * rr];
  };
  const outline = (inset, z) => Array.from({ length: 48 }, (_, i) => {
    const [px, py] = at((i / 48) * perimeter, inset);
    return P.pt(px, py, z);
  });
  return {
    update(dt) {
      for (const b of bags) b.s += dt * 18;
    },
    parts() {
      return [{
        sortY: y + h,
        bounds: projectBox(P, { x: x - 4, y: y - 4, w: w + 8, d: h + 8, h: 26, z: 0 }, 4),
        draw: (ctx) => {
          // the camera sees the near half of the side wall
          const base = outline(0, 0);
          const top = outline(0, 10);
          for (let i = 0; i < 48; i++) {
            const j = (i + 1) % 48;
            if (base[j][1] + base[i][1] > (P.Y(y + r, 0)) * 2) poly(ctx, [base[i], base[j], top[j], top[i]], '#3a414c', null);
          }
          poly(ctx, top, '#4a5260', OUT, 1);
          poly(ctx, outline(18, 14), '#9aa3ad', OUT, 0.8);
          for (const b of bags) {
            if (!b.show) continue;
            const [px, py] = at(b.s, 9);
            drawBox(ctx, P, { x: px - 5, y: py - 4, w: 10, d: 7, h: 8, z: 10 }, { front: b.c, lw: 0.5 });
          }
        },
      }];
    },
  };
}

function gateDesk3d(ctx, P, x, y, label, flight, t) {
  onFront(ctx, P, x, y - 14, E, (c) => {
    c.fillStyle = '#3b4250';
    c.fillRect(-2, -70, 4, 52);
    box(c, -40, -78, 80, 24, '#1f2d4a', OUT, 1, 3);
    text(c, label, -20, -70, { size: 8, colour: '#ffcf3f' });
    text(c, flight.city, 14, -70, { size: 6, colour: '#fff', maxWidth: 44 });
    text(c, Math.floor(t) % 4 < 2 ? 'BOARDING' : flight.airline.name, 0, -60, { size: 6, colour: '#9ff09a', maxWidth: 70 });
  });
  drawBox(ctx, P, { x: x - 40, y: y - 14, w: 80, d: 14, h: 18, z: E }, { front: '#e9e2d0', top: '#1f2d4a' });
}

function checkInDesk3d(ctx, P, x, y, airline) {
  onFront(ctx, P, x, y - 12, 0, (c) => {
    c.fillStyle = '#3b4250';
    c.fillRect(38, -44, 4, 26);
    box(c, 6, -62, 68, 16, airline.stripe, OUT, 1, 3);
    text(c, airline.name, 40, -54, { size: 7.5, colour: '#fff', maxWidth: 62 });
  });
  drawBox(ctx, P, { x, y: y - 12, w: 80, d: 12, h: 18, z: 0 }, { front: '#d2d6db', top: airline.stripe });
  drawBox(ctx, P, { x: x + 56, y: y - 10, w: 20, d: 10, h: 6, z: 0 }, { front: '#5b6470' });
}

function scannerArch3d(ctx, P, x, y) {
  drawBox(ctx, P, { x: x - 15, y: y - 6, w: 4, d: 8, h: 52, z: 0 }, { front: '#9aa3ad' });
  drawBox(ctx, P, { x: x + 11, y: y - 6, w: 4, d: 8, h: 52, z: 0 }, { front: '#9aa3ad' });
  drawBox(ctx, P, { x: x - 16, y: y - 7, w: 32, d: 10, h: 6, z: 52 }, { front: '#5b6470' });
  onFront(ctx, P, x, y + 3, 52, (c) => {
    c.fillStyle = '#9ff09a';
    c.fillRect(-4, 1, 8, 3);
  });
}

function flightScreen(kit, P, x, y) {
  const city = kit.rng.pick(CITIES);
  const z = kit.floorZ(x, y);
  kit.addProp({
    y,
    box: { x: x - 24, y: y - 4, w: 48, d: 6, h: 96, z },
    draw: (ctx, t) => onFront(ctx, P, x, y, z, (c) => {
      c.fillStyle = '#3b4250';
      c.fillRect(-2, -60, 4, 60);
      box(c, -22, -90, 44, 32, '#14171c', OUT, 1, 3);
      for (let r = 0; r < 4; r++) {
        c.fillStyle = r === Math.floor(t) % 4 ? '#ffcf3f' : '#6fa8dc';
        c.fillRect(-18, -84 + r * 7, 22, 3);
        c.fillStyle = '#9ff09a';
        c.fillRect(7, -84 + r * 7, 10, 3);
      }
      text(c, city, 0, -52, { size: 5, colour: '#222', maxWidth: 46 });
    }),
    solid: { x: x - 22, y, w: 44, d: 0, h: 32, z: z + 58 },
  });
  kit.block({ x: x - 3, y: y - 3, w: 6, h: 4 });
  kit.poi({ x, y: y + 20, facing: 'up', actions: [null, 'phone'], duration: [4, 10], weight: 1 });
}

function playArea(kit, P, x, y) {
  const w = 120;
  const h = 70;
  const z = kit.floorZ(x, y);
  kit.addFloor({ x, y, w, h }, (ctx) => {
    const colours = ['#ff6fb5', '#ffd23f', '#3bceac', '#5b8def'];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = colours[(i + j) % 4];
        ctx.fillRect(x + i * (w / 4), y + j * (h / 3), w / 4, h / 3);
      }
    }
  });
  const sx = x + w - 34;
  const sy = y + 30;
  kit.addProp({
    y: sy,
    box: { x: sx - 30, y: sy - 12, w: 60, d: 14, h: 46, z },
    draw: (ctx) => {
      drawBox(ctx, P, { x: sx, y: sy - 12, w: 26, d: 12, h: 40, z }, { front: '#5b8def' });
      poly(ctx, [P.pt(sx, sy - 10, z + 38), P.pt(sx, sy - 2, z + 38), P.pt(sx - 28, sy - 2, z), P.pt(sx - 28, sy - 10, z)], '#ffd23f', OUT, 0.8);
    },
  });
  kit.block({ x: sx - 30, y: sy - 12, w: 58, h: 14 });
  for (let i = 0; i < 4; i++) {
    kit.poi({ x: x + 14 + i * 22, y: y + h - 12 - (i % 2) * 20, facing: kit.rng.pick(['down', 'left', 'right']), roles: ['child'], actions: ['wave', null, 'clap'], duration: [8, 20], weight: 3 });
  }
  kit.poi({ x: x - 12, y: y + h / 2, facing: 'right', actions: ['phone', null], duration: [10, 20], weight: 1.2 });
}
