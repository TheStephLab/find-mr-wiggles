import { addKiosk, addBench, addPlant, addPillar, addMachine, scatter } from './builders.js';
import { tiles, box, text, OUT, frontWall } from './props.js';
import { onFront, poly } from './draw3d.js';
import { addFacade, addFountain, addTable } from './venue-props.js';

export const galleria = {
  id: 'copperleaf-galleria', title: 'Copperleaf Galleria', kind: 'Galleria',
  blurb: 'Window shopping, a rooftop tearoom and the great umbrella sale.',
  aspect: 1.15, crowdFactor: 1.04, thumbColour: '#ad7051', view: { topPad: 210, bottomPad: 28 },
  build(kit) {
    const { W, H, P } = kit, E = 64, edge = Math.round(H * .43), bottom = edge + 54;
    kit.background = '#e9d8b8';
    kit.roles = [{ role: 'commuter', weight: 3 }, { role: 'tourist', weight: 3 }, { role: 'child', weight: 2 }, { role: 'elderly', weight: 1 }];
    kit.defineLevel('gallery', { x: 0, y: 0, w: W, h: edge }, { z: E });
    kit.defineLevel('arcade', { x: 0, y: edge, w: W, h: H - edge });
    kit.backdrop = (ctx) => {
      poly(ctx, [P.pt(0, 0, E), P.pt(W, 0, E), P.pt(W, 0, E + 190), P.pt(0, 0, E + 190)], '#c5a47d', OUT);
      onFront(ctx, P, 0, 0, E, c => {
        for (let x = 0; x < W; x += 110) {
          box(c, x + 8, -180, 94, 70, '#9dc0ba', '#f7ecd0', 5, 26);
          c.strokeStyle = '#e8d9b5'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(x + 55, -177); c.lineTo(x + 55, -112); c.stroke();
        }
        box(c, W / 2 - 174, -104, 348, 30, '#3c6963', '#efe0b9', 3, 5);
        text(c, 'COPPERLEAF GALLERIA', W / 2, -88, { size: 18, colour: '#fff0c9' });
      });
    };
    kit.addFloor({ x: 0, y: 0, w: W, h: H }, (c, view) => {
      tiles(c, { x: 0, y: 0, w: W, h: H }, 42, '#eee1c3', '#e2d2ad', view);
      c.fillStyle = '#bd9e72'; c.fillRect(W * .48, 80, W * .04, H - 100);
      for (let y = 120; y < H; y += 220) {
        c.strokeStyle = '#a78d67'; c.lineWidth = 4;
        c.beginPath(); c.arc(W / 2, y, 47, 0, Math.PI * 2); c.stroke();
      }
    });
    const shops = ['The Copper Button', 'Pages & Peculiarities', 'Odd Socks', 'Cloudberry Toys', 'The Hat Exchange', 'Wren & Thread'];
    const n = Math.max(4, Math.floor(W / 300));
    for (let i = 0; i < n; i++) {
      const x = 42 + i * (W - 84) / n;
      addFacade(kit, { x, y: 74, w: (W - 110) / n, name: shops[i % shops.length], floors: 1, style: 'arcade', colour: i % 2 ? '#b88b69' : '#b2b49a' });
      kit.poi({ x: x + 60, y: 96, facing: 'up', actions: ['reach', null, 'phone'] });
    }
    for (const f of [.23, .77]) {
      const x = W * f;
      kit.escalator({ x: x - 19, yTop: edge - 40, yBottom: bottom + 35, dir: 'up' });
      kit.escalator({ x: x + 19, yTop: edge - 40, yBottom: bottom + 35, dir: 'down' });
    }
    kit.block({ x: 0, y: edge - 12, w: W, h: 78 });
    const gaps = [[W * .23 - 38, W * .23 + 38], [W * .77 - 38, W * .77 + 38]];
    kit.addProp({
      y: edge, box: { x: 0, y: edge - 2, w: W, d: 4, h: E + 27 },
      draw: ctx => {
        frontWall(ctx, P, 0, W, edge, 0, E, '#a88362', gaps);
        onFront(ctx, P, 0, edge, E, c => {
          for (let x = 0; x < W; x += 20) {
            if (gaps.some(([a, b]) => x > a - 4 && x < b + 4)) continue;
            box(c, x, -25, 2, 25, '#456f67', null);
          }
          for (const [a, b] of [[0, gaps[0][0]], [gaps[0][1], gaps[1][0]], [gaps[1][1], W]]) box(c, a, -27, b - a, 3, '#456f67', OUT, .5);
          text(c, 'THE UPPER WALK  /  TEAROOMS', W / 2, 26, { size: 12, colour: '#f8e9c4' });
        });
      },
    });
    addFountain(kit, W / 2, H * .68, { radius: 62, sculpture: 'coin' });
    for (const [i, x] of [W * .12, W * .38, W * .65, W * .88].entries()) {
      addTable(kit, x, edge - 130, { colour: i % 2 ? '#b96f54' : '#4d8782' });
      addPlant(kit, x - 47, edge - 140, 1.1);
    }
    const food = [
      ['Copper Kettle', '#b66f4b', 'coffee'], ['Noodle Nook', '#458f85', 'bread'],
      ['Sundae School', '#ce7993', 'sweets'], ['Paper Boats', '#617d9a', 'books'],
    ];
    food.forEach(([name, colour, goods], i) => {
      const x = 85 + i * (W - 260) / 4;
      addKiosk(kit, { x, y: bottom + 120, w: 116, name, colour, colour2: '#f1d999', goods, keeper: i < 3 ? 'chef' : 'shop', queue: i < 2, customers: 3 });
    });
    for (const f of [.14, .31, .69, .86]) {
      addTable(kit, W * f, H * .78, { colour: '#a97a58', umbrella: false });
      addBench(kit, { x: W * f - 25, y: H * .9, wood: '#497c70' });
    }
    scatter(kit, { x: 80, y: bottom + 260, w: W - 160, h: H - bottom - 350 }, kit.count(9, 5), 30, 24,
      (x, y) => addPlant(kit, x + 15, y + 12, 1));
    for (const x of [35, W - 35]) {
      for (const y of [edge * .5, bottom + 100, H * .8]) addPillar(kit, x, y, 135, 18, '#c1b394');
    }
    addMachine(kit, W / 2 - 14, H * .9, { label: 'MAP', colour: '#3a7774' });
    kit.grid({ x: 34, y: 95, w: W - 68, h: edge - 120 }, 48);
    kit.grid({ x: 34, y: bottom + 32, w: W - 68, h: H - bottom - 65 }, 52);
  },
};
