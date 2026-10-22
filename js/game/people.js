/**
 * Character appearance data (no drawing here, so it is testable in Node).
 *
 * Mr. Wiggles is simply a fixed, unique "look". Crowd members are generated
 * from palettes that deliberately exclude his signature items, except for
 * controlled "decoys" that borrow at most `maxDecoyTraits` of them – and never
 * his two most recognisable traits (hat + purple hair) together.
 */
export const COLOURS = Object.freeze({
  wigglesPurple: '#8b5cc7',
  wigglesTeal: '#2f9c9a',
  wigglesOrange: '#e98a3a',
  wigglesYellow: '#f2cd4b',
  wigglesGreen: '#9cc75a',
  wigglesOlive: '#8d8b4c',
  wigglesBoot: '#7a5435',
  noseePink: '#f08a9a',
});

export const SKIN_TONES = ['#f6d7c3', '#efc3a4', '#e0a87e', '#c98e62', '#a86f48', '#8a5636', '#6b4029', '#f3cfb3'];
export const HAIR_COLOURS = ['#2a1d16', '#4a3020', '#6e4a2a', '#a8743f', '#d9b26a', '#e8d29a', '#b5462e', '#1c1c1c', '#8e8e8e', '#d8d8d8'];
export const CLOTHES = ['#d64545', '#2f6fbf', '#3a9a5b', '#f2a33a', '#7d4bb3', '#1f2d4a', '#e7e1d3', '#444b55', '#c9476e', '#5bb8d6', '#8c5a3c', '#f4e04d', '#2c2c2c', '#6c8f3d', '#e86f51', '#9fb3c8', '#b03a8c', '#ffffff'];
export const TROUSERS = ['#2b3a55', '#3d3d3d', '#5a4632', '#1e2a38', '#7c6f5b', '#4b5d78', '#c2b59b', '#222222', '#6b3e2e'];
export const SHOES = ['#222', '#5b3a24', '#7a1f1f', '#ddd', '#1f3b73', '#333'];
const HAT_TYPES = ['cap', 'beanie', 'bowler', 'sun', 'beret'];
const HAIR_STYLES = ['short', 'short', 'long', 'bun', 'ponytail', 'curly', 'bald', 'spiky'];
const RAINBOW_SCARF = ['#e05a4f', '#6aa3d8', '#8bbf5a', '#f0a050', '#e05a4f', '#6aa3d8'];

export const DECOY_TRAITS = Object.freeze(['hat', 'hair', 'coat', 'scarf', 'stick', 'glasses']);

export const WIGGLES_LOOK = Object.freeze({
  name: 'Mr. Wiggles',
  isWiggles: true,
  height: 40,
  build: 1.05,
  skin: '#f6d2bd',
  hair: { style: 'wiggles', color: COLOURS.wigglesPurple },
  hat: { type: 'wiggles', color: COLOURS.wigglesTeal, color2: COLOURS.wigglesOrange },
  glasses: { left: '#b5652a', right: COLOURS.wigglesTeal },
  nose: COLOURS.noseePink,
  beard: null,
  top: { type: 'coat', pattern: 'patchwork', color: COLOURS.wigglesYellow, color2: COLOURS.wigglesGreen, accent: '#4aa3c9', patch: '#9a6bc8' },
  scarf: { colors: RAINBOW_SCARF },
  bottom: { type: 'knickers', color: COLOURS.wigglesOlive },
  socks: { colors: [COLOURS.wigglesPurple, COLOURS.wigglesTeal] },
  shoes: { color: COLOURS.wigglesBoot, curly: true },
  carry: { type: 'wigglesStick' },
  back: null,
  satchel: true,
  vest: null,
});

/** Which of Mr. Wiggles' signature traits does a look share? */
export function traitsOf(look) {
  const traits = [];
  if (look.hat?.type === 'wiggles') traits.push('hat');
  if (look.hair?.color === COLOURS.wigglesPurple) traits.push('hair');
  if (look.top?.pattern === 'patchwork') traits.push('coat');
  if ((look.scarf?.colors?.length ?? 0) >= 4) traits.push('scarf');
  if (look.carry?.type === 'wigglesStick') traits.push('stick');
  if (look.glasses && look.glasses.left !== look.glasses.right) traits.push('glasses');
  return traits;
}

export function isValidCrowdLook(look, maxDecoyTraits) {
  const traits = traitsOf(look);
  if (traits.length > maxDecoyTraits) return false;
  if (traits.includes('hat') && traits.includes('hair')) return false;
  return !look.isWiggles && look.nose !== WIGGLES_LOOK.nose;
}

/** Roles a scene can request, each with its own style of clothing and props. */
const ROLE_CARRY = {
  commuter: [['bag', 3], ['coffee', 3], ['phone', 3], ['newspaper', 2], [null, 2], ['umbrella', 1]],
  traveller: [['suitcase', 6], ['bag', 1], [null, 1]],
  tourist: [['camera', 3], ['phone', 2], [null, 2], ['suitcase', 1]],
  child: [['balloon', 2], [null, 5], ['icecream', 1]],
  elderly: [['cane', 4], ['bag', 2], [null, 2]],
  jogger: [[null, 1]],
  staff: [[null, 3], ['phone', 1]],
};

export function createCrowdLook(rng, { role = 'commuter', decoyRate = 0, maxDecoyTraits = 0, uniform = null } = {}) {
  const child = role === 'child';
  const elderly = role === 'elderly';
  const look = {
    role,
    height: child ? rng.range(24, 29) : rng.range(37, 43),
    build: rng.range(0.88, 1.18),
    skin: rng.pick(SKIN_TONES),
    hair: {
      style: elderly ? rng.pick(['short', 'bald', 'bun', 'curly']) : rng.pick(HAIR_STYLES),
      color: elderly ? rng.pick(['#d8d8d8', '#bdbdbd', '#8e8e8e', '#f0f0f0']) : rng.pick(HAIR_COLOURS),
    },
    hat: null,
    glasses: null,
    nose: null,
    beard: null,
    top: { type: rng.chance(0.3) ? 'coat' : rng.chance(0.2) ? 'dress' : 'shirt', pattern: 'solid', color: rng.pick(CLOTHES), color2: rng.pick(CLOTHES) },
    scarf: null,
    bottom: { type: rng.chance(0.15) ? 'shorts' : rng.chance(0.15) ? 'skirt' : 'trousers', color: rng.pick(TROUSERS) },
    socks: null,
    shoes: { color: rng.pick(SHOES), curly: false },
    carry: rng.weighted(ROLE_CARRY[role] ?? ROLE_CARRY.commuter),
    back: null,
    satchel: false,
    vest: null,
  };

  if (look.top.type === 'dress') look.bottom.type = 'skirt';
  if (look.top.type === 'dress') look.bottom.color = look.top.color;
  if (rng.chance(0.18)) look.top.pattern = rng.pick(['stripes', 'dots']);
  if (rng.chance(0.22)) look.hat = { type: rng.pick(HAT_TYPES), color: rng.pick(CLOTHES), color2: rng.pick(CLOTHES) };
  if (rng.chance(elderly ? 0.6 : 0.18)) {
    const rim = rng.pick(['#222', '#6b4a2a', '#888', '#b33']);
    look.glasses = { left: rim, right: rim };
  }
  if (!child && rng.chance(0.12)) look.beard = look.hair.color;
  if (rng.chance(0.12)) {
    const c = rng.pick(CLOTHES);
    look.scarf = { colors: rng.chance(0.5) ? [c] : [c, rng.pick(CLOTHES)] };
  }
  if ((role === 'traveller' || role === 'tourist' || role === 'child') && rng.chance(0.35) && look.carry?.type !== 'suitcase') {
    look.back = { color: rng.pick(CLOTHES) };
  }
  if (role === 'jogger') {
    look.top = { type: 'shirt', pattern: rng.chance(0.3) ? 'stripes' : 'solid', color: rng.pick(['#e8473c', '#1d8fe0', '#2bb673', '#f7c600', '#ff6fb5']), color2: '#ffffff' };
    look.bottom = { type: 'shorts', color: rng.pick(['#222', '#1e2a38', '#444']) };
    look.shoes = { color: rng.pick(['#fff', '#ff5a3c', '#2bd1ff']), curly: false };
    look.hat = rng.chance(0.4) ? { type: 'headband', color: rng.pick(CLOTHES) } : null;
    look.carry = null;
  }
  if (look.carry) look.carry = typeof look.carry === 'string' ? { type: look.carry, color: rng.pick(CLOTHES) } : look.carry;

  if (uniform) applyUniform(look, uniform, rng);

  if (!uniform && maxDecoyTraits > 0 && rng.chance(decoyRate)) applyDecoy(look, rng, maxDecoyTraits);
  return look;
}

/** Uniform presets used by scenes for staff (station staff, pilots, cleaners …). */
export const UNIFORMS = {
  rail: { top: { type: 'coat', pattern: 'solid', color: '#20385e' }, vest: '#ff8a1f', hat: { type: 'cap', color: '#20385e', color2: '#20385e' }, bottom: { type: 'trousers', color: '#1d2a40' } },
  hivis: { top: { type: 'shirt', pattern: 'solid', color: '#3b3b3b' }, vest: '#d8f02a', hat: null, bottom: { type: 'trousers', color: '#2a2a2a' } },
  pilot: { top: { type: 'shirt', pattern: 'solid', color: '#ffffff' }, hat: { type: 'pilot', color: '#1b2a4a', color2: '#e1b84a' }, bottom: { type: 'trousers', color: '#1b2a4a' }, carry: { type: 'suitcase', color: '#1b2a4a' } },
  crew: { top: { type: 'dress', pattern: 'solid', color: '#b8283b' }, hat: { type: 'beret', color: '#b8283b', color2: '#b8283b' }, scarf: { colors: ['#f2c94c'] }, bottom: { type: 'skirt', color: '#b8283b' }, carry: { type: 'suitcase', color: '#7a1020' } },
  security: { top: { type: 'shirt', pattern: 'solid', color: '#cfe0f2' }, vest: '#1f2b40', hat: null, bottom: { type: 'trousers', color: '#1f2b40' } },
  cleaner: { top: { type: 'shirt', pattern: 'solid', color: '#3d8c7a' }, hat: { type: 'cap', color: '#3d8c7a', color2: '#3d8c7a' }, bottom: { type: 'trousers', color: '#2e4f48' }, carry: { type: 'mop', color: '#e8e2c8' } },
  chef: { top: { type: 'shirt', pattern: 'solid', color: '#ffffff' }, hat: { type: 'chef', color: '#ffffff', color2: '#ffffff' }, bottom: { type: 'trousers', color: '#3a3a3a' }, apron: '#ffffff' },
  barista: { top: { type: 'shirt', pattern: 'solid', color: '#2f2f2f' }, apron: '#6b4a2f', hat: null, bottom: { type: 'trousers', color: '#2a2a2a' } },
  shop: { top: { type: 'shirt', pattern: 'solid', color: '#2b6f9e' }, apron: '#e9dcc0', bottom: { type: 'trousers', color: '#2b3a55' } },
  musician: { top: { type: 'coat', pattern: 'solid', color: '#6b3a8a' }, hat: { type: 'bowler', color: '#2b2b2b', color2: '#2b2b2b' }, carry: { type: 'guitar', color: '#c47a2c' } },
};

function applyUniform(look, uniformName, rng) {
  const u = UNIFORMS[uniformName];
  if (!u) return;
  if (u.top) look.top = { ...u.top, color2: u.top.color2 ?? u.top.color };
  if (u.bottom) look.bottom = { ...u.bottom };
  look.hat = u.hat === undefined ? look.hat : u.hat && { ...u.hat };
  look.vest = u.vest ?? null;
  look.apron = u.apron ?? null;
  if (u.scarf) look.scarf = { ...u.scarf };
  look.carry = u.carry ? { ...u.carry } : rng.chance(0.2) ? { type: 'phone' } : null;
  look.back = null;
  look.shoes = { color: '#1a1a1a', curly: false };
  look.uniform = uniformName;
}

function applyDecoy(look, rng, maxDecoyTraits) {
  const count = rng.int(1, maxDecoyTraits);
  const pool = rng.shuffle(DECOY_TRAITS);
  const chosen = [];
  for (const trait of pool) {
    if (chosen.length >= count) break;
    if ((trait === 'hat' && chosen.includes('hair')) || (trait === 'hair' && chosen.includes('hat'))) continue;
    chosen.push(trait);
  }
  for (const trait of chosen) {
    switch (trait) {
      case 'hat':
        look.hat = { ...WIGGLES_LOOK.hat };
        break;
      case 'hair':
        look.hair = { style: rng.pick(['curly', 'long', 'short']), color: COLOURS.wigglesPurple };
        break;
      case 'coat':
        look.top = { type: 'coat', pattern: 'patchwork', color: rng.pick(CLOTHES), color2: rng.pick(CLOTHES), accent: rng.pick(CLOTHES), patch: rng.pick(CLOTHES) };
        break;
      case 'scarf':
        look.scarf = { colors: RAINBOW_SCARF };
        break;
      case 'stick':
        look.carry = { type: 'wigglesStick' };
        break;
      case 'glasses':
        look.glasses = { ...WIGGLES_LOOK.glasses };
        break;
      default:
        break;
    }
  }
  look.decoy = chosen;
}

const FIRST_NAMES = ['Gertrude', 'Barnaby', 'Priya', 'Olu', 'Mabel', 'Ziggy', 'Hamish', 'Ines', 'Kofi', 'Lottie', 'Rupert', 'Saoirse', 'Tomasz', 'Yuki', 'Wilf', 'Ada', 'Bertie', 'Clem', 'Dot', 'Ezra', 'Fenella', 'Gus', 'Hattie', 'Ivo', 'Juno', 'Kit', 'Lorcan', 'Marnie', 'Nell', 'Otis', 'Pip', 'Quentin', 'Rosa', 'Stan', 'Tilly', 'Ulric', 'Vera', 'Walt', 'Xena', 'Yara', 'Zed'];
export const pickName = (rng) => rng.pick(FIRST_NAMES);
