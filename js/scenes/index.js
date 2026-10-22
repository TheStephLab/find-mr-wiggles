import { trainStation } from './train-station.js';
import { airport } from './airport.js';

/**
 * Scene registry. Order here is the unlock order.
 *
 * To add a scene: create `js/scenes/<name>.js` exporting an object with
 * `{ id, title, kind, blurb, aspect, crowdFactor, thumbColour, view, build(kit) }`
 * and append it to this list. See README → "Adding a scene".
 */
export const SCENES = Object.freeze([trainStation, airport]);

export const SCENE_IDS = SCENES.map((s) => s.id);

export function getScene(id) {
  return SCENES.find((s) => s.id === id) ?? null;
}
