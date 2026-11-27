// Gobble Dash — The Great Turkey Escape: the entrypoint (Node 22, standard
// library only). The game itself is plain static files under game/ —
// game/index.html and its ES modules, no library and no network request — and
// this program hands it in: it copies game/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierPath = join(out, 'dossier.json');
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossier);

// A short local sanity report: the dossier must stay under the 1.5 MiB gate,
// and the screenshots under 256 KiB each (buildDossier already enforces the
// per-file cap, this just makes a bad run loud instead of silent).
const shotDir = join(out, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir) : [];
for (const shot of shots) {
  const bytes = statSync(join(shotDir, shot)).size;
  if (bytes > 262144) throw new Error(`screenshot ${shot} is ${bytes} bytes, over the 256 KiB cap`);
}
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);

// The platform collects /output as another user than the one this program
// runs as, so every output must be readable by everyone: files 0644,
// folders 0755, whatever the umask here is. The output directory itself is
// NOT ours to chmod: the grader mounts it owned by root while this program
// runs as user 65534, so chmod on it throws EPERM and fails the run (exit 1).
// Only the entries we created inside it get chmodded.
function makeWorldReadable(dir, isRoot = false) {
  if (!isRoot) chmodSync(dir, 0o755);
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) makeWorldReadable(path);
    else chmodSync(path, 0o644);
  }
}
makeWorldReadable(out, true);
console.log(`wrote ${dossierPath} (${dossierBytes} bytes) with ${shots.length} screenshots`);
