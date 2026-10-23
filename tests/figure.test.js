import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawPerson, spriteFrame, spriteBounds, WALK_FRAMES } from '../js/game/draw-person.js';
import { createCrowdLook, WIGGLES_LOOK, UNIFORMS } from '../js/game/people.js';
import { createRng } from '../js/core/rng.js';
import { fakeContext } from './helpers/fake-canvas.js';

const POSES = [
  { dir: 'down', mode: 'stand' },
  { dir: 'up', mode: 'stand' },
  { dir: 'right', mode: 'walk', phase: 1.3 },
  { dir: 'left', mode: 'jog', phase: 4 },
  { dir: 'down', mode: 'walk', phase: 2.2 },
  { dir: 'down', mode: 'sit' },
  { dir: 'right', mode: 'sit' },
  { dir: 'up', mode: 'ride' },
];
const ACTIONS = [null, 'phone', 'wave', 'reach', 'read', 'piano', 'clap', 'guitar', 'clean'];

test('every kind of person draws in every pose and action without errors', () => {
  const rng = createRng(77);
  const looks = [WIGGLES_LOOK];
  for (const role of ['commuter', 'traveller', 'tourist', 'child', 'elderly', 'jogger']) {
    for (let i = 0; i < 12; i++) looks.push(createCrowdLook(rng, { role, decoyRate: 0.5, maxDecoyTraits: 3, paletteBias: 0.6 }));
  }
  for (const uniform of Object.keys(UNIFORMS)) looks.push(createCrowdLook(rng, { role: 'staff', uniform }));
  for (const look of looks) {
    for (const pose of POSES) {
      for (const action of ACTIONS) {
        const ctx = fakeContext();
        drawPerson(ctx, look, { ...pose, action, t: 0.4 }, 10, 20, 'full', 0.8);
        assert.ok(ctx.calls > 40, 'draws a detailed figure');
        drawPerson(fakeContext(), look, { ...pose, action, t: 0.4 }, 10, 20, 'simple', 0.8);
      }
    }
  }
});

test('spriteFrame quantises walk cycles and mirrors left-facing poses', () => {
  const keys = new Set();
  for (let i = 0; i < 200; i++) keys.add(spriteFrame(WIGGLES_LOOK, { dir: 'right', mode: 'walk', phase: i * 0.37, t: i }).key);
  assert.equal(keys.size, WALK_FRAMES);
  const r = spriteFrame(WIGGLES_LOOK, { dir: 'right', mode: 'walk', phase: 1, t: 0 });
  const l = spriteFrame(WIGGLES_LOOK, { dir: 'left', mode: 'walk', phase: 1, t: 0 });
  assert.equal(l.key, r.key);
  assert.equal(l.mirror, true);
  assert.equal(r.mirror, false);
  const still = spriteFrame(WIGGLES_LOOK, { dir: 'down', mode: 'stand', phase: 5, t: 0 });
  assert.equal(still.key, spriteFrame(WIGGLES_LOOK, { dir: 'down', mode: 'stand', phase: 2, t: 9 }).key, 'standing ignores phase and time');
  assert.equal(spriteFrame(WIGGLES_LOOK, { dir: 'down', mode: 'ride', phase: 0, t: 0 }).key, still.key, 'riding looks like standing');
});

test('carried items are part of the sprite key', () => {
  const look = { ...createCrowdLook(createRng(1), { role: 'traveller' }), carry: { type: 'suitcase', color: '#d64545' } };
  const before = spriteFrame(look, { dir: 'down', mode: 'stand', phase: 0, t: 0 }).key;
  look.carry = null;
  assert.notEqual(spriteFrame(look, { dir: 'down', mode: 'stand', phase: 0, t: 0 }).key, before);
});

test('sprite bounds scale with height and make room for tall hats and balloons', () => {
  const child = { ...WIGGLES_LOOK, height: 26 };
  assert.ok(spriteBounds(child).T > spriteBounds(WIGGLES_LOOK).T);
  const balloon = { ...WIGGLES_LOOK, carry: { type: 'balloon', color: '#f00' } };
  assert.ok(spriteBounds(balloon).T < spriteBounds(WIGGLES_LOOK).T);
});
