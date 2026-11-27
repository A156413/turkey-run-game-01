// The screenshot scenes behind ?shot=start|play|escape|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (jump the ground obstacle ahead, duck under a swinging
// knife, chase the lowest corn when that is safe), so the frame is what a
// short game really looks like and the same seed always gives the same frame.
// The end scene's pilot reacts late on purpose, so the farmer catches the
// turkey, as a hurried player is caught.

import { PLAYER, STEP } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER, KIND_SWING } from './world.js';
import { SCREEN_ESCAPED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 22;
const ESCAPE_LIMIT_SECONDS = 420;
const END_LIMIT_SECONDS = 300;
/** The end scene's pilot plays well for this long, then stops reacting. */
const END_GOOD_SECONDS = 18;
const SAMPLE = 1 / 30;

/**
 * How far ahead, in seconds, the autopilot looks when it decides to jump or
 * duck: the play and escape scenes' pilot looks well ahead and stays alive.
 */
const HORIZON_PLAY = 0.55;

/** The next obstacle ahead of the turkey, if it is close enough to matter. */
function nextObstacle(state, aheadPx) {
  let nearest = null;
  for (let index = 0; index < state.obstacles.length; index += 1) {
    const obstacle = state.obstacles[index];
    if (!obstacle.active) continue;
    // A swinging knife threatens across the whole sweep of its blade.
    if (obstacle.kind === KIND_SWING) {
      if (obstacle.x + 155 < state.player.x) continue;
      const gap = obstacle.x - 75 - (state.player.x + PLAYER.width);
      if (gap > aheadPx) continue;
      if (nearest === null || gap < nearest.gap) nearest = { obstacle, gap };
      continue;
    }
    const gap = obstacle.x - (state.player.x + PLAYER.width);
    if (gap < -40 || gap > aheadPx) continue;
    if (nearest === null || gap < nearest.gap) nearest = { obstacle, gap };
  }
  return nearest;
}

/** Jump the ground obstacle ahead, duck under a swinging knife. */
export function autopilot(state, horizonSeconds) {
  const player = state.player;
  const aheadPx = state.speed * horizonSeconds;
  const found = nextObstacle(state, aheadPx);
  if (!found) return { jump: false, duck: false };
  const { obstacle, gap } = found;
  if (obstacle.kind === KIND_SWING) {
    // Duck once the blade's sweep is close, and stay down until it has passed.
    return { jump: false, duck: gap < 170 };
  }
  // Jump so the turkey is high while the obstacle passes under it, and lands
  // just past it: about a fifth of a second of travel before the obstacle.
  const jumpAt = state.speed * 0.2;
  return { jump: player.onGround && gap < jumpAt, duck: false };
}

/**
 * Set `world` to the named scene (start, play, escape or end; any other name
 * is start) and return the screen to draw over it and the best distance to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'escape') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { jump: false, duck: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'escape') {
    for (let index = 0; index < ESCAPE_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
      if (events & EVENT_ESCAPED) break;
      if (events & EVENT_OVER) break;
    }
    const escaped = world.state.escaped;
    return { screen: escaped ? SCREEN_ESCAPED : SCREEN_PLAY, best: world.state.distanceM };
  }
  if (name === 'end') {
    // Play well for a while to build distance and score, then freeze: the
    // farmer catches a turkey that stops reacting.
    for (let index = 0; index < END_GOOD_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
      if (events & EVENT_OVER) break;
    }
    for (let index = 0; index < END_LIMIT_SECONDS / STEP && !world.state.over; index += 1) {
      world.step(STEP, { jump: false, duck: false }, false);
    }
    const over = world.state.over;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.distanceM };
  }
  for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, HORIZON_PLAY), false);
    if (events & EVENT_OVER) break;
    if (events & EVENT_ESCAPED) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.distanceM };
}
