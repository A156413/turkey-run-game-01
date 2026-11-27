// The world: a side-scrolling farm escape. The turkey runs right while the
// ground scrolls left; the farmer chases from behind. The turkey jumps fences,
// hay bales, ovens and ground knives, ducks under swinging carving knives, and
// grabs corn and golden feathers. Three hits and the farmer catches the turkey;
// reaching the forest gate 1200 m out is the escape. Everything advances in
// fixed 1/60 s steps from a seeded random stream, so the same seed always
// plays the same run.

import {
  ESCAPE_DISTANCE_M,
  FIELD,
  LIVES,
  OBSTACLE,
  PICKUP,
  PLAYER,
  POOL_SIZE,
  PX_PER_M,
  SCORE,
  SPAWN_AHEAD,
  SPEED,
  STEP,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CORN = 8;
export const EVENT_FEATHER = 16;
export const EVENT_LAND = 32;

export const KIND_FENCE = 'fence';
export const KIND_HAY = 'hay';
export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_SWING = 'swing';
export const KIND_CORN = 'corn';
export const KIND_FEATHER = 'feather';

/** Forgiveness on each side of an obstacle's hitbox, in pixels. */
const HIT_SHRINK = 7;
/** How far behind the turkey the farmer starts, in pixels. */
const FARMER_START_GAP = 200;
/** How much closer the farmer lunges on each hit. */
const FARMER_LUNGE = 110;
/** How fast the farmer falls back again while the turkey runs clean. */
const FARMER_RECOVER = 16;

function makeObstacle() {
  return { active: false, kind: KIND_FENCE, x: 0, y: 0, width: 0, height: 0, phase: 0, period: 1.6, passed: false };
}

function makePickup() {
  return { active: false, kind: KIND_CORN, x: 0, y: 0, size: 0, taken: false, bob: 0 };
}

function makeParticle() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff' };
}

export function createWorld(random) {
  const obstacles = [];
  const pickups = [];
  const particles = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    obstacles.push(makeObstacle());
    pickups.push(makePickup());
    particles.push(makeParticle());
  }

  const state = {
    time: 0,
    distancePx: 0,
    distanceM: 0,
    score: 0,
    bonus: 0,
    corn: 0,
    lives: LIVES,
    speed: SPEED.start,
    over: false,
    escaped: false,
    player: {
      x: PLAYER.x,
      y: FIELD.groundY - PLAYER.height,
      vy: 0,
      onGround: true,
      ducking: false,
      invulnerable: 0,
      shield: 0,
      runPhase: 0,
      wasAirborne: false,
    },
    farmer: { gap: FARMER_START_GAP, lunge: 0 },
    obstacles,
    pickups,
    particles,
    spawnCursor: 1200,
    featherIn: 14000,
  };

  function spawnParticle(x, y, vx, vy, life, size, color) {
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (particle.active) continue;
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = vx;
      particle.vy = vy;
      particle.life = life;
      particle.maxLife = life;
      particle.size = size;
      particle.color = color;
      return;
    }
  }

  function placeObstacle(kind, x) {
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      if (obstacle.active) continue;
      const size = OBSTACLE[kind];
      obstacle.active = true;
      obstacle.kind = kind;
      obstacle.x = x;
      obstacle.width = size.width;
      obstacle.height = size.height;
      obstacle.y = kind === KIND_SWING ? 180 : FIELD.groundY - size.height;
      obstacle.phase = random() * Math.PI * 2;
      obstacle.period = 1.4 + random() * 0.5;
      obstacle.passed = false;
      return obstacle;
    }
    return null;
  }

  function placePickup(kind, x, y) {
    for (let index = 0; index < pickups.length; index += 1) {
      const pickup = pickups[index];
      if (pickup.active) continue;
      pickup.active = true;
      pickup.kind = kind;
      pickup.x = x;
      pickup.y = y;
      pickup.size = PICKUP[kind].size;
      pickup.taken = false;
      pickup.bob = random() * Math.PI * 2;
      return pickup;
    }
    return null;
  }

  /** Where the swinging blade's centre is right now. The branch tip is the
   * pivot; the rope is long enough that the blade hangs at head height. */
  function swingBlade(obstacle) {
    const angle = Math.sin((state.time / obstacle.period) * Math.PI * 2 + obstacle.phase) * 0.28;
    const pivotX = obstacle.x + 40;
    const pivotY = 108;
    const rope = 420;
    return {
      x: pivotX + Math.sin(angle) * rope,
      y: pivotY + Math.cos(angle) * rope,
      angle,
    };
  }

  function spawnPattern() {
    const cursor = state.spawnCursor;
    const roll = random();
    const easy = state.distanceM < 120;
    if (roll < 0.34 || easy) {
      // One ground obstacle, sometimes with a corn arc over it to jump for.
      const kind = easy ? (random() < 0.6 ? KIND_FENCE : KIND_HAY) : [KIND_FENCE, KIND_HAY, KIND_OVEN, KIND_KNIFE][Math.floor(random() * 4)];
      placeObstacle(kind, cursor);
      if (random() < 0.55) {
        const count = 3 + Math.floor(random() * 3);
        for (let index = 0; index < count; index += 1) {
          const arcX = cursor - 60 + index * 42;
          const arcY = FIELD.groundY - 96 - Math.sin((index / Math.max(1, count - 1)) * Math.PI) * 110;
          placePickup(KIND_CORN, arcX, arcY);
        }
      }
      state.spawnCursor = cursor + 380 + random() * 320 + state.speed * 0.4;
    } else if (roll < 0.55) {
      // Two ground obstacles in a row, spaced so the second can be jumped
      // after landing from the first even at top speed.
      const first = [KIND_FENCE, KIND_HAY, KIND_KNIFE][Math.floor(random() * 3)];
      const second = [KIND_FENCE, KIND_HAY, KIND_OVEN][Math.floor(random() * 3)];
      const secondAt = cursor + 320 + state.speed * 0.55 + random() * 120;
      placeObstacle(first, cursor);
      placeObstacle(second, secondAt);
      state.spawnCursor = secondAt + 380 + random() * 300 + state.speed * 0.4;
    } else if (roll < 0.72) {
      // A swinging carving knife: duck under it. Corn tempts a jump right after.
      placeObstacle(KIND_SWING, cursor);
      for (let index = 0; index < 4; index += 1) {
        placePickup(KIND_CORN, cursor + 190 + index * 40, FIELD.groundY - 40);
      }
      state.spawnCursor = cursor + 620 + random() * 260 + state.speed * 0.4;
    } else if (roll < 0.9) {
      // A low line of corn to run through, then a fence to jump.
      for (let index = 0; index < 5; index += 1) {
        placePickup(KIND_CORN, cursor + index * 44, FIELD.groundY - 40);
      }
      placeObstacle(random() < 0.5 ? KIND_FENCE : KIND_HAY, cursor + 300);
      state.spawnCursor = cursor + 700 + random() * 260 + state.speed * 0.4;
    } else {
      // A breather: a golden feather, worth points and a short shield.
      state.featherIn -= 1;
      placePickup(KIND_FEATHER, cursor, FIELD.groundY - 130);
      state.spawnCursor = cursor + 460 + random() * 200;
    }
  }

  function playerBox() {
    const player = state.player;
    if (player.onGround) {
      const height = player.ducking ? PLAYER.duckHeight : PLAYER.height;
      return { x: player.x + 6, y: FIELD.groundY - height, width: PLAYER.width - 12, height };
    }
    // Airborne, legs tucked: a smaller box, so a well-timed jump clears a
    // wide oven even at the run's slowest speed.
    return { x: player.x + 6, y: player.y + 18, width: PLAYER.width - 12, height: 40 };
  }

  function obstacleBox(obstacle) {
    if (obstacle.kind === KIND_SWING) {
      const blade = swingBlade(obstacle);
      return { x: blade.x - 15, y: blade.y - 28, width: 30, height: 56 };
    }
    return {
      x: obstacle.x + HIT_SHRINK,
      y: obstacle.y + 4,
      width: obstacle.width - HIT_SHRINK * 2,
      height: obstacle.height - 4,
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.4 + random() * 0.8);
      spawnParticle(x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity - 40, 0.4 + random() * 0.4, 2 + random() * 3, color);
    }
  }

  function reset() {
    state.time = 0;
    state.distancePx = 0;
    state.distanceM = 0;
    state.score = 0;
    state.bonus = 0;
    state.corn = 0;
    state.lives = LIVES;
    state.speed = SPEED.start;
    state.over = false;
    state.escaped = false;
    state.player.x = PLAYER.x;
    state.player.y = FIELD.groundY - PLAYER.height;
    state.player.vy = 0;
    state.player.onGround = true;
    state.player.ducking = false;
    state.player.invulnerable = 0;
    state.player.shield = 0;
    state.player.runPhase = 0;
    state.player.wasAirborne = false;
    state.farmer.gap = FARMER_START_GAP;
    state.farmer.lunge = 0;
    state.spawnCursor = 1200;
    state.featherIn = 14000;
    for (let index = 0; index < POOL_SIZE; index += 1) {
      obstacles[index].active = false;
      pickups[index].active = false;
      particles[index].active = false;
    }
  }

  /**
   * Advance the world one fixed step. `input` is { jump, duck }: jump is an
   * edge (true only on the step the button goes down), duck is held. In demo
   * mode (the title screen's attract run) the turkey runs on its own and
   * nothing can hurt it. Returns an event bitmask.
   */
  function step(dt, input, demo) {
    if (state.over || state.escaped) return 0;
    let events = 0;
    state.time += dt;
    const player = state.player;

    // Speed grows with distance, so the escape gets harder the further you get.
    state.speed = Math.min(SPEED.max, SPEED.start + state.distanceM * SPEED.perMetre);
    const scroll = state.speed * dt;
    state.distancePx += scroll;
    state.distanceM = state.distancePx / PX_PER_M;
    state.score = Math.floor(state.distanceM * SCORE.perMetre) + state.corn * SCORE.corn + state.bonus;

    // The turkey: jump, gravity, landing, ducking, running.
    player.ducking = Boolean(input.duck) && player.onGround;
    if (input.jump && player.onGround && !player.ducking) {
      player.vy = -PLAYER.jumpVelocity;
      player.onGround = false;
    }
    if (!player.onGround) {
      player.vy += PLAYER.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= FIELD.groundY - PLAYER.height) {
        player.y = FIELD.groundY - PLAYER.height;
        player.vy = 0;
        player.onGround = true;
        events |= EVENT_LAND;
        burst(player.x + PLAYER.width / 2, FIELD.groundY, '#c98f2e', 6, 90);
      }
    }
    player.wasAirborne = !player.onGround;
    player.runPhase += dt * (state.speed / 28);
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.shield > 0) player.shield -= dt;

    // The farmer: lunges closer on a hit, drifts back while the run is clean.
    if (state.farmer.lunge > 0) state.farmer.lunge = Math.max(0, state.farmer.lunge - dt * 0.5);
    state.farmer.gap = Math.min(FARMER_START_GAP, state.farmer.gap + FARMER_RECOVER * dt);

    // Spawn new patterns ahead of the player.
    while (state.spawnCursor < state.distancePx + SPAWN_AHEAD) spawnPattern();

    // Obstacles scroll left; the oven smokes; passed ones are forgotten.
    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];
      if (!obstacle.active) continue;
      obstacle.x -= scroll;
      if (obstacle.kind === KIND_OVEN && random() < 0.25) {
        spawnParticle(obstacle.x + obstacle.width * 0.7, obstacle.y + 6, -20 - random() * 20, -50 - random() * 40, 0.9, 3 + random() * 3, '#9a8a80');
      }
      if (!obstacle.passed && obstacle.x + obstacle.width < player.x) obstacle.passed = true;
      if (obstacle.x + obstacle.width < -160) obstacle.active = false;
    }

    // Pickups scroll left and bob; the turkey collects them.
    const box = playerBox();
    for (let index = 0; index < pickups.length; index += 1) {
      const pickup = pickups[index];
      if (!pickup.active || pickup.taken) continue;
      pickup.x -= scroll;
      pickup.bob += dt * 4;
      if (pickup.x + pickup.size < -60) {
        pickup.active = false;
        continue;
      }
      const pickupBox = { x: pickup.x - pickup.size / 2, y: pickup.y - pickup.size / 2, width: pickup.size, height: pickup.size };
      if (!demo && overlaps(box, pickupBox)) {
        pickup.taken = true;
        pickup.active = false;
        if (pickup.kind === KIND_CORN) {
          state.corn += 1;
          events |= EVENT_CORN;
          burst(pickup.x, pickup.y, '#f2c94c', 8, 120);
        } else {
          player.shield = PICKUP.feather.shieldSeconds;
          state.bonus += SCORE.feather;
          events |= EVENT_FEATHER;
          burst(pickup.x, pickup.y, '#ffd66b', 14, 160);
        }
      }
    }

    // Collisions: in demo mode the turkey ghosts through everything.
    if (!demo && player.invulnerable <= 0) {
      for (let index = 0; index < obstacles.length; index += 1) {
        const obstacle = obstacles[index];
        if (!obstacle.active) continue;
        if (!overlaps(box, obstacleBox(obstacle))) continue;
        if (player.shield > 0) {
          player.shield = 0;
          player.invulnerable = PLAYER.invulnerable;
          events |= EVENT_HIT;
          burst(box.x + box.width / 2, box.y + box.height / 2, '#ffd66b', 12, 180);
          break;
        }
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        state.farmer.gap = Math.max(40, state.farmer.gap - FARMER_LUNGE);
        state.farmer.lunge = 1;
        events |= EVENT_HIT;
        burst(box.x + box.width / 2, box.y + box.height / 2, '#ff5340', 12, 180);
        if (state.lives <= 0) {
          state.over = true;
          // Stop blinking: the end screen must show the caught turkey.
          player.invulnerable = 0;
          events |= EVENT_OVER;
        }
        break;
      }
    }

    // Particles drift and fade.
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt - scroll * 0.4;
      particle.y += particle.vy * dt;
      particle.vy += 60 * dt;
    }

    // Escape: the forest gate at the end of the run.
    if (state.distanceM >= ESCAPE_DISTANCE_M) {
      state.escaped = true;
      player.invulnerable = 0;
      state.bonus += 500;
      state.score = Math.floor(state.distanceM * SCORE.perMetre) + state.corn * SCORE.corn + state.bonus;
      events |= EVENT_ESCAPED;
    }

    return events;
  }

  reset();

  return { state, step, reset, swingBlade };
}
