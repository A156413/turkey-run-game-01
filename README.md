# Gobble Dash — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/A156413/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/A156413/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A turkey escape game for make.fun's `turkey-run-game-01` bounty ($250 in USDC).

Thanksgiving is coming and the farmer is sharpening his carving knife. You are
the turkey. Run 1,200 metres down the farm track to the Wild Woods before the
farmer catches you — or end up as dinner.

## How to play

- **Space / ↑ / W / click / tap** — jump
- **↓ / S** — duck (slide under the swinging carving knives)
- **P** — pause, **M** — mute

Jump the fences, hay bales, ovens and ground knives. Duck under the swinging
carving knives. Grab corn for points and golden feathers for a short shield.
Three hits and the farmer catches you. Reach the forest gate at 1,200 m and
you escape.

## The game

- A side-scrolling endless runner on a sunset farm: parallax hills, a barn on
  the far ridge, pumpkins and corn stalks, and a low sun.
- HUD with score, distance to the woods (with a progress bar), corn count and
  three hearts; the farmer visibly gains on you after every hit.
- Title screen, play, pause, a "Caught for Dinner!" end screen and an
  "Escaped!" win screen, each with a restart.
- Original art, sounds and music, all drawn and synthesised in code — no
  assets, no libraries, no network requests. Sound effects are made with the
  Web Audio API.
- Deterministic: a seeded run (`?seed=N`) always plays the same way, and
  `?shot=start|play|escape|end` stages the four screenshot scenes.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's vendored
`vendor/makefun-game.ts`.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/main.js` — boot, the fixed-step loop, screens
- `game/src/world.js` — the runner simulation: physics, obstacles, pickups, farmer
- `game/src/render.js` — all drawing: sunset farm, turkey, farmer, oven, knives, HUD
- `game/src/config.js` — tuning numbers and palette
- `game/src/random.js` — seeded random (mulberry32)
- `game/src/audio.js` — synthesised sound effects (Web Audio)
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/shots.js` — the autopilot that stages the screenshot scenes
- `main.ts` — the entrypoint that hands the game in
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — four real renders of the game (title, play, escaped, caught)

---

<sub>Entered on [make.fun](https://make.fun/?ref=vr99z7h1&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
