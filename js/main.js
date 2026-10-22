import { SCENES, SCENE_IDS, getScene } from './scenes/index.js';
import { createProgressStore, formatTime } from './core/storage.js';
import { DIFFICULTIES, getDifficulty } from './core/difficulty.js';
import { createCamera, centreOn } from './core/camera.js';
import { randomSeed } from './core/rng.js';
import { createGame } from './game/game.js';
import { createWorld } from './game/world.js';
import { createRenderer } from './game/renderer.js';
import { drawPortrait, drawPerson } from './game/draw-person.js';
import { WIGGLES_LOOK, traitsOf } from './game/people.js';

const $ = (sel) => document.querySelector(sel);
const store = createProgressStore();
const perfFactor = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 3) ? 0.75 : 1;
const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const screens = { home: $('#screen-home'), scenes: $('#screen-scenes'), game: $('#screen-game') };
let game = null;
let currentSceneId = null;
let timerInterval = 0;
let toastTimer = 0;

// ---------------------------------------------------------------- helpers
function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  document.body.dataset.screen = name;
  if (name === 'home') refreshHome();
  if (name === 'scenes') renderSceneList();
}

function announce(text) {
  const live = $('#sr-live');
  live.textContent = '';
  requestAnimationFrame(() => (live.textContent = text));
}

function toast(text, ms = 2200) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function openDialog(dlg) {
  if (!dlg.open) dlg.showModal();
}

function closeDialog(dlg) {
  if (dlg.open) dlg.close();
}

/** Size a canvas's backing store to its CSS size × devicePixelRatio. */
function hiDpi(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.getAttribute('width');
  const h = canvas.getAttribute('height');
  if (!canvas.dataset.cssW) {
    canvas.dataset.cssW = w;
    canvas.dataset.cssH = h;
    canvas.style.width = `${w}px`;
    canvas.style.aspectRatio = `${w} / ${h}`;
  }
  canvas.width = Math.round(canvas.dataset.cssW * dpr);
  canvas.height = Math.round(canvas.dataset.cssH * dpr);
}

// ---------------------------------------------------------------- portraits
const portraits = [
  { canvas: $('#home-portrait'), visible: () => !screens.home.hidden, action: 'wave' },
  { canvas: $('#start-portrait'), visible: () => $('#dlg-start').open, action: 'wave' },
  { canvas: $('#meet-portrait'), visible: () => $('#dlg-meet').open, action: null, turn: true },
  { canvas: $('#target-portrait'), visible: () => !screens.game.hidden, action: null, face: true },
];
portraits.forEach((p) => hiDpi(p.canvas));

function drawPortraits(now) {
  const t = now / 1000;
  for (const p of portraits) {
    if (!p.visible()) continue;
    const ctx = p.canvas.getContext('2d');
    const { width, height } = p.canvas;
    if (p.face) {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      const s = height / 26;
      // Close-up of head and hat: the figure's feet sit well below the canvas.
      ctx.translate(width / 2, height * 1.75);
      ctx.scale(s, s);
      drawPerson(ctx, WIGGLES_LOOK, { dir: 'down', mode: 'stand', phase: 0, t, action: null, seed: 0 }, 0, 0, 'full');
      ctx.restore();
      continue;
    }
    const dir = p.turn ? ['down', 'right', 'up', 'left'][Math.floor(t / 2.5) % 4] : 'down';
    drawPortrait(ctx, WIGGLES_LOOK, width, height, t, { dir, action: p.action });
  }
  requestAnimationFrame(drawPortraits);
}

requestAnimationFrame(drawPortraits);

// ---------------------------------------------------------------- home
function refreshHome() {
  const settings = store.getSettings();
  $('#home-difficulty').textContent = `Difficulty: ${getDifficulty(settings.difficulty).label}`;
  const done = SCENE_IDS.filter((id) => store.isCompleted(id)).length;
  $('#home-progress').textContent = `${done} of ${SCENES.length} scenes found`;
  $('#btn-play').textContent = done === 0 ? 'Play' : done === SCENES.length ? 'Play again' : 'Continue';
}

// ---------------------------------------------------------------- scene list
const thumbCache = new Map();

function renderThumb(scene, canvas) {
  if (thumbCache.has(scene.id)) {
    canvas.getContext('2d').drawImage(thumbCache.get(scene.id), 0, 0, canvas.width, canvas.height);
    return;
  }
  const world = createWorld(scene, { level: 2, seed: 20261022 });
  for (let i = 0; i < 40; i++) world.update(0.1);
  const camera = createCamera({ viewW: canvas.width, viewH: canvas.height, worldW: world.pictureWidth, worldH: world.pictureHeight });
  camera.minScale = 0;
  centreOn(camera, world.pictureWidth / 2, world.pictureHeight * 0.55, (canvas.width / world.pictureWidth) * 1.7);
  createRenderer(canvas, world, { dpr: 1 }).render(camera, world.time);
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d').drawImage(canvas, 0, 0);
  thumbCache.set(scene.id, copy);
}

function renderSceneList() {
  const list = $('#scene-list');
  list.replaceChildren();
  const level = store.getSettings().difficulty;
  SCENES.forEach((scene, i) => {
    const unlocked = store.isUnlocked(SCENE_IDS, scene.id);
    const rec = store.getScene(scene.id);
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'scene-card';
    card.style.setProperty('--i', i);
    card.style.setProperty('--patch', scene.thumbColour ?? '#2f9c9a');
    const thumb = document.createElement('div');
    thumb.className = 'scene-thumb';
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 300;
    canvas.setAttribute('aria-hidden', 'true');
    thumb.append(canvas);
    let status;
    if (!unlocked) {
      card.setAttribute('aria-disabled', 'true');
      const lock = document.createElement('span');
      lock.className = 'scene-lock';
      lock.textContent = '🔒';
      lock.setAttribute('aria-hidden', 'true');
      thumb.append(lock);
      status = `<span class="badge badge-locked">Locked</span> Find him at ${SCENES[i - 1].title} first`;
    } else if (rec?.completed) {
      const best = rec.best[level];
      const stars = '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
      status = `<span class="badge badge-done">Found!</span> <span aria-label="${rec.stars} of 3 stars">${stars}</span>${best ? ` · Best ${formatTime(best)} on ${getDifficulty(level).label}` : ''}`;
    } else {
      status = '<span class="badge badge-new">New</span> Mr. Wiggles is in here somewhere…';
    }
    card.innerHTML = '';
    card.append(thumb);
    card.insertAdjacentHTML(
      'beforeend',
      `<p class="scene-kind">${i + 1}. ${scene.kind}</p><p class="scene-name">${scene.title}</p><p class="scene-blurb">${scene.blurb}</p><p class="scene-status">${status}</p>`,
    );
    card.addEventListener('click', () => {
      if (!unlocked) {
        announce(`${scene.title} is locked. Complete ${SCENES[i - 1].title} first.`);
        return;
      }
      openScene(scene.id);
    });
    li.append(card);
    list.append(li);
    requestAnimationFrame(() => renderThumb(scene, canvas));
  });
}

// ---------------------------------------------------------------- game flow
function openScene(id) {
  const scene = getScene(id);
  if (!scene) return;
  stopGame();
  currentSceneId = id;
  showScreen('game');
  $('#hud-scene').textContent = scene.title;
  $('#hud-timer').textContent = '0:00';
  $('#start-kind').textContent = scene.kind;
  $('#start-title').textContent = `Find Mr. Wiggles at ${scene.title}`;
  $('#start-blurb').textContent = scene.blurb;
  updateDifficultyLabels();
  openDialog($('#dlg-start'));
}

function startGame() {
  const scene = getScene(currentSceneId);
  const settings = store.getSettings();
  stopGame();
  closeDialog($('#dlg-start'));
  game = createGame({
    canvas: $('#game-canvas'),
    scene,
    level: settings.difficulty,
    seed: randomSeed(),
    perfFactor,
    reducedMotion: settings.reducedMotion || systemReducedMotion,
    onFound: handleFound,
    onGuess: handleGuess,
    onAutoPause: pauseGame,
  });
  game.start();
  $('#hud-diff').textContent = getDifficulty(settings.difficulty).label;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!game) return;
    $('#hud-timer').textContent = formatTime(game.elapsed);
    const cooling = game.hintCooldownLeft() > 0;
    $('#btn-hint').setAttribute('aria-disabled', String(cooling));
  }, 250);
  announce(`${scene.title}. The search has begun!`);
}

function stopGame() {
  clearInterval(timerInterval);
  game?.destroy();
  game = null;
}

function pauseGame() {
  if (!game || game.state !== 'running') return;
  game.pause();
  openDialog($('#dlg-pause'));
}

function resumeGame() {
  closeDialog($('#dlg-pause'));
  game?.resume();
}

const MISS_LINES = [
  (n) => `Nope! That's ${n}.`,
  (n) => `${n} is flattered, but no.`,
  (n) => `Not him, that's ${n}.`,
  (n) => `${n} waves hello. Keep looking!`,
];
const TRAIT_WORDS = { hat: 'hat', hair: 'purple hair', coat: 'patchwork coat', scarf: 'scarf', stick: 'walking stick', glasses: 'glasses' };

function handleGuess({ person }) {
  if (!person) return;
  const traits = traitsOf(person.look);
  let line;
  if (traits.length) line = `Sneaky! ${person.name} has the ${TRAIT_WORDS[traits[0]]}, but isn't Mr. Wiggles.`;
  else if (person.role === 'staff') line = `That's ${person.name}, who works here.`;
  else line = MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)](person.name);
  toast(line);
}

function handleFound({ timeMs, misses, hintsUsed }) {
  const settings = store.getSettings();
  const result = store.recordCompletion(currentSceneId, { timeMs, difficulty: settings.difficulty, hintsUsed, misses });
  clearInterval(timerInterval);
  $('#hud-timer').textContent = formatTime(timeMs);
  $('#found-time').textContent = formatTime(timeMs);
  $('#found-misses').textContent = String(misses);
  $('#found-hints').textContent = String(hintsUsed);
  const stars = $('#found-stars');
  stars.innerHTML = [0, 1, 2].map((i) => `<span class="${i < result.stars ? '' : 'dim'}">★</span>`).join('');
  stars.setAttribute('aria-label', `${result.stars} of 3 stars`);
  $('#found-best').textContent = result.isBest
    ? result.previousBest
      ? `New best on ${getDifficulty(settings.difficulty).label}! (was ${formatTime(result.previousBest)})`
      : `First find on ${getDifficulty(settings.difficulty).label}!`
    : `Best on ${getDifficulty(settings.difficulty).label}: ${formatTime(result.previousBest)}`;
  const index = SCENE_IDS.indexOf(currentSceneId);
  const next = SCENES[index + 1];
  const nextBtn = $('#btn-next');
  nextBtn.hidden = !next;
  if (next) nextBtn.textContent = store.isCompleted(next.id) ? `Next: ${next.title}` : `Unlocked: ${next.title}`;
  announce(`You found Mr. Wiggles in ${formatTime(timeMs)}! ${result.stars} stars.`);
  openDialog($('#dlg-found'));
}

// ---------------------------------------------------------------- settings
function updateDifficultyLabels() {
  const label = getDifficulty(store.getSettings().difficulty).label;
  $('#start-diff').textContent = label;
  refreshHome();
}

function renderDifficultyOptions() {
  const current = store.getSettings().difficulty;
  const wrap = $('#difficulty-options');
  wrap.replaceChildren();
  for (const d of DIFFICULTIES) {
    const label = document.createElement('label');
    label.className = 'diff-option';
    label.innerHTML = `<input type="radio" name="difficulty" value="${d.level}" ${d.level === current ? 'checked' : ''}>
      <strong>${d.label} <span class="diff-dots" aria-hidden="true">${'●'.repeat(d.level)}${'○'.repeat(DIFFICULTIES.length - d.level)}</span></strong>
      <small>${d.description}</small>`;
    label.querySelector('input').addEventListener('change', (e) => {
      store.setDifficulty(Number(e.target.value));
      updateDifficultyLabels();
      if (!screens.scenes.hidden) renderSceneList();
    });
    wrap.append(label);
  }
  $('#opt-motion').checked = store.getSettings().reducedMotion;
}

function openSettings() {
  renderDifficultyOptions();
  openDialog($('#dlg-settings'));
}

// ---------------------------------------------------------------- wiring
$('#btn-play').addEventListener('click', () => openScene(store.nextSceneId(SCENE_IDS)));
$('#btn-scenes').addEventListener('click', () => showScreen('scenes'));
$('#btn-scenes-back').addEventListener('click', () => showScreen('home'));
$('#btn-settings').addEventListener('click', openSettings);
$('#btn-scenes-settings').addEventListener('click', openSettings);
$('#btn-howto').addEventListener('click', () => openDialog($('#dlg-howto')));
$('#btn-meet').addEventListener('click', () => openDialog($('#dlg-meet')));

$('#btn-start').addEventListener('click', startGame);
$('#btn-start-cancel').addEventListener('click', () => {
  closeDialog($('#dlg-start'));
  stopGame();
  showScreen('scenes');
});
$('#dlg-start').addEventListener('cancel', (e) => {
  e.preventDefault();
  $('#btn-start-cancel').click();
});
$('#btn-start-diff').addEventListener('click', openSettings);

$('#btn-exit').addEventListener('click', pauseGame);
$('#btn-resume').addEventListener('click', resumeGame);
$('#dlg-pause').addEventListener('cancel', (e) => {
  e.preventDefault();
  resumeGame();
});
$('#btn-restart').addEventListener('click', () => {
  closeDialog($('#dlg-pause'));
  startGame();
});
$('#btn-quit').addEventListener('click', () => {
  closeDialog($('#dlg-pause'));
  stopGame();
  showScreen('scenes');
});

$('#btn-hint').addEventListener('click', () => {
  if (!game) return;
  if (game.hint()) {
    announce('Hint: Mr. Wiggles is somewhere inside the yellow circle.');
  } else {
    toast(`Hint recharging… ${Math.ceil(game.hintCooldownLeft() / 1000)}s`);
  }
});
$('#btn-zoom-in').addEventListener('click', () => game?.zoomBy(1.4));
$('#btn-zoom-out').addEventListener('click', () => game?.zoomBy(1 / 1.4));
$('#btn-target').addEventListener('click', () => {
  if (game?.state === 'running') game.pause();
  openDialog($('#dlg-meet'));
});
$('#dlg-meet').addEventListener('close', () => {
  if (game?.state === 'paused' && !$('#dlg-pause').open) game.resume();
});

$('#btn-next').addEventListener('click', () => {
  closeDialog($('#dlg-found'));
  const next = SCENES[SCENE_IDS.indexOf(currentSceneId) + 1];
  if (next) openScene(next.id);
});
$('#btn-again').addEventListener('click', () => {
  closeDialog($('#dlg-found'));
  openScene(currentSceneId);
});
$('#btn-found-scenes').addEventListener('click', () => {
  closeDialog($('#dlg-found'));
  stopGame();
  showScreen('scenes');
});
$('#dlg-found').addEventListener('cancel', (e) => {
  e.preventDefault();
  $('#btn-found-scenes').click();
});

$('#opt-motion').addEventListener('change', (e) => store.setReducedMotion(e.target.checked));
$('#btn-settings-close').addEventListener('click', () => closeDialog($('#dlg-settings')));
$('#btn-reset').addEventListener('click', () => openDialog($('#dlg-confirm')));
$('#btn-confirm-no').addEventListener('click', () => closeDialog($('#dlg-confirm')));
$('#btn-confirm-yes').addEventListener('click', () => {
  store.reset();
  closeDialog($('#dlg-confirm'));
  refreshHome();
  if (!screens.scenes.hidden) renderSceneList();
  announce('Progress reset.');
});

document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => closeDialog(btn.closest('dialog'))));

document.addEventListener('keydown', (e) => {
  if (screens.game.hidden || document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape' || e.key === 'p') pauseGame();
  if (e.key === 'h') $('#btn-hint').click();
});

window.addEventListener('resize', () => portraits.forEach((p) => hiDpi(p.canvas)));

showScreen('home');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Exposed for debugging in the console only.
globalThis.__wiggles = { get game() { return game; }, store };
