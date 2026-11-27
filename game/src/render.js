// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. A sunset farm in flat autumn colours: a
// gradient sky with a low sun, parallax hills and a barn, a dirt track with
// grass and pumpkins, and a hand-drawn turkey, farmer, oven and carving
// knives. Canvas text for the HUD and the panels. All animation is driven by
// the world's own clock, so the same seed always paints the same frame.

import { ESCAPE_DISTANCE_M, FIELD, FONT, LIVES, PALETTE, PLAYER, PX_PER_M } from './config.js';
import { KIND_CORN, KIND_FEATHER, KIND_FENCE, KIND_HAY, KIND_KNIFE, KIND_OVEN, KIND_SWING } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ESCAPED = 'escaped';

/** Deterministic decoration: a hash of the segment index, so the scenery is stable per seed. */
function hash(n) {
  let value = (n * 2654435761) | 0;
  value ^= value >>> 15;
  value = Math.imul(value, 2246822519);
  value ^= value >>> 13;
  return ((value >>> 0) / 4294967296);
}

export function createRenderer(canvas, world) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function font(size, weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, weight = '') {
    context.font = font(size, weight);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  // ---------------------------------------------------------------- scenery

  function drawSky(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.45, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);

    // Low sun with a halo, sinking over the hills.
    const sunX = 1010;
    const sunY = 430;
    const halo = context.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
    halo.addColorStop(0, 'rgba(255, 214, 107, 0.85)');
    halo.addColorStop(1, 'rgba(255, 214, 107, 0)');
    context.fillStyle = halo;
    context.fillRect(sunX - 190, sunY - 190, 380, 380);
    context.fillStyle = PALETTE.sunCore;
    context.beginPath();
    context.arc(sunX, sunY, 58, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(sunX, sunY, 46, 0, Math.PI * 2);
    context.fill();

    // Slow clouds, drifting with the world clock. Speeds and heights are
    // staggered, not monotonic, so they never line up in a row.
    context.fillStyle = 'rgba(255, 214, 180, 0.5)';
    const cloudSpeed = [5, 11, 7, 13, 9];
    const cloudY = [64, 132, 92, 168, 118];
    for (let index = 0; index < 5; index += 1) {
      const baseX = index * 320 + 80;
      const cloudX = (((baseX - state.time * cloudSpeed[index]) % 1500) + 1500) % 1500 - 110;
      const y = cloudY[index];
      context.beginPath();
      context.ellipse(cloudX, y, 74, 18, 0, 0, Math.PI * 2);
      context.ellipse(cloudX + 44, y + 6, 52, 14, 0, 0, Math.PI * 2);
      context.fill();
    }

    // Parallax hills, the barn and a windmill on the far ridge.
    const farOffset = (state.distancePx * 0.12) % 1280;
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(-farOffset, FIELD.groundY);
    for (let x = -farOffset; x <= FIELD.width + 320; x += 320) {
      context.quadraticCurveTo(x + 160, FIELD.groundY - 150, x + 320, FIELD.groundY);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();

    const nearOffset = (state.distancePx * 0.25) % 1280;
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(-nearOffset, FIELD.groundY);
    for (let x = -nearOffset; x <= FIELD.width + 320; x += 320) {
      context.quadraticCurveTo(x + 160, FIELD.groundY - 84, x + 320, FIELD.groundY);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();

    // The barn, sliding past slowly on the far ridge. It sits high on the
    // ridge, above the turkey's head, so it never covers the player.
    const barnX = 1280 - ((state.distancePx * 0.25 + 240) % 1800);
    if (barnX > -220 && barnX < FIELD.width + 40) {
      const barnY = FIELD.groundY - 188;
      context.fillStyle = PALETTE.barn;
      context.fillRect(barnX, barnY + 34, 150, 84);
      context.fillStyle = PALETTE.barnRoof;
      context.beginPath();
      context.moveTo(barnX - 8, barnY + 38);
      context.lineTo(barnX + 75, barnY - 6);
      context.lineTo(barnX + 158, barnY + 38);
      context.closePath();
      context.fill();
      context.fillStyle = '#f2823c';
      context.fillRect(barnX + 58, barnY + 66, 34, 52);
      context.fillStyle = '#ffd66b';
      context.fillRect(barnX + 20, barnY + 50, 18, 18);
      context.fillRect(barnX + 112, barnY + 50, 18, 18);
    }
  }

  function drawGround(state) {
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    context.fillStyle = PALETTE.groundDark;
    context.fillRect(0, FIELD.groundY + 64, FIELD.width, 6);

    // Grass tufts and pebbles, placed by segment hash so they never jump.
    const segment = Math.floor(state.distancePx / 90);
    for (let index = -1; index < 17; index += 1) {
      const seg = segment + index;
      const x = seg * 90 - state.distancePx + hash(seg) * 60;
      const tuftY = FIELD.groundY + 18 + hash(seg + 500) * 84;
      context.strokeStyle = hash(seg + 9) < 0.5 ? PALETTE.grass : PALETTE.grassDark;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x, tuftY);
      context.lineTo(x - 5, tuftY - 12 - hash(seg + 1) * 8);
      context.moveTo(x + 4, tuftY);
      context.lineTo(x + 8, tuftY - 10 - hash(seg + 2) * 8);
      context.stroke();
    }

    // Pumpkins and corn stalks along the track, by segment hash.
    for (let index = -1; index < 9; index += 1) {
      const seg = Math.floor(state.distancePx / 220) + index;
      const x = seg * 220 - state.distancePx + hash(seg + 77) * 120;
      if (hash(seg + 31) < 0.45) {
        const pumpkinY = FIELD.groundY + 78 + hash(seg + 55) * 26;
        context.fillStyle = '#d2691e';
        context.beginPath();
        context.ellipse(x, pumpkinY, 20, 15, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#b4552d';
        context.beginPath();
        context.ellipse(x, pumpkinY, 8, 15, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#7fae4c';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x, pumpkinY - 14);
        context.quadraticCurveTo(x + 6, pumpkinY - 22, x + 12, pumpkinY - 20);
        context.stroke();
      } else if (hash(seg + 31) < 0.7) {
        const stalkY = FIELD.groundY + 30;
        context.strokeStyle = '#7fae4c';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(x, stalkY + 60);
        context.lineTo(x, stalkY - 30);
        context.stroke();
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.ellipse(x + 8, stalkY - 6, 7, 14, 0.4, 0, Math.PI * 2);
        context.fill();
      }
    }

    // The forest gate: the escape, drawn at the end of the run.
    const gateX = PLAYER.x + (ESCAPE_DISTANCE_M * PX_PER_M - state.distancePx);
    if (gateX < FIELD.width + 200 && gateX > -200) {
      // A wooden arch under one wide green canopy, with a sign over the door.
      context.fillStyle = '#2e5d33';
      context.fillRect(gateX - 90, FIELD.groundY - 210, 180, 210);
      context.fillStyle = '#3f7a44';
      context.beginPath();
      context.ellipse(gateX, FIELD.groundY - 208, 116, 42, 0, Math.PI, 0);
      context.fill();
      context.fillStyle = '#7fce62';
      context.beginPath();
      context.ellipse(gateX, FIELD.groundY - 214, 84, 30, 0, Math.PI, 0);
      context.fill();
      context.fillStyle = '#5d3418';
      context.fillRect(gateX - 98, FIELD.groundY - 210, 12, 210);
      context.fillRect(gateX + 86, FIELD.groundY - 210, 12, 210);
      context.fillStyle = '#1d3d22';
      context.fillRect(gateX - 56, FIELD.groundY - 150, 112, 150);
      context.fillStyle = '#ffd66b';
      text('WILD WOODS', gateX, FIELD.groundY - 168, 18, '#ffd66b', 'center', 'bold');
      text('SAFE!', gateX, FIELD.groundY - 140, 16, '#fff6e8', 'center', 'bold');
    }
  }

  // ------------------------------------------------------------- characters

  function drawTurkey(player, state) {
    const ducking = player.ducking;
    const height = ducking ? 34 : 58;
    // The sprite's bottom is the ground while running or ducking, and the
    // player's own y plus its height while airborne: the jump must show.
    const bottom = player.onGround ? FIELD.groundY : player.y + PLAYER.height;
    const top = bottom - height;
    const cx = player.x + PLAYER.width / 2;
    const base = bottom;
    const airborne = !player.onGround;
    const bob = airborne ? 0 : Math.sin(player.runPhase * 2) * 3;
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
    if (blink) return;

    // Shield shimmer while a golden feather protects the turkey.
    if (player.shield > 0) {
      context.strokeStyle = 'rgba(255, 214, 107, 0.85)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(cx, top + height / 2, 52 + Math.sin(state.time * 6) * 3, 0, Math.PI * 2);
      context.stroke();
    }

    // Tail fan: five autumn feathers, spread when running, folded when ducking.
    const spread = ducking ? 0.35 : 1;
    for (let index = 0; index < 5; index += 1) {
      const angle = (-0.9 + index * 0.45) * spread;
      const length = 46 - Math.abs(index - 2) * 6;
      context.save();
      context.translate(cx - 16, base - 26 + bob * 0.4);
      context.rotate(angle);
      context.fillStyle = PALETTE.tail[index];
      context.beginPath();
      context.ellipse(0, -length / 2, 11, length / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff6e8';
      context.beginPath();
      context.arc(0, -length + 8, 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    // Body, wing and head.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx + 2, base - 24 + bob * 0.4, 30, ducking ? 16 : 24, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx - 2, base - 22 + bob * 0.4, 16, ducking ? 9 : 13, -0.4, 0, Math.PI * 2);
    context.fill();

    // Head, beak, wattle and snood.
    const headX = cx + 24;
    const headY = ducking ? base - 26 : base - 52 + bob * 0.4;
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(headX, headY, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(headX + 8, headY - 2);
    context.lineTo(headX + 22, headY + 3);
    context.lineTo(headX + 8, headY + 6);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(headX + 4, headY + 11, 4, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.snood;
    context.beginPath();
    context.ellipse(headX + 10, headY - 8, 2.5, 6, 0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#241120';
    context.beginPath();
    context.arc(headX + 3, headY - 3, 2, 0, Math.PI * 2);
    context.fill();

    // Legs: scissoring while running, tucked while airborne, folded when ducking.
    context.strokeStyle = PALETTE.leg;
    context.lineWidth = 4;
    context.lineCap = 'round';
    if (airborne) {
      context.beginPath();
      context.moveTo(cx - 4, base - 8);
      context.lineTo(cx - 10, base + 2);
      context.moveTo(cx + 6, base - 8);
      context.lineTo(cx + 12, base + 2);
      context.stroke();
    } else if (!ducking) {
      const swing = Math.sin(player.runPhase * 2) * 10;
      context.beginPath();
      context.moveTo(cx - 4, base - 8);
      context.lineTo(cx - 4 + swing, base);
      context.moveTo(cx + 6, base - 8);
      context.lineTo(cx + 6 - swing, base);
      context.stroke();
    }
  }

  function drawFarmer(state) {
    const gap = state.farmer.gap;
    const lunge = state.farmer.lunge;
    const x = PLAYER.x - gap + lunge * 30;
    const base = FIELD.groundY;
    const runPhase = state.time * 11;
    const bob = Math.sin(runPhase) * 3;
    const scale = 1 + lunge * 0.12;

    context.save();
    context.translate(x + 40, base);
    context.scale(scale, scale);
    context.translate(-40, 0);

    // Legs pumping behind the turkey.
    const swing = Math.sin(runPhase) * 14;
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-8, -34);
    context.lineTo(-8 + swing, 0);
    context.moveTo(6, -34);
    context.lineTo(6 - swing, 0);
    context.stroke();

    // Overalls and red shirt.
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(-16, -78, 34, 48);
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(-18, -104, 38, 32);
    context.fillStyle = '#ffd66b';
    context.fillRect(-14, -78, 5, 12);
    context.fillRect(11, -78, 5, 12);

    // Arms: one pumping, one thrusting a pitchfork forward.
    context.strokeStyle = PALETTE.farmerShirt;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(-14, -96);
    context.lineTo(-30, -70 + Math.sin(runPhase) * 6);
    context.stroke();
    context.beginPath();
    context.moveTo(16, -96);
    context.lineTo(38, -84);
    context.stroke();

    // The pitchfork, reaching for the turkey.
    context.strokeStyle = '#8a5a30';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(38, -84);
    context.lineTo(86, -118);
    context.stroke();
    context.strokeStyle = PALETTE.pitchfork;
    context.lineWidth = 3;
    for (let tine = -1; tine <= 1; tine += 1) {
      context.beginPath();
      context.moveTo(86 + tine * 7, -118);
      context.lineTo(98 + tine * 8, -138);
      context.stroke();
    }

    // Head: straw hat, angry brows, beard.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(0, -118, 15, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerBeard;
    context.beginPath();
    context.arc(2, -108, 11, 0, Math.PI);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(0, -130, 26, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(-13, -150, 26, 20);
    context.fillStyle = '#c0392b';
    context.fillRect(-13, -134, 26, 5);
    context.strokeStyle = '#241120';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(-8, -122);
    context.lineTo(0, -119);
    context.moveTo(12, -122);
    context.lineTo(4, -119);
    context.stroke();
    context.fillStyle = '#241120';
    context.beginPath();
    context.arc(-4, -117, 1.8, 0, Math.PI * 2);
    context.arc(8, -117, 1.8, 0, Math.PI * 2);
    context.fill();

    context.restore();

    // "He's gaining!" warning when the farmer is close.
    if (gap < 120) {
      const pulse = 0.6 + Math.sin(state.time * 8) * 0.4;
      context.globalAlpha = pulse;
      text('THE FARMER IS RIGHT BEHIND YOU!', FIELD.width / 2, 118, 26, PALETTE.danger, 'center', 'bold');
      context.globalAlpha = 1;
    }
  }

  // -------------------------------------------------------------- obstacles

  function drawFence(obstacle) {
    context.fillStyle = PALETTE.fence;
    context.fillRect(obstacle.x, obstacle.y + 8, obstacle.width, 8);
    context.fillRect(obstacle.x, obstacle.y + 34, obstacle.width, 8);
    context.fillRect(obstacle.x + 4, obstacle.y, 8, obstacle.height);
    context.fillRect(obstacle.x + obstacle.width - 12, obstacle.y, 8, obstacle.height);
    context.fillStyle = '#6b4423';
    context.beginPath();
    context.moveTo(obstacle.x + 4, obstacle.y);
    context.lineTo(obstacle.x + 8, obstacle.y - 8);
    context.lineTo(obstacle.x + 12, obstacle.y);
    context.moveTo(obstacle.x + obstacle.width - 12, obstacle.y);
    context.lineTo(obstacle.x + obstacle.width - 8, obstacle.y - 8);
    context.lineTo(obstacle.x + obstacle.width - 4, obstacle.y);
    context.fill();
  }

  function drawHay(obstacle) {
    context.fillStyle = '#d9a441';
    context.beginPath();
    context.ellipse(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#a8741f';
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 2 - 8, obstacle.height / 2 - 8, 0, 0, Math.PI * 2);
    context.ellipse(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width / 4, obstacle.height / 4, 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = '#e8c96a';
    context.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      context.beginPath();
      context.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
      context.lineTo(
        obstacle.x + obstacle.width / 2 + Math.cos(angle) * (obstacle.width / 2 - 4),
        obstacle.y + obstacle.height / 2 + Math.sin(angle) * (obstacle.height / 2 - 4),
      );
      context.stroke();
    }
  }

  function drawOven(obstacle, state) {
    const glow = 0.55 + Math.sin(state.time * 5 + obstacle.x * 0.01) * 0.2;
    const halo = context.createRadialGradient(
      obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height * 0.62, 8,
      obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height * 0.62, 90,
    );
    halo.addColorStop(0, `rgba(255, 123, 36, ${glow})`);
    halo.addColorStop(1, 'rgba(255, 123, 36, 0)');
    context.fillStyle = halo;
    context.fillRect(obstacle.x - 50, obstacle.y - 50, obstacle.width + 100, obstacle.height + 100);

    context.fillStyle = PALETTE.oven;
    roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
    context.fill();
    context.fillStyle = '#3a332e';
    context.fillRect(obstacle.x + 8, obstacle.y + 6, obstacle.width - 16, 10);
    // The glowing door: a turkey silhouette inside, and flames licking up.
    context.fillStyle = PALETTE.ovenGlow;
    roundRect(obstacle.x + 16, obstacle.y + 30, obstacle.width - 32, obstacle.height - 42, 6);
    context.fill();
    context.fillStyle = PALETTE.ovenFire;
    for (let index = 0; index < 3; index += 1) {
      const flameX = obstacle.x + 30 + index * 22;
      const flameH = 16 + Math.sin(state.time * 9 + index * 2.1) * 6;
      context.beginPath();
      context.moveTo(flameX, obstacle.y + obstacle.height - 14);
      context.quadraticCurveTo(flameX - 7, obstacle.y + obstacle.height - 14 - flameH, flameX, obstacle.y + obstacle.height - 22 - flameH);
      context.quadraticCurveTo(flameX + 7, obstacle.y + obstacle.height - 14 - flameH, flameX, obstacle.y + obstacle.height - 14);
      context.fill();
    }
    // Chimney with a heat shimmer.
    context.fillStyle = '#1d1917';
    context.fillRect(obstacle.x + obstacle.width - 30, obstacle.y - 26, 18, 28);
    context.fillStyle = '#ffd66b';
    text('HOT!', obstacle.x + obstacle.width / 2, obstacle.y - 8, 15, '#ffd66b', 'center', 'bold');
  }

  function drawKnife(obstacle) {
    // A carving knife stabbed blade-up into the track.
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(obstacle.x + obstacle.width / 2 - 6, obstacle.y + obstacle.height - 22, 12, 22);
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(obstacle.x, obstacle.y + obstacle.height - 20);
    context.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
    context.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height - 20);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.knifeEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(obstacle.x + 2, obstacle.y + obstacle.height - 22);
    context.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + 2);
    context.stroke();
  }

  function drawSwing(obstacle, state) {
    const blade = world.swingBlade(obstacle);
    // The post and branch the knife hangs from.
    context.fillStyle = '#5d3418';
    context.fillRect(obstacle.x - 8, 96, 14, FIELD.groundY - 96);
    context.fillStyle = '#6b4423';
    context.beginPath();
    context.moveTo(obstacle.x - 8, 108);
    context.lineTo(obstacle.x + 60, 96);
    context.lineTo(obstacle.x + 60, 110);
    context.lineTo(obstacle.x - 1, 122);
    context.closePath();
    context.fill();
    // Rope and blade, swinging on its arc from the branch tip.
    context.strokeStyle = '#c9b18a';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(obstacle.x + 40, 108);
    context.lineTo(blade.x, blade.y - 26);
    context.stroke();
    context.save();
    context.translate(blade.x, blade.y);
    context.rotate(blade.angle * 0.9);
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(-5, -30, 10, 18);
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(-13, -12);
    context.lineTo(0, 30);
    context.lineTo(13, -12);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.knifeEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-11, -10);
    context.lineTo(0, 28);
    context.stroke();
    context.restore();
    // A warning sign on the post.
    context.fillStyle = '#ffd66b';
    context.fillRect(obstacle.x - 26, 150, 36, 26);
    context.fillStyle = '#241120';
    text('!', obstacle.x - 8, 171, 20, '#241120', 'center', 'bold');
  }

  function drawPickup(pickup, state) {
    const bobY = Math.sin(pickup.bob) * 4;
    if (pickup.kind === KIND_CORN) {
      const x = pickup.x;
      const y = pickup.y + bobY;
      context.fillStyle = PALETTE.cornHusk;
      context.beginPath();
      context.ellipse(x - 8, y + 8, 5, 12, -0.5, 0, Math.PI * 2);
      context.ellipse(x + 8, y + 8, 5, 12, 0.5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.corn;
      context.beginPath();
      context.ellipse(x, y, 9, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#d9a441';
      for (let index = -1; index <= 1; index += 1) {
        context.fillRect(x + index * 5 - 1, y - 10, 2, 20);
      }
    } else {
      const x = pickup.x;
      const y = pickup.y + bobY;
      const glow = context.createRadialGradient(x, y, 2, x, y, 34);
      glow.addColorStop(0, 'rgba(255, 214, 107, 0.8)');
      glow.addColorStop(1, 'rgba(255, 214, 107, 0)');
      context.fillStyle = glow;
      context.fillRect(x - 34, y - 34, 68, 68);
      context.fillStyle = PALETTE.feather;
      context.save();
      context.translate(x, y);
      context.rotate(Math.sin(state.time * 3) * 0.25);
      context.beginPath();
      context.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#b4552d';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -14);
      context.lineTo(0, 14);
      context.stroke();
      context.restore();
    }
  }

  function drawParticles(state) {
    for (let index = 0; index < state.particles.length; index += 1) {
      const particle = state.particles[index];
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  // ------------------------------------------------------------------- HUD

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? '#ff5340' : 'rgba(255, 246, 232, 0.25)';
    context.beginPath();
    context.moveTo(x, y + size * 0.35);
    context.bezierCurveTo(x - size * 0.6, y - size * 0.25, x - size * 0.2, y - size * 0.7, x, y - size * 0.2);
    context.bezierCurveTo(x + size * 0.2, y - size * 0.7, x + size * 0.6, y - size * 0.25, x, y + size * 0.35);
    context.fill();
  }

  function drawHud(state, best) {
    context.fillStyle = PALETTE.hudBg;
    roundRect(16, 14, FIELD.width - 32, 64, 12);
    context.fill();

    text(`SCORE ${state.score}`, 36, 56, 30, PALETTE.text, 'left', 'bold');
    const distanceText = `DISTANCE ${Math.floor(state.distanceM)}m / ${ESCAPE_DISTANCE_M}m`;
    text(distanceText, FIELD.width / 2, 44, 24, PALETTE.text, 'center', 'bold');
    // Progress bar to the forest gate.
    const barX = FIELD.width / 2 - 190;
    const barY = 54;
    context.fillStyle = 'rgba(255, 246, 232, 0.25)';
    roundRect(barX, barY, 380, 10, 5);
    context.fill();
    context.fillStyle = PALETTE.safe;
    const progress = Math.min(1, state.distanceM / ESCAPE_DISTANCE_M);
    if (progress > 0) {
      roundRect(barX, barY, 380 * progress, 10, 5);
      context.fill();
    }
    context.fillStyle = '#ffd66b';
    context.beginPath();
    context.arc(barX + 380, barY + 5, 7, 0, Math.PI * 2);
    context.fill();

    // Hearts, corn and best distance on the right.
    let right = FIELD.width - 36;
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(right - 12, 48, 26, life < state.lives);
      right -= 40;
    }
    text(`CORN ${state.corn}`, right - 8, 56, 26, PALETTE.text, 'right', 'bold');
    if (state.player.shield > 0) {
      text(`SHIELD ${Math.ceil(state.player.shield)}s`, FIELD.width / 2, 118, 22, '#ffd66b', 'center', 'bold');
    }
    if (best > 0) text(`BEST ${Math.floor(best)}m`, 36, 100, 18, PALETTE.muted, 'left');
  }

  // ---------------------------------------------------------------- panels

  function drawPanel(title, lines, prompt, accent) {
    const width = 760;
    const height = 150 + lines.length * 36;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 16);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, width, height, 16);
    context.stroke();
    text(title, FIELD.width / 2, y + 74, 52, PALETTE.text, 'center', 'bold');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 124 + index * 36, 23, PALETTE.muted, 'center');
    }
    // The prompt is always shown: a screenshot must never catch it blinked off.
    text(prompt, FIELD.width / 2, y + height - 34, 24, '#ffd66b', 'center', 'bold');
  }

  // ------------------------------------------------------------------ draw

  function drawField(state) {
    drawSky(state);
    drawGround(state);
    for (let index = 0; index < state.pickups.length; index += 1) {
      const pickup = state.pickups[index];
      if (pickup.active && !pickup.taken) drawPickup(pickup, state);
    }
    for (let index = 0; index < state.obstacles.length; index += 1) {
      const obstacle = state.obstacles[index];
      if (!obstacle.active) continue;
      if (obstacle.kind === KIND_FENCE) drawFence(obstacle);
      else if (obstacle.kind === KIND_HAY) drawHay(obstacle);
      else if (obstacle.kind === KIND_OVEN) drawOven(obstacle, state);
      else if (obstacle.kind === KIND_KNIFE) drawKnife(obstacle);
      else if (obstacle.kind === KIND_SWING) drawSwing(obstacle, state);
    }
    drawFarmer(state);
    drawTurkey(state.player, state);
    drawParticles(state);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'GOBBLE DASH',
        ['The Great Turkey Escape — Thanksgiving is coming!', 'Jump the fences, hay and ovens. Duck the carving knives.', 'Grab corn. Outrun the farmer. Reach the Wild Woods!', `Best escape: ${Math.floor(best)} m`],
        'Press Space or click to run for your life!',
      );
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The farmer waits for no turkey.'], 'Press P to keep running');
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'CAUGHT FOR DINNER!',
        [`The farmer got you at ${Math.floor(state.distanceM)} m — so close to the woods!`, `Score ${state.score}   •   Corn ${state.corn}   •   Best ${Math.floor(best)} m`],
        'Press Space or click to run again',
        PALETTE.danger,
      );
    } else if (screen === SCREEN_ESCAPED) {
      drawPanel(
        'ESCAPED!',
        [`You made it ${ESCAPE_DISTANCE_M} m to the Wild Woods!`, 'No Thanksgiving dinner for you!', `Score ${state.score}   •   Corn ${state.corn}   •   Best ${Math.floor(best)} m`],
        'Press Space or click to run again',
        PALETTE.safe,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
