import { box, text, OUT, shade, lampPost3d } from './props.js';
import { drawBox, onFront, poly } from './draw3d.js';

const ACCENTS = ['#d97954', '#3b9290', '#e0b64e', '#6f799b', '#a65f7a'];

export function addFacade(kit, { x, y, w, name, colour = '#b77254', floors = 2, style = 'village' }) {
  const { P } = kit;
  const z = kit.floorZ(x, y);
  const h = floors * 36 + 64;
  kit.addProp({
    y, box: { x, y: y - 20, w, d: 20, h: h + 30, z },
    solid: { x, y, w, h, z }, block: { x, y: y - 30, w, h: 30 },
    draw: (ctx) => onFront(ctx, P, x, y, z, (c) => {
      box(c, 0, -h, w, h, colour, OUT, 1);
      box(c, -3, -h - 5, w + 6, 8, '#eee1bf', OUT, .8);
      if (style === 'village') {
        poly(c, [[-7, -h - 6], [w / 2, -h - 31], [w + 7, -h - 6]], '#61716a', OUT, 1);
        for (let dx = 0; dx < w; dx += 14) {
          c.strokeStyle = '#8f9b84';
          c.lineWidth = .5;
          c.beginPath(); c.moveTo(w / 2, -h - 29); c.lineTo(dx, -h - 6); c.stroke();
        }
      }
      for (let floor = 0; floor < floors; floor++) {
        for (let wx = 14; wx < w - 24; wx += 34) {
          const wy = -h + 12 + floor * 35;
          box(c, wx - 2, wy - 2, 23, 27, '#f8eac8', OUT, .6, 1);
          box(c, wx, wy, 19, 22, '#416c79', null);
          c.fillStyle = '#a4c5c2';
          c.fillRect(wx + 2, wy + 2, 6, 9);
          c.fillStyle = '#f8eac8'; c.fillRect(wx + 9, wy, 1, 22); c.fillRect(wx, wy + 11, 19, 1);
          box(c, wx - 4, wy + 24, 27, 5, '#4c7761', OUT, .4);
          for (let f = 0; f < 4; f++) circle(c, wx + f * 6, wy + 22, 2.4, ACCENTS[(f + floor) % ACCENTS.length]);
        }
      }
      box(c, 8, -52, w - 16, 46, '#274850', OUT, 1, 2);
      for (let wx = 13; wx < w - 14; wx += 19) {
        box(c, wx, -46, 14, 32, '#719c9e', '#b9d1c5', .7, 2);
        c.fillStyle = '#eadca7';
        c.fillRect(wx + 3, -26, 8, 11);
      }
      box(c, 4, -68, w - 8, 17, '#f6e7c7', OUT, .8, 2);
      text(c, name, w / 2, -59, { size: 9, colour: '#354d50', maxWidth: w - 14 });
      c.fillStyle = '#f4dfb0';
      c.fillRect(0, -5, w, 5);
    }),
  });
}

export function circle(c, x, y, r, fill, stroke = null) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = .65; c.stroke(); }
}

export function addTree(kit, x, y, r = 30) {
  const z = kit.floorZ(x, y), { P } = kit;
  kit.addProp({
    y, box: { x: x - r, y: y - 10, w: r * 2, d: 20, h: r * 2.6, z },
    solid: { x: x - r * .7, y, w: r * 1.4, h: r * 1.5, z: z + r },
    block: { x: x - 9, y: y - 9, w: 18, h: 18 },
    draw: (ctx) => onFront(ctx, P, x, y, z, (c) => {
      box(c, -r * .6, -7, r * 1.2, 10, '#b19e76', OUT, .8, 3);
      box(c, -4, -r * 2, 8, r * 2, '#78573d', OUT, .8);
      for (const [dx, dy, size] of [[-1, -1.7, .62], [-.6, -2.1, .65], [.3, -2.1, .68], [.8, -1.65, .6], [0, -1.4, .65]]) {
        circle(c, dx * r * .65, dy * r, r * size, '#527b55', '#365947');
        circle(c, (dx * .65 - .15) * r, (dy - .15) * r, r * size * .6, '#74965b');
      }
    }),
  });
}

export function addTable(kit, x, y, { colour = '#5c8981', umbrella = false } = {}) {
  const { P } = kit, z = kit.floorZ(x, y);
  kit.addProp({
    y, box: { x: x - 27, y: y - 18, w: 54, d: 25, h: umbrella ? 90 : 24, z },
    solid: { x: x - 17, y, w: 34, h: 16, z: z + 8 }, block: { x: x - 19, y: y - 14, w: 38, h: 18 },
    draw: (ctx) => {
      drawBox(ctx, P, { x: x - 3, y: y - 2, w: 6, d: 4, h: 18, z }, { front: '#5e6156' });
      drawBox(ctx, P, { x: x - 23, y: y - 16, w: 46, d: 24, h: 3, z: z + 19 }, { front: colour, top: shade(colour, .2) });
      onFront(ctx, P, x, y, z, (c) => {
        box(c, -12, -27, 17, 3, '#f1deb3', OUT, .4, 1);
        box(c, 8, -29, 5, 7, '#fff7d9', OUT, .4, 1);
        if (umbrella) {
          c.strokeStyle = '#6e6854'; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(0, -22); c.lineTo(0, -80); c.stroke();
          for (let i = 0; i < 6; i++) {
            poly(c, [[0, -85], [-27 + i * 9, -67], [-18 + i * 9, -67]], i % 2 ? '#f3dfad' : colour, OUT, .5);
          }
        }
      });
    },
  });
  for (const [dx, dy, dir] of [[-32, 0, 'right'], [32, 0, 'left'], [-12, 23, 'up'], [12, 23, 'up']]) {
    kit.addProp({
      y: y + dy - 1, box: { x: x + dx - 9, y: y + dy - 4, w: 18, d: 8, h: 28, z },
      draw: ctx => onFront(ctx, P, x + dx, y + dy, z, c => {
        box(c, -8, -28, 16, 13, colour, OUT, .5, 2);
        box(c, -9, -15, 18, 4, '#d2b27c', OUT, .5, 1);
        for (const leg of [-7, 6]) box(c, leg, -11, 2, 11, '#715c43', OUT, .4);
      }),
    });
    kit.poi({ x: x + dx, y: y + dy, mode: 'sit', facing: dir, actions: ['read', 'phone', null], duration: [9, 22] });
  }
}

export function addFountain(kit, x, y, { radius = 55, sculpture = 'fish' } = {}) {
  const { P } = kit, r = radius, z = kit.floorZ(x, y);
  kit.block({ x: x - r, y: y - r * .5, w: r * 2, h: r });
  kit.addProp({
    y: y + r * .5, box: { x: x - r, y: y - r * .5, w: r * 2, d: r, h: 75, z },
    solid: { x: x - 13, y, w: 26, h: 50, z },
    draw: (ctx, t) => onFront(ctx, P, x, y, z, (c) => {
      c.beginPath(); c.ellipse(0, -3, r, r * .35, 0, 0, Math.PI * 2);
      c.fillStyle = '#b5b5a0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = .8; c.stroke();
      c.beginPath(); c.ellipse(0, -8, r - 5, r * .28, 0, 0, Math.PI * 2);
      c.fillStyle = '#8abbbb'; c.fill(); c.stroke();
      box(c, -9, -49, 18, 41, '#c0c5af', OUT, .7, 3);
      if (sculpture === 'fish') {
        c.save(); c.translate(0, -58); c.rotate(-.3);
        c.beginPath(); c.ellipse(0, 0, 17, 9, 0, 0, Math.PI * 2);
        c.fillStyle = '#9ca966'; c.fill(); c.stroke();
        poly(c, [[-14, 0], [-26, -12], [-26, 9]], '#9ca966', OUT, .6);
        circle(c, 9, -2, 1.4, OUT); c.restore();
      } else {
        circle(c, 0, -58, 16, '#c9a75e', OUT);
        text(c, 'C', 0, -58, { size: 19, colour: '#f8e8b6' });
      }
      c.strokeStyle = '#d4ece3'; c.lineWidth = 1.3;
      for (let i = 0; i < 6; i++) {
        const dx = (i - 2.5) * 9;
        c.beginPath(); c.moveTo(0, -48); c.quadraticCurveTo(dx * 1.7, -68, dx, -9 + Math.sin(t * 2 + i) * 2); c.stroke();
      }
    }),
  });
  for (let i = 0; i < 6; i++) {
    kit.poi({ x: x - r - 16 + i * (r * 2 + 32) / 5, y: y + r * .5 + 16, facing: 'up', actions: ['wave', 'phone', null], weight: 1.4 });
  }
}

export function addBunting(kit, x, y, w, label = '') {
  const { P } = kit, z = kit.floorZ(x, y);
  kit.addProp({
    y, box: { x, y, w, d: 1, h: 96, z },
    draw: (ctx) => onFront(ctx, P, x, y, z, (c) => {
      c.strokeStyle = '#746449'; c.lineWidth = .9;
      c.beginPath(); c.moveTo(0, -94); c.quadraticCurveTo(w / 2, -66, w, -94); c.stroke();
      for (let i = 8; i < w - 8; i += 17) {
        const sy = -94 + 28 * (i / w) * (1 - i / w);
        poly(c, [[i, sy], [i + 12, sy + 1], [i + 6, sy + 15]], ACCENTS[Math.floor(i / 17) % ACCENTS.length], OUT, .4);
      }
      if (label) { box(c, w / 2 - 65, -105, 130, 19, '#f8e6bb', OUT, .7, 2); text(c, label, w / 2, -95, { size: 10, colour: '#3d6865' }); }
    }),
  });
}

export function addStreetLamp(kit, x, y) {
  const z = kit.floorZ(x, y), { P } = kit;
  kit.addProp({ y, box: { x: x - 10, y, w: 20, d: 2, h: 100, z }, draw: c => lampPost3d(c, P, x, y, 86, '#3a6056', z) });
  kit.block({ x: x - 3, y: y - 3, w: 6, h: 6 });
}
