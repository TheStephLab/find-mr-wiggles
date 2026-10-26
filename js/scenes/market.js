import { addKiosk, addBench, addBin } from './builders.js';
import { tiles, box, text, OUT, createPigeons } from './props.js';
import { drawBox, onFront } from './draw3d.js';
import { addFacade, addFountain, addTree, addTable, addStreetLamp, addBunting } from './venue-props.js';

export const market = {
  id: 'little-lantern-market', title: 'Little Lantern Market', kind: 'Village market',
  blurb: 'A crooked village square, runaway apples and a very important pie contest.',
  aspect: 1.15, crowdFactor: 1.06, thumbColour: '#bb7753', view: { topPad: 215, bottomPad: 30 },
  build(kit) {
    const { W, H, P } = kit;
    kit.background = '#cbd9b1';
    kit.defineLevel('square', { x: 0, y: 0, w: W, h: H });
    kit.roles = [{ role: 'commuter', weight: 2 }, { role: 'tourist', weight: 3 }, { role: 'elderly', weight: 2 }, { role: 'child', weight: 2 }];
    kit.backdrop = ctx => onFront(ctx, P, 0, 0, 0, c => {
      c.fillStyle = '#d4dfbf'; c.fillRect(0, -200, W, 250);
      for (let x = 60; x < W; x += 95) {
        c.beginPath(); c.ellipse(x, -58, 65, 70, 0, 0, Math.PI * 2); c.fillStyle = '#a6bb87'; c.fill();
      }
    });
    kit.addFloor({ x: 0, y: 0, w: W, h: H }, (c, view) => {
      tiles(c, { x: 0, y: 0, w: W, h: H }, 24, '#d4c6a8', '#cabc9e', view);
      c.fillStyle = '#b5aa8f'; c.fillRect(W * .47, 0, W * .06, H);
      c.fillRect(0, H * .52, W, 55);
      c.strokeStyle = '#e9dcc0'; c.lineWidth = 2;
      for (let y = 30; y < H; y += 64) { c.beginPath(); c.moveTo(W * .5, y); c.lineTo(W * .5, y + 15); c.stroke(); }
    });
    const names = ['Lantern Post', 'Mrs. Thimble', 'The Sleepy Turnip', 'Bicycle Bureau', 'Penny & Plum', 'Clockmender'];
    const colours = ['#b77b60', '#c9b48a', '#a8b398', '#bc8c76'];
    const n = Math.max(5, Math.floor(W / 250));
    for (let i = 0; i < n; i++) {
      const x = 35 + i * (W - 70) / n;
      addFacade(kit, { x, y: 80 + (i % 2) * 12, w: (W - 100) / n, name: names[i % names.length], colour: colours[i % 4], floors: i % 3 === 0 ? 3 : 2 });
    }
    addBunting(kit, 80, H * .23, W - 160, 'LANTERN DAY MARKET');
    const stalls = [
      ['Plum Lucky', '#9c6081', 'bottles'], ['Crumb & Co.', '#c1844f', 'bread'],
      ['Green Fingers', '#538d66', 'flowers'], ['The Cheese Wheel', '#caab48', 'bread'],
      ['Kettle Corner', '#6593a4', 'coffee'], ['Tattered Tales', '#b76b60', 'books'],
      ['Honey, Please', '#bb9750', 'bottles'], ['Oddments', '#6b7f9b', 'sweets'],
    ];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        if (row === 1 && (col === 1 || col === 2)) continue;
        const [name, colour, goods] = stalls[(row * 3 + col) % stalls.length];
        const x = W * (.09 + col * .235) - 40, y = H * (.25 + row * .245);
        addKiosk(kit, { x, y, w: 112, d: 40, name, colour, colour2: '#f5e4ba', goods, customers: 4, queue: col === 0 && row !== 1 });
        kit.addProp({
          y: y + 49, box: { x: x + 119, y: y + 20, w: 22, d: 30, h: 28 },
          draw: ctx => {
            for (let k = 0; k < 3; k++) drawBox(ctx, P, { x: x + 120, y: y + 23 + k * 9, w: 18, d: 8, h: 9 + k * 4 }, { front: '#a0784c', top: '#e3bf70' });
          },
          block: { x: x + 119, y: y + 20, w: 22, h: 30 },
        });
      }
    }
    addFountain(kit, W * .5, H * .54, { radius: 58 });
    for (const f of [.08, .92]) {
      for (const y of [H * .17, H * .53, H * .91]) {
        addTree(kit, W * f, y, 32);
        addBench(kit, { x: W * f - 26, y: y + 24, facing: 'down', wood: '#527c67' });
      }
    }
    addTable(kit, W * .35, H * .88, { colour: '#b66c57', umbrella: true });
    addTable(kit, W * .65, H * .88, { colour: '#5b8980', umbrella: true });
    for (const x of [W * .29, W * .71]) addStreetLamp(kit, x, H * .56);
    addBin(kit, W * .5 + 100, H * .55, '#4d7966');
    const dx = W * .78, dy = H * .9;
    kit.addProp({
      y: dy, box: { x: dx - 45, y: dy - 30, w: 90, d: 30, h: 42 },
      solid: { x: dx - 43, y: dy, w: 86, h: 26 }, block: { x: dx - 45, y: dy - 30, w: 90, h: 30 },
      draw: ctx => {
        drawBox(ctx, P, { x: dx - 42, y: dy - 27, w: 84, d: 27, h: 26 }, { front: '#62918b', top: '#c3ae79' });
        onFront(ctx, P, dx, dy, 0, c => {
          for (const x of [-27, 27]) { c.beginPath(); c.arc(x, 0, 8, 0, Math.PI * 2); c.fillStyle = '#354b4c'; c.fill(); }
          text(c, 'TURNIP EXPRESS', 0, -16, { size: 7, colour: '#fff0c6' });
          for (let i = 0; i < 7; i++) box(c, -35 + i * 10, -40 - i % 2 * 5, 9, 14, '#b58f58', OUT, .5, 1);
        });
      },
    });
    kit.station({ x: dx + 55, y: dy + 10, uniform: 'hivis', dir: 'left', fixedActions: ['reach', 'wave', null] });
    kit.poi({ x: dx + 75, y: dy + 22, facing: 'left', actions: ['reach', null], weight: 2 });
    kit.addDynamic(createPigeons(kit.rng, P, W * .42, H * .56, 10, 80, 0));
    kit.grid({ x: 30, y: 120, w: W - 60, h: H - 150 }, 48);
  },
};
