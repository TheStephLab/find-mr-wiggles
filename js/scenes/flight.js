import { projectBox } from '../core/projection.js';
import { onFront } from './draw3d.js';
import { AIRCRAFT_BOUNDS, drawAircraft } from './transport.js';

const DURATIONS = { boarding: 42, pushback: 8, 'taxi-out': 12, takeoff: 16, away: 14, approach: 14, landing: 16, 'taxi-in': 14 };
const PHASES = Object.keys(DURATIONS);
const ease = t => t * t * (3 - 2 * t);

/** One aircraft owns one gate; all stage endpoints coincide except while completely off-screen. */
export function createFlight(P, W, apron, dock, index = 0, runwayControl = { owner: null, waiting: [] }) {
  const runway = apron * .22;
  const offLeft = P.xAt(-220, runway), offRight = P.xAt(P.width + 220, runway);
  const state = { phase: 'boarding', elapsed: 0, closing: false, x: dock.x, y: dock.y, z: 56, facing: dock.facing, pitch: 0, boarded: 0, pending: 0, cycles: 0 };
  const controller = { inside: new Set(), completed: 0 };
  function geometry() {
    const u = Math.min(1, state.elapsed / DURATIONS[state.phase]), e = ease(u);
    state.pitch = 0;
    switch (state.phase) {
      case 'boarding':
        Object.assign(state, { x: dock.x, y: dock.y, z: 56, facing: dock.facing }); break;
      case 'pushback':
        Object.assign(state, { x: dock.x - dock.facing * 65 * e, y: dock.y + (runway + 40 - dock.y) * e, z: 56, facing: dock.facing }); break;
      case 'taxi-out':
        Object.assign(state, { x: (dock.x - dock.facing * 65) * (1 - e) + 100 * e, y: runway + 40 * (1 - e), z: 56, facing: -1 }); break;
      case 'takeoff': {
        const run = u * u;
        Object.assign(state, { x: 100 + (offRight - 100) * run, y: runway, z: 56 + Math.max(0, (u - .38) / .62) ** 1.4 * 170, facing: 1, pitch: -.11 * Math.min(1, u * 3) }); break;
      }
      case 'away':
        Object.assign(state, { x: offRight, y: runway, z: 226, facing: 1 }); break;
      case 'approach':
        Object.assign(state, { x: offLeft - 250 * (1 - u), y: runway, z: 226 - u * 35, facing: 1 }); break;
      case 'landing':
        Object.assign(state, { x: offLeft + (W * .65 - offLeft) * (1 - (1 - u) ** 1.3), y: runway, z: 56 + 135 * (1 - u) ** 1.7, facing: 1, pitch: -.035 }); break;
      case 'taxi-in':
        Object.assign(state, { x: W * .65 * (1 - e) + dock.x * e, y: runway * (1 - e) + dock.y * e, z: 56, facing: dock.facing }); break;
    }
  }
  const flight = {
    kind: 'flight', state, controller, dock,
    canBoard: () => state.phase === 'boarding' && !state.closing,
    update(dt) {
      state.elapsed += dt;
      const duration = state.phase === 'boarding' && state.closing ? 7 : DURATIONS[state.phase];
      if (state.elapsed >= duration && !(state.phase === 'boarding' && state.closing && state.pending > 0)) {
        if ((state.phase === 'boarding' && !state.closing) || state.phase === 'away') {
          if (!runwayControl.waiting.includes(flight)) runwayControl.waiting.push(flight);
          if (runwayControl.owner || runwayControl.waiting[0] !== flight) { geometry(); return; }
          runwayControl.owner = flight; runwayControl.waiting.shift();
          if (state.phase === 'boarding') {
            state.closing = true; state.elapsed = 0;
            geometry(); return;
          }
        }
        if (state.phase === 'takeoff' || state.phase === 'taxi-in') runwayControl.owner = null;
        state.phase = PHASES[(PHASES.indexOf(state.phase) + 1) % PHASES.length];
        state.elapsed = 0;
        state.closing = false;
        if (state.phase === 'boarding') { state.cycles++; state.boarded = 0; }
      }
      geometry();
    },
    parts() {
      if (state.phase === 'away' || state.phase === 'approach') return [];
      const { x, y, z, facing, pitch } = state;
      return [{
        sortY: y,
        bounds: projectBox(P, { x: x + AIRCRAFT_BOUNDS.x, y: y - 4, w: AIRCRAFT_BOUNDS.w, d: 8, h: AIRCRAFT_BOUNDS.h + 35, z: z - 22 }, 10),
        draw: (ctx, t) => onFront(ctx, P, x, y, z, c => {
          c.save(); c.rotate(pitch * facing);
          drawAircraft(c, .95, facing, dock.airline);
          if (Math.floor(t * 3) % 2) { c.fillStyle = '#ff5347'; c.beginPath(); c.arc(0, -36, 1.5, 0, Math.PI * 2); c.fill(); }
          c.restore();
        }),
      }];
    },
  };
  // Staggering is obtained by advancing the actual lifecycle, not by jumping visible geometry.
  if (index % 3) for (let t = 0; t < (index % 3) * 55; t += .05) flight.update(.05);
  return flight;
}
