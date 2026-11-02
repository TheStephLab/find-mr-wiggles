import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const origin = 'http://localhost:8080';
// Removed URL fixtures only: these must not exist or return from an older cache.
const retired = ['./js/game/classic.js', './js/core/mode.js'];

async function worker() {
  const handlers = {};
  const buckets = new Map();
  const caches = {
    async open(name) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const entries = buckets.get(name);
      return {
        async addAll(paths) {
          for (const path of paths) {
            await access(new URL(path === './' ? './index.html' : path, root));
            entries.set(new URL(path, origin).href, new Response('shell'));
          }
        },
        async match(request) { return entries.get(request.url); },
        async put(request, response) { entries.set(request.url, response); },
      };
    },
    async keys() { return [...buckets.keys()]; },
    async delete(name) { return buckets.delete(name); },
  };
  const self = {
    location: { origin },
    addEventListener(type, fn) { handlers[type] = fn; },
    async skipWaiting() {},
    clients: { async claim() {} },
  };
  runInNewContext(await readFile(new URL('sw.js', root), 'utf8'), {
    self, caches, URL, fetch: async () => new Response('Not found', { status: 404 }),
  });
  const lifecycle = type => new Promise(resolve => handlers[type]({ waitUntil: resolve }));
  const fetchURL = path => new Promise(resolve => handlers.fetch({
    request: new Request(new URL(path, origin)), respondWith: resolve,
  }));
  return { caches, buckets, lifecycle, fetchURL };
}

test('shell installs only existing files, including all five locations', async () => {
  const w = await worker();
  await w.lifecycle('install');
  assert.deepEqual(await w.caches.keys(), ['wiggles-v7']);
  const entries = [...w.buckets.get('wiggles-v7').keys()];
  for (const name of ['train-station', 'airport', 'galleria', 'market', 'fairground']) {
    assert.ok(entries.includes(`${origin}/js/scenes/${name}.js`));
  }
  for (const path of retired) {
    assert.equal(entries.includes(new URL(path, origin).href), false);
    await assert.rejects(access(new URL(path, root)), { code: 'ENOENT' });
  }
});

for (const version of [5, 6]) test(`v${version} upgrade evicts obsolete caches and never serves a removed module from them`, async () => {
  const w = await worker();
  const old = await w.caches.open(`wiggles-v${version}`);
  for (const path of retired) await old.put(new Request(new URL(path, origin)), new Response('obsolete code'));
  await w.lifecycle('install');
  for (const path of retired) {
    assert.equal((await w.fetchURL(path)).status, 404, 'fetch only consults the current cache even before activation cleanup');
  }
  await w.lifecycle('activate');
  assert.deepEqual(await w.caches.keys(), ['wiggles-v7']);
  for (const path of retired) assert.equal((await w.fetchURL(path)).status, 404);
});

test('shell UI exposes difficulty and reduced motion without alternate-game controls or readiness gates', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /id="difficulty-options"/);
  assert.match(html, /id="opt-motion"/);
  assert.doesNotMatch(html, /classic|change mode|start-readiness|scenes-mode|home-mode|start-mode/i);
  assert.doesNotMatch(html, /id="btn-start"[^>]*disabled/);
});
