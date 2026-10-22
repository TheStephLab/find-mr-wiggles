import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';
import { DIFFICULTIES } from '../js/core/difficulty.js';
import { WIGGLES_LOOK, DECOY_TRAITS, traitsOf, createCrowdLook, isValidCrowdLook, UNIFORMS } from '../js/game/people.js';

test('Mr. Wiggles has every signature trait and is immutable', () => {
  assert.deepEqual(traitsOf(WIGGLES_LOOK).sort(), [...DECOY_TRAITS].sort());
  assert.ok(Object.isFrozen(WIGGLES_LOOK));
});

for (const d of DIFFICULTIES) {
  test(`crowd never contains a Mr. Wiggles look-alike (${d.label})`, () => {
    const rng = createRng(1000 + d.level);
    let decoys = 0;
    for (let i = 0; i < 4000; i++) {
      const role = rng.pick(['commuter', 'traveller', 'tourist', 'child', 'elderly', 'jogger']);
      const look = createCrowdLook(rng, { role, decoyRate: d.decoyRate, maxDecoyTraits: d.maxDecoyTraits, paletteBias: d.paletteBias });
      assert.ok(isValidCrowdLook(look, d.maxDecoyTraits), `invalid look: ${JSON.stringify(traitsOf(look))}`);
      if (traitsOf(look).length) decoys++;
    }
    if (d.decoyRate === 0) assert.equal(decoys, 0);
    else assert.ok(decoys > 0, 'expected some decoys at this level');
  });
}

test('uniformed staff never borrow Wiggles traits', () => {
  const rng = createRng(5);
  for (const uniform of Object.keys(UNIFORMS)) {
    for (let i = 0; i < 50; i++) {
      const look = createCrowdLook(rng, { role: 'staff', uniform, decoyRate: 1, maxDecoyTraits: 2 });
      assert.equal(traitsOf(look).length, 0, uniform);
    }
  }
});
