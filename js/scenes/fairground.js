import { addKiosk, addBench, addBin, addStanchionLines } from './builders.js';
import { tiles, box, text, OUT } from './props.js';
import { drawBox, onFront, poly } from './draw3d.js';
import { addTree, addBunting, circle } from './venue-props.js';

export const fairground = {
  id: 'bramblewick-fairground', title: 'Bramblewick Fairground', kind: 'Fairground',
  blurb: 'The Moonwheel, a whirling carousel and suspiciously difficult ring toss.',
  aspect: 1.15, crowdFactor: 1.1, thumbColour: '#ad5d68', view: { topPad: 260, bottomPad: 30 },
  build(kit) {
    const { W, H, P } = kit;
    kit.background = '#bdd6d0';
    kit.defineLevel('fair', { x: 0, y: 0, w: W, h: H });
    kit.roles = [{ role: 'tourist', weight: 4 }, { role: 'child', weight: 3 }, { role: 'commuter', weight: 2 }, { role: 'elderly', weight: 1 }, { role: 'jogger', weight: .2 }];
    kit.backdrop = ctx => onFront(ctx, P, 0, 0, 0, c => {
      c.fillStyle = '#bdd6d0'; c.fillRect(0, -260, W, 280);
      for (let i = 0; i < W; i += 140) {
        c.beginPath(); c.ellipse(i + 40, -16, 110, 55, 0, 0, Math.PI * 2); c.fillStyle = i % 280 ? '#91ad79' : '#779d77'; c.fill();
      }
      c.strokeStyle = '#8a5b50'; c.lineWidth = 5;
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = -65 - (Math.sin(x / 130) + 1) * 30;
        if (!x) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      c.lineWidth = 2;
      for (let x = 0; x <= W; x += 35) { c.beginPath(); c.moveTo(x, -65 - (Math.sin(x / 130) + 1) * 30); c.lineTo(x, 0); c.stroke(); }
    });
    kit.addFloor({ x: 0, y: 0, w: W, h: H }, (c, view) => {
      c.fillStyle = '#a5ba80'; c.fillRect(0, 0, W, H);
      tiles(c, { x: 40, y: 80, w: W - 80, h: H - 110 }, 40, '#dfcdab', '#d9c6a3', view);
      c.fillStyle = '#b57c60'; c.fillRect(40, H * .46, W - 80, 6);
      for (let x = 50; x < W - 50; x += 30) {
        c.fillStyle = x % 60 ? '#c6856c' : '#66948a'; c.fillRect(x, H - 25, 17, 9);
      }
    });
    const wx = W * .29, wy = H * .21;
    kit.block({ x: wx - 95, y: wy - 65, w: 190, h: 95 });
    kit.addProp({
      y: wy + 30, box: { x: wx - 143, y: wy - 40, w: 286, d: 70, h: 285 },
      solid: { x: wx - 35, y: wy + 25, w: 70, h: 34 },
      draw: (ctx, t) => onFront(ctx, P, wx, wy, 0, c => {
        poly(c, [[-68, 10], [-6, -141], [4, -141], [-49, 10]], '#e7d6b3', OUT, 1);
        poly(c, [[67, 10], [6, -141], [-4, -141], [48, 10]], '#e7d6b3', OUT, 1);
        c.strokeStyle = '#657e77'; c.lineWidth = 4;
        c.beginPath(); c.arc(0, -144, 111, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 1.7; c.strokeStyle = '#f5e6c6';
        c.beginPath(); c.arc(0, -144, 103, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2 + t * .09;
          const x = Math.cos(a) * 111, y = -144 + Math.sin(a) * 111;
          c.strokeStyle = '#65867d'; c.lineWidth = 1.3;
          c.beginPath(); c.moveTo(0, -144); c.lineTo(x, y); c.stroke();
          c.strokeStyle = '#715e50'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke();
          box(c, x - 12, y + 4, 24, 20, ['#b86561', '#e2b454', '#589b97'][i % 3], OUT, .75, 5);
          box(c, x - 9, y + 6, 18, 8, '#e7d9af', OUT, .45, 2);
          circle(c, x - 3, y + 9, 2.4, '#c79875'); circle(c, x + 4, y + 9, 2.4, '#e3b994');
        }
        circle(c, 0, -144, 11, '#e4b957', OUT);
        box(c, -41, -18, 82, 31, '#638e86', OUT, 1, 3);
        text(c, 'MOONWHEEL', 0, -5, { size: 9, colour: '#fff0c4' });
      }),
    });
    rideQueue(kit, wx + 90, wy + 60);
    const cx = W * .73, cy = H * .41;
    kit.block({ x: cx - 95, y: cy - 55, w: 190, h: 110 });
    kit.addProp({
      y: cy + 55, box: { x: cx - 116, y: cy - 60, w: 232, d: 115, h: 155 },
      solid: { x: cx - 16, y: cy, w: 32, h: 110 },
      draw: (ctx, t) => onFront(ctx, P, cx, cy, 0, c => {
        c.beginPath(); c.ellipse(0, 4, 106, 35, 0, 0, Math.PI * 2); c.fillStyle = '#8d6258'; c.fill(); c.strokeStyle = OUT; c.stroke();
        c.beginPath(); c.ellipse(0, -2, 104, 31, 0, 0, Math.PI * 2); c.fillStyle = '#d4b47d'; c.fill(); c.stroke();
        box(c, -8, -119, 16, 119, '#739287', OUT, 1);
        const horses = Array.from({ length: 8 }, (_, i) => ({ a: i * Math.PI / 4 + t * .3 })).map(({ a }) => ({ x: Math.cos(a) * 79, y: Math.sin(a) * 25, a })).sort((a, b) => a.y - b.y);
        for (const horse of horses) {
          const { x, y, a } = horse, bob = Math.sin(t * 1.5 + a) * 5;
          c.strokeStyle = '#c4a459'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, -110); c.lineTo(x, y - 8); c.stroke();
          c.save(); c.translate(x, y - 25 + bob);
          c.beginPath(); c.ellipse(0, 0, 15, 7, -.2, 0, Math.PI * 2); c.fillStyle = '#f2e2bd'; c.fill(); c.strokeStyle = OUT; c.lineWidth = .6; c.stroke();
          poly(c, [[8, -3], [12, -17], [19, -20], [25, -13], [17, -9], [17, 2]], '#f2e2bd', OUT, .6);
          poly(c, [[-10, 2], [-17, 12], [-20, 11], [-13, -1]], '#e1cba3', OUT, .5);
          poly(c, [[8, 2], [13, 12], [17, 11], [13, -2]], '#e1cba3', OUT, .5);
          box(c, -4, -10, 11, 7, '#b15f68', OUT, .5, 2);
          circle(c, 19, -15, .8, OUT); c.restore();
        }
        for (let i = 0; i < 10; i++) poly(c, [[0, -149], [-115 + i * 23, -100], [-92 + i * 23, -100]], i % 2 ? '#f0dcb3' : '#bd6573', OUT, .6);
        box(c, -117, -101, 234, 10, '#59968f', OUT, .8, 3);
        for (let i = -107; i <= 107; i += 14) circle(c, i, -96, 2, '#ffdf84');
        text(c, 'THE COPPER CAROUSEL', 0, -119, { size: 8, colour: '#503e44' });
      }),
    });
    rideQueue(kit, cx - 115, cy + 85);
    const games = [['Lucky Ducks', '#5a9296'], ['Ring-a-Ding', '#b96b61'], ['The Coconut Cabinet', '#a78d4e'], ['Star Catcher', '#7e78a0']];
    games.forEach(([name, colour], i) => {
      const x = 70 + i * (W - 270) / 4, y = H * .68 + i % 2 * 65;
      addKiosk(kit, { x, y, w: 128, d: 38, name, colour, colour2: '#f6dfa8', goods: i === 0 ? 'bottles' : 'sweets', customers: 4 });
      kit.addProp({ y: y + 39, box: { x: x + 7, y: y + 30, w: 114, d: 4, h: 52 }, draw: ctx => onFront(ctx, P, x + 8, y + 31, 0, c => {
        for (let k = 0; k < 7; k++) {
          if (i === 1) { c.strokeStyle = '#efd689'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(8 + k * 15, -34, 5, 2, 0, 0, Math.PI * 2); c.stroke(); }
          else { circle(c, 8 + k * 15, -34 - k % 2 * 6, 4.5, i === 0 ? '#e8c34d' : '#eec2a0', OUT); }
        }
      }) });
    });
    addKiosk(kit, { x: W * .77, y: H * .12, w: 110, name: 'Cloud Candy', colour: '#c77b9b', colour2: '#f3deb2', goods: 'sweets', queue: true, keeper: 'chef' });
    addKiosk(kit, { x: W * .15, y: H * .47, w: 110, name: 'Bramble Bites', colour: '#759457', colour2: '#eee0b2', goods: 'bread', queue: true, keeper: 'chef' });
    addBunting(kit, 100, H * .9, W - 200, 'BRAMBLEWICK FAIR');
    for (const f of [.12, .38, .63, .89]) {
      addBench(kit, { x: W * f - 24, y: H * .91, wood: '#739183' });
      addBin(kit, W * f + 38, H * .92);
    }
    for (const f of [.04, .96]) for (const y of [H * .14, H * .47, H * .83]) addTree(kit, W * f, y, 30);
    const sx = W * .48, sy = H * .47;
    kit.addProp({ y: sy, box: { x: sx - 50, y: sy - 25, w: 100, d: 25, h: 15 }, draw: ctx => drawBox(ctx, P, { x: sx - 50, y: sy - 25, w: 100, d: 25, h: 10 }, { front: '#b88663', top: '#dbc18f' }), block: { x: sx - 50, y: sy - 25, w: 100, h: 25 } });
    kit.station({ x: sx, y: sy - 9, uniform: 'musician', dir: 'down', action: 'guitar', fixedActions: ['guitar'] });
    for (let i = 0; i < 9; i++) kit.poi({ x: sx - 72 + i * 18, y: sy + 24 + i % 2 * 14, facing: 'up', actions: ['clap', 'wave', null], weight: 2 });
    kit.grid({ x: 28, y: 48, w: W - 56, h: H - 80 }, 48);
  },
};

function rideQueue(kit, x, y) {
  addKiosk(kit, { x: x - 20, y: y - 35, w: 55, d: 24, name: 'Tickets', colour: '#4c817d', colour2: '#e9cf8f', customers: 0 });
  const slots = Array.from({ length: 7 }, (_, i) => ({ x: x + 8, y: y + i * 14 }));
  kit.queue({ slots, facing: 'up', action: 'reach', serviceTime: [2, 4], weight: 2 });
  addStanchionLines(kit, [[[x - 5, y], [x - 5, y + 95]], [[x + 22, y], [x + 22, y + 95]]], '#b87559');
  kit.poi({ x: x + 45, y: y + 15, facing: 'left', actions: ['wave', null], duration: [5, 14] });
}
