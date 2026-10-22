import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';

test('same seed produces the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('different seeds diverge', () => {
  const a = createRng(1);
  const b = createRng(2);
  assert.notEqual(a.next(), b.next());
});

test('helpers stay in range', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const f = r.range(5, 10);
    assert.ok(f >= 5 && f < 10);
    const n = r.int(1, 3);
    assert.ok([1, 2, 3].includes(n));
  }
});

test('weighted never picks zero-weight entries', () => {
  const r = createRng(9);
  for (let i = 0; i < 500; i++) assert.notEqual(r.weighted([['a', 1], ['b', 0], ['c', 2]]), 'b');
});

test('shuffle returns a permutation without mutating input', () => {
  const r = createRng(3);
  const input = [1, 2, 3, 4, 5];
  const out = r.shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), input);
});
