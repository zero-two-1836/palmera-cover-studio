// Palmera Cover Studio — the hand-in program for gta6-cover-art-01.
//
// The studio itself is the static site under app/: open app/index.html
// in a desktop browser and it runs offline, with no build step. This
// program is only the delivery: it copies app/ and screenshots/ into
// the output directory and writes dossier.json there using the vendored
// make.fun library, byte for byte the way the scorer rebuilds it, so a
// dossier that would fail the gate fails here first. Node 22, standard
// library only, no network. It runs the same way twice and writes the
// same bytes both times.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's caps for this bounty, passed to buildDossier so an entry
// the scorer would refuse is refused here first.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }

  // Refuse to hand in a shell: the page and at least one screenshot
  // have to reach the output before the dossier means anything.
  if (!existsSync(join(outputDir, 'app', 'index.html'))) {
    throw new Error('hand-in aborted: app/index.html missing from the output');
  }
  if (!existsSync(join(outputDir, 'screenshots'))) {
    throw new Error('hand-in aborted: screenshots/ missing from the output');
  }

  const dossier = buildDossier(outputDir, GATE_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`Palmera Cover Studio handed in: dossier.json (${dossier.length} bytes) written to ${outputDir}`);
}

handIn();
