import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../js/game/world.js';
import { trainStation } from '../js/scenes/train-station.js';
import { airport } from '../js/scenes/airport.js';
import { planPath } from '../js/game/agents.js';

test('platforms have multiple usable, individually reserved seats', () => {
  const world = createWorld(trainStation, { seed: 12, level: 3 });
  const seats = world.pois.filter(p => p.kind === 'platform-seat');
  assert.ok(seats.length >= 12);
  assert.ok(seats.every(p => p.mode === 'sit' && p.capacity === 1 && p.node >= 0));
});

test('photo-booth doorway lanes stay visible in front of tall concourse furniture', () => {
  const world = createWorld(trainStation, { seed: 33, level: 3 });
  const p = world.pois.find(p => p.kind === 'photo-booth');
  for (const dx of [-7, 7]) assert.ok(world.visibility(p.x + dx, p.y + 8) > .6, 'entrant and departing visitor remain readable');
});

test('both mirrored gate routes cross the terminal wall at the aircraft bridge doorway', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const a = world.agents.find(a => !a.isWiggles && a.state !== 'fixed');
  for (const gate of world.pois.filter(p => p.kind === 'boarding')) {
    const slot = gate.queue.slotPosition(0);
    Object.assign(a, { ...slot, task: { type: 'queue', poi: gate } });
    gate.onServed(a, world);
    const wall = Math.round(world.height * .2) + 18, door = gate.flight.dock.x + gate.flight.dock.facing * 70;
    const points = [slot, ...a.visit.points];
    const i = points.findIndex((p, i) => i && p.y < wall && points[i - 1].y >= wall);
    assert.ok(i > 0);
    const [p, q] = [points[i - 1], points[i]];
    const x = p.x + (q.x - p.x) * (wall - p.y) / (q.y - p.y);
    assert.ok(Math.abs(x - door) < 1, 'people use the real bridge, not an arbitrary glass panel');
  }
});

test('photo booth admits at most two people, shows occupancy and releases every visit', () => {
  const world = createWorld(trainStation, { seed: 12, level: 3 });
  const poi = world.pois.find(p => p.kind === 'photo-booth');
  assert.ok(poi, 'working booth activity exists');
  assert.equal(poi.requires(world.wiggles), false);
  const people = world.agents.filter(a => a.state !== 'fixed' && !a.isWiggles).slice(0, 2);
  world.agents = people;
  for (const [i, a] of people.entries()) {
    Object.assign(a, { x: poi.x + i * 14, y: poi.y + 2, nodeId: poi.node, state: 'idle', timer: 0 });
    poi.reserve(a);
    poi.occupants++;
    a.task = { type: 'poi', poi };
    planPath(a, world, poi.node, poi.entry(a));
  }
  const observed = new Set();
  for (let i = 0; i < 1200; i++) {
    world.update(.05);
    for (const a of people) if (a.visit) observed.add(a.visit.phase);
    assert.ok(poi.controller.inside.size <= 2);
  }
  assert.ok(observed.has('enter') && observed.has('use') && observed.has('exit'));
  assert.ok(poi.controller.completed >= 2);
  assert.ok(people.every(a => !a.hidden));
});

test('airport aircraft complete continuous takeoff and landing with gate-coordinated boarding', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const flights = world.dynamic.filter(d => d.kind === 'flight');
  assert.ok(flights.length >= 2);
  const plane = flights[0], states = new Set();
  let maxAirborne = 0, landingAirborne = false, previous = { ...plane.state };
  for (let i = 0; i < 10000; i++) {
    for (const f of flights) f.update(.05);
    assert.ok(flights.filter(f => ['pushback', 'taxi-out', 'takeoff', 'approach', 'landing', 'taxi-in'].includes(f.state.phase)).length <= 1, 'one aircraft owns the runway at a time');
    const st = plane.state;
    states.add(st.phase);
    if (st.phase === 'takeoff') maxAirborne = Math.max(maxAirborne, st.z - 56);
    if (st.phase === 'landing' && st.z > 80) landingAirborne = true;
    if (st.phase === 'away') assert.ok(world.P.X(st.x, st.y) > world.pictureWidth + 150);
    if (st.phase === 'approach') assert.ok(world.P.X(st.x, st.y) < -150);
    if (!['away', 'approach'].includes(st.phase) && previous.phase !== 'away') {
      assert.ok(Math.hypot(st.x - previous.x, st.y - previous.y, st.z - previous.z) < 30, `flight teleports ${previous.phase} -> ${st.phase}`);
    }
    previous = { ...st };
  }
  for (const phase of ['boarding', 'pushback', 'taxi-out', 'takeoff', 'away', 'approach', 'landing', 'taxi-in']) assert.ok(states.has(phase), phase);
  assert.ok(maxAirborne > 120 && landingAirborne);
  for (const gate of world.pois.filter(p => p.kind === 'boarding')) {
    assert.equal(gate.queue.available(), gate.flight.canBoard());
    assert.equal(gate.requires(world.wiggles), false);
    assert.ok(flights.includes(gate.flight));
  }
});

test('reclaim moves luggage around its actual belt and transfers a real bag to a traveller', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const carousel = world.dynamic.find(d => d.kind === 'reclaim');
  assert.ok(carousel);
  const before = carousel.bags.map(b => carousel.position(b));
  carousel.update(1);
  assert.notDeepEqual(carousel.bags.map(b => carousel.position(b)), before);
  for (const point of carousel.bags.map(b => carousel.position(b))) {
    const r = carousel.rect;
    assert.ok(point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
    assert.equal(point.z, 10);
  }
  const a = world.agents.find(a => !a.isWiggles);
  a.look.carry = null;
  const b = carousel.bags.find(b => b.show);
  const point = carousel.position(b);
  a.x = point.x; a.y = point.y;
  assert.equal(carousel.collect(a), true);
  assert.equal(a.look.carry.color, b.c);
  assert.equal(b.show, false);
  assert.equal(carousel.collect(world.wiggles), false);
});

test('real gate service sends travellers down the bridge, boards, departs and returns them safely', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const gate = world.pois.find(p => p.kind === 'boarding' && p.flight.canBoard());
  const agent = world.agents.find(a => !a.isWiggles && a.state !== 'fixed');
  world.agents = [agent, world.wiggles];
  const slot = gate.queue.slotPosition(0);
  Object.assign(agent, { ...slot, state: 'queue', queue: gate.queue, atFront: true, task: { type: 'queue', poi: gate }, mode: 'stand' });
  gate.queue.join(agent);
  const phases = new Set(), plane = gate.flight;
  let departed = false;
  for (let i = 0; i < 3300; i++) {
    world.update(.05);
    if (agent.visit) phases.add(agent.visit.phase);
    if (plane.state.phase === 'pushback') departed = true;
    assert.ok(!world.wiggles.hidden);
  }
  assert.deepEqual([...phases].sort(), ['enter', 'exit', 'use']);
  assert.ok(plane.state.boarded > 0);
  assert.equal(plane.state.pending, 0);
  assert.ok(plane.controller.completed > 0);
  assert.ok(!agent.hidden);
  assert.ok(departed, 'aircraft eventually gets its FIFO runway slot and departs');
});

test('closed gate waits are finite and never trap the searchable target', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const gate = world.pois.find(p => p.kind === 'boarding');
  const agent = world.agents.find(a => !a.isWiggles && a.state !== 'fixed');
  const slot = gate.queue.slotPosition(0);
  Object.assign(agent, { ...slot, state: 'queue', queue: gate.queue, atFront: true, queueWait: 54.99, task: { type: 'queue', poi: gate } });
  gate.queue.available = () => false;
  gate.queue.join(agent);
  world.update(.05);
  assert.notEqual(agent.state, 'queue');
  assert.equal(gate.queue.indexOf(agent), -1);
});

test('a gate waiting for a shared runway keeps boarding until its actual final call', () => {
  const world = createWorld(airport, { seed: 33, level: 3 });
  const gate = world.pois.find(p => p.kind === 'boarding');
  Object.assign(gate.flight.state, { phase: 'boarding', elapsed: 60, pending: 0 });
  gate.flight.update(.05);
  assert.equal(gate.flight.state.phase, 'boarding', 'another aircraft still owns the runway');
  assert.equal(gate.flight.canBoard(), true, 'waiting for a runway must not close boarding for minutes');
  assert.equal(gate.queue.available(), true);
  const flights = world.dynamic.filter(d => d.kind === 'flight');
  for (let i = 0; i < 4000 && !gate.flight.state.closing; i++) for (const f of flights) f.update(.05);
  assert.equal(gate.flight.state.closing, true, 'FIFO runway ownership eventually starts final call');
  assert.equal(gate.queue.available(), false);
  gate.flight.state.pending = 1;
  for (let i = 0; i < 160; i++) for (const f of flights) f.update(.05);
  assert.equal(gate.flight.state.phase, 'boarding', 'admitted bridge travellers enter before pushback');
  gate.flight.state.pending = 0;
  gate.flight.update(.05);
  assert.equal(gate.flight.state.phase, 'pushback');
});
