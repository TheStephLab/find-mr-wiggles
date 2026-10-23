/** Test helper: a do-nothing 2D canvas context. */
/** A do-nothing 2D context that records how many calls were made and rejects bad numbers. */
export function fakeContext() {
  let calls = 0;
  const gradient = { addColorStop() {} };
  const check = (name, args) => {
    for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`${name} got ${a}`);
  };
  return new Proxy(
    { getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) },
    {
      get(target, prop) {
        if (prop === 'calls') return calls;
        if (prop in target) return target[prop];
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return (...a) => (check(prop, a), gradient);
        return (...a) => {
          calls++;
          check(prop, a);
        };
      },
      set() {
        return true;
      },
    },
  );
}
