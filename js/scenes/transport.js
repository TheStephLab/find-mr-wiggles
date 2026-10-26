import { box, text, shade, OUT } from './props.js';
import { poly, onFront, sideQuad } from './draw3d.js';

export const AIRCRAFT_BOUNDS = { x: -134, y: -92, w: 266, h: 112 };
const ART_SCALE = 3;
const aircraft = new WeakMap();
const metro = new Map();

function artwork(bounds, draw) {
  const w = Math.ceil(bounds.w * ART_SCALE);
  const h = Math.ceil(bounds.h * ART_SCALE);
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = canvas.getContext('2d');
  c.setTransform(ART_SCALE, 0, 0, ART_SCALE, -bounds.x * ART_SCALE, -bounds.y * ART_SCALE);
  draw(c);
  return canvas;
}

function metal(c, y0, y1, colour = '#eef1ee') {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(.25, colour);
  g.addColorStop(.6, colour);
  g.addColorStop(1, '#82959f');
  return g;
}

function oval(c, x, y, rx, ry, colour, stroke = null) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = colour;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}

/** Static aircraft artwork, including readable lettering in either direction. */
export function drawAircraft(c, scale, facing, airline) {
  let views = aircraft.get(airline);
  if (!views) aircraft.set(airline, (views = new Map()));
  if (!views.has(facing)) {
    views.set(facing, artwork(AIRCRAFT_BOUNDS, (a) => {
      a.scale(facing, 1);
      paintAircraft(a, airline, facing);
    }));
  }
  c.drawImage(views.get(facing), AIRCRAFT_BOUNDS.x * scale, AIRCRAFT_BOUNDS.y * scale, AIRCRAFT_BOUNDS.w * scale, AIRCRAFT_BOUNDS.h * scale);
}

function paintAircraft(c, airline, facing) {
  c.lineWidth = .65;
  c.lineJoin = 'round';
  oval(c, 0, 5, 117, 7, 'rgba(25,37,45,.16)');

  // Far wing, nacelle and tailplane sit behind the fuselage.
  poly(c, [[16, -33], [-37, -62], [-80, -59], [-46, -34]], '#a4b4bd', '#566d7c', .65);
  poly(c, [[-48, -57], [-79, -59], [-82, -64], [-77, -64]], airline.stripe, null);
  box(c, -29, -46, 29, 10, '#a5b5bd', '#566d7c', .65, 5);
  poly(c, [[-74, -34], [-111, -52], [-131, -50], [-109, -29]], '#cbd4d9', '#566d7c', .65);
  poly(c, [[-110, -38], [-115, -88], [-96, -88], [-67, -37]], airline.tail, OUT, .8);
  poly(c, [[-110, -82], [-102, -82], [-80, -45], [-86, -45]], 'rgba(255,255,255,.3)', null);
  oval(c, -101, -69, 7, 7, '#fff4d9');
  poly(c, [[-106, -68], [-101, -72], [-94, -70], [-101, -68], [-103, -65]], airline.stripe, null);

  for (const [x, y] of [[-30, -9], [99, -15]]) {
    c.strokeStyle = '#5b6c78';
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x, 1);
    c.lineTo(x + 5, 1);
    c.stroke();
    for (const dx of [-2.5, 2.5]) {
      oval(c, x + dx, 2, 3.1, 4, '#27333c', '#17232c');
      oval(c, x + dx, 2, 1.25, 1.7, '#9dabb0');
    }
  }

  c.beginPath();
  c.moveTo(-119, -29);
  c.bezierCurveTo(-112, -34, -104, -44, -87, -45);
  c.lineTo(86, -45);
  c.bezierCurveTo(103, -45, 115, -37, 126, -29);
  c.bezierCurveTo(130, -25, 120, -18, 104, -16);
  c.bezierCurveTo(40, -13, -72, -13, -95, -20);
  c.quadraticCurveTo(-110, -24, -119, -29);
  c.closePath();
  c.fillStyle = metal(c, -46, -14, airline.body);
  c.fill();
  c.strokeStyle = '#546a79';
  c.lineWidth = .8;
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = airline.stripe;
  c.fillRect(-117, -25, 244, 3.3);
  c.fillStyle = 'rgba(255,255,255,.65)';
  c.fillRect(-107, -42, 204, 1.2);
  c.restore();

  for (const x of [-82, 77]) {
    box(c, x, -40, 7, 20, 'rgba(241,244,238,.7)', '#7b8e95', .5, 2.8);
    box(c, x + 1.8, -37, 3.4, 4, '#263d50', null, 0, 1);
    c.fillStyle = airline.stripe;
    c.fillRect(x + 4.5, -28, 1.6, .7);
  }
  for (let x = -67; x < 70; x += 8.4) {
    box(c, x, -34.5, 4.2, 5.2, '#253f54', '#9badb5', .5, 1.7);
    c.fillStyle = '#bddde7';
    c.fillRect(x + .8, -33.8, 1.2, 1.6);
  }
  poly(c, [[94, -41], [105, -38], [111, -33], [95, -34]], '#263f52', '#9bacb6', .7);
  poly(c, [[108, -37], [117, -32], [114, -31], [112, -33]], '#263f52', null);
  c.strokeStyle = '#b7cbd0';
  c.lineWidth = .7;
  c.beginPath();
  c.moveTo(102, -39);
  c.lineTo(103, -33);
  c.stroke();
  c.save();
  c.scale(facing, 1);
  text(c, airline.name.toUpperCase(), 0, -40, { size: 6, colour: airline.stripe });
  c.restore();

  poly(c, [[22, -23], [-29, -25], [-99, 10], [-48, 14]], '#c7d2d8', '#637a88', .8);
  poly(c, [[22, -23], [-29, -25], [-99, 10], [-90, 10], [-26, -21]], '#edf2f0', null);
  poly(c, [[-99, 10], [-102, 2], [-98, 2], [-90, 10]], airline.stripe, '#637a88', .45);
  c.strokeStyle = '#91a3af';
  c.lineWidth = .6;
  c.beginPath();
  c.moveTo(6, -19);
  c.lineTo(-49, 11);
  c.lineTo(-86, 8);
  c.stroke();
  poly(c, [[-18, -17], [-31, -5], [-17, -3], [-4, -16]], '#8b9da9', null);
  box(c, -38, -9, 40, 16, metal(c, -9, 7), '#5c7180', .8, 7);
  oval(c, 0, -1, 5, 7.2, '#b9c8cf', '#5c7180');
  oval(c, .7, -1, 3.5, 5.5, '#233845');
  oval(c, 1, -1, 1.15, 1.6, '#9daeb7');
  c.strokeStyle = '#718b99';
  c.lineWidth = .5;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    c.beginPath();
    c.moveTo(1, -1);
    c.lineTo(1 + Math.cos(a) * 2.8, -1 + Math.sin(a) * 4.6);
    c.stroke();
  }
  poly(c, [[-115, -28], [-91, -24], [-116, -17], [-131, -19]], '#d4dde0', '#637a88', .6);
}

/** Rounded mainline body in world space; wheels and cab remain depth-correct. */
export function drawMainlineCar(ctx, P, { x, y0, y1, w, h, z, lead, doors, livery }) {
  const side = x + w < P.cx ? x + w : x > P.cx ? x : null;
  const length = y1 - y0;
  if (side !== null) {
    sideQuad(ctx, P, side, y0 + 1, y1 - 1, z + 4, z + h - 7, shade(livery.roof, -.08), OUT);
    sideQuad(ctx, P, side, y0 + 1, y1 - 1, z + 7, z + 12, '#35434a');
    sideQuad(ctx, P, side, y0 + 2, y1 - 2, z + 17, z + 21, livery.stripe);
    sideQuad(ctx, P, side, y0 + 2, y1 - 2, z + h - 10, z + h - 9, 'rgba(255,255,255,.5)');
    for (const cy of [y0 + length * .2, y0 + length * .8]) {
      const half = Math.min(9, length * .12);
      sideQuad(ctx, P, side, cy - half, cy + half, z + 2, z + 9, '#29333a', OUT);
      for (const wy of [cy - half * .6, cy + half * .6]) {
        const ring = (r) => Array.from({ length: 12 }, (_, i) => {
          const a = i * Math.PI / 6;
          return P.pt(side, wy + Math.cos(a) * r, z + 4 + Math.sin(a) * r);
        });
        poly(ctx, ring(3.4), '#1d282d', '#81929b', .5);
        poly(ctx, ring(1.3), '#a8b4b7', null);
      }
    }
    for (let wy = y0 + 9; wy + 12 < y1 - (lead ? 12 : 4); wy += 19) {
      sideQuad(ctx, P, side, wy, wy + 12, z + 25, z + 37, '#233d4a', '#9fb3b8', .6);
      poly(ctx, [P.pt(side, wy + 1, z + 36), P.pt(side, wy + 7, z + 36), P.pt(side, wy + 11, z + 26), P.pt(side, wy + 8, z + 26)], '#668a98', null);
    }
    if (length > 35) {
      for (const f of [.27, .72]) {
        const cy = y0 + length * f;
        sideQuad(ctx, P, side, cy - 5, cy + 5, z + 12, z + 39, shade(livery.roof, .12), '#a8b9bb', .6);
        sideQuad(ctx, P, side, cy - 3.5, cy + 3.5, z + 28, z + 36, '#29434f');
        sideQuad(ctx, P, side, cy - .3, cy + .3, z + 13, z + 38, '#697e83');
        if (doors > 0) sideQuad(ctx, P, side, cy - 4 * doors, cy + 4 * doors, z + 12, z + 38, '#15242b');
        sideQuad(ctx, P, side, cy - 5, cy + 5, z + 11, z + 12, '#e8c779');
      }
    }
  }
  const roof = [[0, h - 7], [2, h - 3], [7, h], [w - 7, h], [w - 2, h - 3], [w, h - 7]];
  const tones = [-.15, .06, .32, .18, -.02];
  for (let i = 0; i < roof.length - 1; i++) {
    const [a, za] = roof[i];
    const [b, zb] = roof[i + 1];
    poly(ctx, [P.pt(x + a, y0, z + za), P.pt(x + b, y0, z + zb), P.pt(x + b, y1 - (lead ? 3 : 0), z + zb), P.pt(x + a, y1 - (lead ? 3 : 0), z + za)], shade(livery.roof, tones[i]), null);
  }
  if (length > 40) {
    for (const cy of [y0 + length * .35, y0 + length * .6]) {
      poly(ctx, [P.pt(x + 13, cy - 5, z + h), P.pt(x + w - 13, cy - 5, z + h), P.pt(x + w - 13, cy + 5, z + h), P.pt(x + 13, cy + 5, z + h)], '#86958e', '#394f50', .5);
      for (let dy = -3; dy <= 3; dy += 2) poly(ctx, [P.pt(x + 15, cy + dy, z + h + .1), P.pt(x + w - 15, cy + dy, z + h + .1), P.pt(x + w - 15, cy + dy + .6, z + h + .1), P.pt(x + 15, cy + dy + .6, z + h + .1)], '#405654', null);
    }
  }
  onFront(ctx, P, x, y1, z, (c) => {
    c.beginPath();
    c.moveTo(2, -9);
    c.lineTo(0, -h + 8);
    c.quadraticCurveTo(0, -h, 9, -h);
    c.lineTo(w - 9, -h);
    c.quadraticCurveTo(w, -h, w, -h + 8);
    c.lineTo(w - 2, -9);
    c.closePath();
    c.fillStyle = metal(c, -h, -8, lead ? livery.front : livery.roof);
    c.fill();
    c.strokeStyle = OUT;
    c.lineWidth = .65;
    c.stroke();
    if (lead) {
      box(c, 6, -h + 7, w - 12, 15, '#203744', '#718a94', .65, 4);
      poly(c, [[8, -h + 9], [17, -h + 9], [12, -h + 20], [8, -h + 20]], '#7196a2', null);
      c.strokeStyle = '#bccbd0';
      c.lineWidth = .7;
      c.beginPath();
      c.moveTo(w / 2, -h + 8);
      c.lineTo(w / 2, -h + 21);
      c.stroke();
      c.strokeStyle = '#172730';
      c.beginPath();
      c.moveTo(10, -h + 20);
      c.lineTo(17, -h + 18);
      c.moveTo(w - 10, -h + 20);
      c.lineTo(w - 17, -h + 18);
      c.stroke();
      box(c, w / 2 - 12, -h + 25, 24, 5.5, '#24342e', null, 0, 1);
      text(c, 'KESTREL', w / 2, -h + 28, { size: 3.4, colour: '#f4e5a0' });
      poly(c, [[4, -18], [w / 2, -12], [w - 4, -18], [w - 4, -14], [w / 2, -8], [4, -14]], livery.roof, null);
      for (const lx of [7, w - 7]) {
        box(c, lx - 3.8, -23, 7.6, 4.8, '#53636a', null, 0, 2);
        oval(c, lx, -20.7, 2.1, 1.6, '#fff3c4');
      }
    } else {
      box(c, w / 2 - 7, -h + 9, 14, h - 18, '#24373e', '#9dadac', .6, 3);
      box(c, w / 2 - 4, -h + 12, 8, 9, '#587583', null, 0, 2);
    }
    box(c, 5, -10, w - 10, 4, '#28383f', null, 0, 1);
    box(c, w / 2 - 4, -8, 8, 6, '#46545a', OUT, .5, 1);
  });
}

const METRO_BOUNDS = { x: -2, y: -49, w: 134, h: 49 };

function metroBody(c, lead) {
  c.beginPath();
  c.moveTo(1, -7);
  c.lineTo(1, -37);
  c.quadraticCurveTo(1, -46, 12, -46);
  c.lineTo(lead ? 112 : 120, -46);
  c.quadraticCurveTo(lead ? 123 : 129, -46, 129, lead ? -29 : -37);
  c.lineTo(129, -7);
  c.closePath();
  c.fillStyle = metal(c, -46, -7, '#e8e8db');
  c.fill();
  c.strokeStyle = OUT;
  c.lineWidth = .7;
  c.stroke();
  box(c, 5, -38, lead ? 108 : 120, 18, '#244655', null, 0, 4);
  c.fillStyle = '#2b8889';
  c.fillRect(3, -18, 124, 5);
  c.fillStyle = '#e9994e';
  c.fillRect(3, -12, 124, 2);
  for (const x of [8, 48, 68, 108]) {
    if (lead && x === 108) continue;
    box(c, x, -35, 15, 12, '#547887', '#a0bbc2', .5, 2.5);
    poly(c, [[x + 1, -34], [x + 6, -34], [x + 12, -24], [x + 8, -24]], '#8db2bd', null);
    c.fillStyle = '#2a4653';
    c.fillRect(x + 2, -25, 11, 2);
  }
  if (lead) {
    poly(c, [[111, -39], [119, -38], [126, -27], [111, -27]], '#203946', '#9fbdc4', .7);
    poly(c, [[113, -38], [117, -38], [123, -28], [119, -28]], '#7cabb8', null);
    oval(c, 125, -18, 1.6, 1.7, '#fff0be', '#607e83');
  }
  text(c, 'WHISTLE METRO', 66, -42, { size: 3.6, colour: '#40656b' });
  for (const x of [15, 99]) {
    box(c, x - 4, -8, 22, 5, '#38474c', null, 0, 1);
    for (const wx of [x, x + 10]) {
      oval(c, wx, -3.5, 3.1, 3.1, '#233138', '#819096');
      oval(c, wx, -3.5, 1.2, 1.2, '#a8b7b9');
    }
  }
}

/** Cache the fixed side artwork; only the sliding door panels are live vectors. */
export function drawMetroCar(ctx, P, { x, y0, y1, z, doors, lead, number }) {
  poly(ctx, [P.pt(x + 4, y0, z + 40), P.pt(x + 126, y0, z + 40), P.pt(x + 129, y1, z + 40), P.pt(x + 1, y1, z + 40)], '#b7c5c6', OUT, .6);
  poly(ctx, [P.pt(x + 9, y0, z + 44), P.pt(x + 120, y0, z + 44), P.pt(x + 126, y1, z + 44), P.pt(x + 4, y1, z + 44)], '#e0e8e3', null);
  for (const dx of [43, 81]) {
    poly(ctx, [P.pt(x + dx, y0 + 8, z + 44), P.pt(x + dx + 14, y0 + 8, z + 44), P.pt(x + dx + 14, y1 - 8, z + 44), P.pt(x + dx, y1 - 8, z + 44)], '#819797', '#506b70', .5);
  }
  onFront(ctx, P, x, y1, z, (c) => {
    if (!metro.has(lead)) metro.set(lead, artwork(METRO_BOUNDS, (a) => metroBody(a, lead)));
    c.drawImage(metro.get(lead), METRO_BOUNDS.x, METRO_BOUNDS.y, METRO_BOUNDS.w, METRO_BOUNDS.h);
    for (const dx of [28, 88]) {
      box(c, dx, -38, 16, 30, '#142d37', '#91a9ad', .6, 2);
      c.save();
      c.beginPath();
      c.rect(dx, -38, 16, 30);
      c.clip();
      for (const side of [-1, 1]) {
        const px = dx + (side === -1 ? 0 : 8) + side * 8 * doors;
        box(c, px, -37, 8, 29, '#c7d5d3', '#617e83', .45, 1);
        box(c, px + 1.3, -34, 5.4, 11, '#31515e', '#8cb0b8', .4, 1.5);
        c.fillStyle = '#2b8889';
        c.fillRect(px, -18, 8, 5);
        c.fillStyle = '#e6b35e';
        c.fillRect(px + (side === -1 ? 6 : 1), -22, 1, 4);
      }
      c.restore();
      c.fillStyle = '#e9bc63';
      c.fillRect(dx - 1, -8, 18, 1.3);
    }
    text(c, String(number).padStart(3, '0'), 65, -9, { size: 3.4, colour: '#40656b' });
    box(c, -4, -17, 5, 10, '#344950', OUT, .5, 1);
  });
}
