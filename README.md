# Find Mr. Wiggles

A busy seek-and-find web game in the spirit of *Where's Wally?*. Mr. Wiggles has wandered off again, and he's somewhere in a crowd of hundreds of moving people. Can you spot him?

**Play:** https://thestephlab.github.io/find-mr-wiggles/

![Mr. Wiggles character sheet](assets/mr-wiggles-reference.jpg)

## Features

- **Living scenes**: everyone is busy doing things. They walk, jog, ride escalators and travelators, queue at check-in and security, browse kiosks, sit on benches, read the paper, play the station piano, watch the busker and wait on platforms while trains arrive and depart.
- **Mr. Wiggles is always the same**: striped teal and orange hat with a feather, purple curly hair, mismatched glasses, a pink nose, a rainbow scarf, a patchwork coat, a satchel, striped socks, curly boots and a knobbly lantern stick. A new random seed puts him somewhere different every game.
- **Two scenes to start**, both fictional:
  1. **Whistlebury Junction**, a train station with platforms, a concourse and a metro hall.
  2. **Skyhaven International**, an airport with an apron, gates, travelators, security, check-in and baggage reclaim.
- **Five difficulty levels** (Relaxed → Expert). Higher levels give a bigger scene, a bigger crowd, more props and more *look-alikes* who share one or two of his traits (never his hat and hair together). Crowd sizes are capped so the game stays smooth on phones.
- **Pinch to zoom and drag to pan** on touch screens. Mouse wheel, trackpad pinch and keyboard work too.
- **Progress saved locally** with `localStorage`. There are no accounts. Scenes unlock in order, and you can replay any scene you've completed. Best times are tracked per difficulty.
- **Hints, stars and wrong-guess quips**: tap the wrong person and you'll find out who they are.
- **Works offline** as an installable PWA, with self-hosted fonts and no runtime dependencies.
- **Accessible**: keyboard play with a crosshair, screen-reader announcements, native `<dialog>`s, reduced-motion support and a "calmer crowds" setting.

## Controls

| Action | Touch | Mouse / trackpad | Keyboard |
| --- | --- | --- | --- |
| Look around | Drag | Drag | Arrow keys / WASD |
| Zoom | Pinch, or the + / − buttons | Scroll wheel / pinch | `+` / `-` |
| Guess | Tap a person | Click a person | `Enter` (checks the crosshair) |
| Hint | Hint button | Hint button | `H` |
| Pause | ☰ | ☰ | `Esc` / `P` |

## Running locally

No build step and no dependencies. Requires Node 20 or later, used only for the dev server and tests.

```bash
npm start        # http://localhost:8080
npm test         # node:test unit + simulation tests
```

You can also open the folder with any static file server. ES modules need `http://`, so opening the file directly with `file://` won't work.

## Architecture

```
index.html, css/styles.css     UI shell (screens + <dialog>s), storybook patchwork theme
js/main.js                     App controller: screens, dialogs, settings, progress wiring
js/core/                       Pure, framework-free utilities (unit-tested)
  rng.js                         Seeded PRNG (mulberry32)
  storage.js                     Versioned localStorage progress with safe fallbacks
  difficulty.js                  Difficulty presets → world size, crowd, props, decoys
  camera.js                      Pan/zoom/pinch maths
  nav.js                         Navigation graph, Dijkstra pathfinding, queues
  geometry.js                    Rect/segment helpers
js/game/
  people.js                      Character "looks"; Mr. Wiggles is a frozen look; decoy rules
  draw-person.js                 One renderer for everyone (front/back/side, poses, LOD)
  agents.js                      Crowd behaviour state machine (travel/activity/queue/fixed)
  world.js                       Builds a world from a scene + difficulty + seed
  renderer.js                    Cached floor bitmap, culling, depth sorting, LOD
  input.js                       Pointer Events: drag, pinch, tap, wheel, inertia
  game.js                        One play-through: loop, timer, guesses, hints, celebration
js/scenes/
  index.js                       Scene registry (order = unlock order)
  kit.js                         Scene-building API (floors, props, POIs, queues, escalators…)
  builders.js                    Composite builders (kiosk, bench, plant, pillar, signs…)
  props.js                       Reusable prop drawings
  train-station.js, airport.js   The scenes
sw.js, manifest.webmanifest    Offline support / installable app
```

**Rendering.** The static floor is rasterised once into an offscreen bitmap, capped at about 9 MP for mobile safety. When you zoom past that resolution the renderer switches to drawing only the visible floor items as vectors, so everything stays sharp. Props and people are culled to the viewport, depth-sorted by their feet so people walk *behind* pillars and kiosks, and drawn with a cheap low-detail version when they're tiny on screen.

**Crowd AI.** Each scene lays out a walkable navigation graph (grids around obstacles, plus one-way escalator and travelator links) and *points of interest* (bench seats, kiosk counters, platform edges, the departures board…). Agents pick nearby interests weighted by a "home" area, pathfind with Dijkstra, then do something there. Queues, such as check-in, security and the café, are first-come-first-served, and some even change people: checking in removes your suitcase, and baggage reclaim gives you one.

## Adding a scene

1. Create `js/scenes/my-scene.js`:

   ```js
   import { addKiosk, addBench, addPlant, scatter } from './builders.js';
   import { tiles } from './props.js';

   export const fairground = {
     id: 'puddleford-fair',          // unique, stable (used for saved progress)
     title: 'Puddleford Fair',       // fictional names only
     kind: 'Fairground',
     blurb: 'Candyfloss, carousels and very long queues.',
     aspect: 1.6,                    // width / height
     crowdFactor: 1,                 // >1 for busier scenes
     thumbColour: '#c9476e',
     build(kit) {
       const { W, H, rng } = kit;    // world size already scaled for difficulty
       kit.defineLevel('ground', { x: 0, y: 0, w: W, h: H });
       kit.roles = [{ role: 'tourist', weight: 3 }, { role: 'child', weight: 2 }, { role: 'elderly', weight: 0.5 }];
       kit.addFloor({ x: 0, y: 0, w: W, h: H }, (ctx, view) => tiles(ctx, { x: 0, y: 0, w: W, h: H }, 48, '#8fbf6a', '#86b562', view));

       // Props first (they register blockers)…
       addKiosk(kit, { x: 200, y: 300, name: 'Candyfloss', colour: '#ff6fb5', colour2: '#fff', goods: 'sweets', queue: true });
       scatter(kit, { x: 60, y: 60, w: W - 120, h: H - 120 }, kit.count(8), 50, 20, (x, y) => addBench(kit, { x, y: y + 16 }));
       scatter(kit, { x: 60, y: 60, w: W - 120, h: H - 120 }, kit.count(6), 20, 14, (x, y) => addPlant(kit, x + 10, y + 10));

       // …then the walkable grid last, so it routes around them.
       kit.grid({ x: 40, y: 40, w: W - 80, h: H - 80 }, 60);
     },
   };
   ```

2. Register it in `js/scenes/index.js` (array order is unlock order) and add the file to `SHELL` in `sw.js` so it works offline. Bump `VERSION` there too.
3. Run `npm test`. The scene-integrity tests automatically check every registered scene at every difficulty: the nav graph is fully connected, every point of interest is reachable, Mr. Wiggles spawns in bounds, the crowd keeps moving and people use the escalators.

Useful kit APIs: `addProp`, `addDynamic` (animated things like trains), `poi`, `queue`, `gateQueue` (queue-gated one-way passage), `escalator`, `travelator`, `station` (stationary staff), `count(n)` (scales with difficulty) and `isFree(rect)`.

## Progress & privacy

Everything is stored under one `localStorage` key (`find-mr-wiggles:progress`) on your device. Nothing is sent anywhere. Corrupt or unavailable storage, such as in private browsing, falls back safely to in-memory play. Settings → *Reset progress* clears it.

## Credits

- Mr. Wiggles character design: the original character sheet in `assets/`.
- Fonts: [Grandstander](https://fonts.google.com/specimen/Grandstander) and [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible), both under the SIL Open Font License and self-hosted for offline play.
- All places, airlines and destinations are fictional.
