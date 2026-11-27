// Gobble Dash — The Great Turkey Escape: every tuning number and colour in one
// place. The playfield is a fixed 1280x720 logical area; the renderer scales it
// to fit the window, so no rule below depends on the screen size. The turkey
// runs from left to right across a farm at sunset; the farmer chases from
// behind and the forest gate 1200 m ahead is the escape.

export const FIELD = { width: 1280, height: 720, groundY: 600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of ground covered per metre of escape distance. */
export const PX_PER_M = 50;

/** Reach this distance to escape into the wild woods and win. */
export const ESCAPE_DISTANCE_M = 1200;

export const PLAYER = {
  x: 200,
  width: 62,
  height: 58,
  duckHeight: 34,
  jumpVelocity: 1020,
  gravity: 2700,
  /** Seconds of mercy after a hit, while the turkey blinks. */
  invulnerable: 1.4,
};

export const LIVES = 3;

/** Ground speed in px/s: starts here, grows with distance, caps here. */
export const SPEED = { start: 330, perMetre: 0.22, max: 640 };

/** How far ahead of the player new obstacles may spawn, in pixels. */
export const SPAWN_AHEAD = 1500;

export const OBSTACLE = {
  fence: { width: 46, height: 62 },
  hay: { width: 78, height: 56 },
  oven: { width: 96, height: 76 },
  knife: { width: 34, height: 74 },
  /** The swinging carving knife hangs from a branch; duck under it. */
  swing: { width: 30, height: 96, rope: 150 },
};

export const PICKUP = {
  corn: { size: 26, points: 10 },
  feather: { size: 30, points: 50, shieldSeconds: 5 },
};

export const SCORE = { perMetre: 1, corn: 10, feather: 50 };

/** How many obstacles and pickups can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = 48;

export const PALETTE = {
  backdrop: '#2a1638',
  skyTop: '#3b1d5a',
  skyMid: '#c94b6d',
  skyLow: '#f2823c',
  sun: '#ffd66b',
  sunCore: '#fff3b0',
  hillFar: '#5a2d63',
  hillNear: '#3f2148',
  barn: '#33182e',
  barnRoof: '#241120',
  ground: '#7a4a22',
  groundDark: '#5d3418',
  grass: '#c98f2e',
  grassDark: '#a8741f',
  fence: '#8a5a30',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d22',
  tail: ['#b4552d', '#d2691e', '#e8a33c', '#c94b6d', '#7a4a8a'],
  head: '#e8e0d0',
  beak: '#e8a33c',
  wattle: '#e5534b',
  snood: '#d63c30',
  leg: '#e8a33c',
  farmerShirt: '#c0392b',
  farmerOveralls: '#2e5fa3',
  farmerHat: '#d9b36c',
  farmerSkin: '#e8b88a',
  farmerBeard: '#5d4030',
  pitchfork: '#b9c0c8',
  oven: '#26221f',
  ovenGlow: '#ff7b24',
  ovenFire: '#ffc93c',
  knifeBlade: '#dfe5ec',
  knifeEdge: '#ffffff',
  knifeHandle: '#6b4423',
  corn: '#f2c94c',
  cornHusk: '#7fae4c',
  feather: '#ffd66b',
  panel: '#1e0c1e',
  panelEdge: '#e8a33c',
  text: '#fff6e8',
  muted: '#e8c9a0',
  danger: '#ff5340',
  safe: '#7fce62',
  hudBg: 'rgba(24, 10, 26, 0.55)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best escape distance is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
