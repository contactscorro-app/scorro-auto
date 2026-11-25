// Prépare une vidéo de la série « fonctionnalités » (publiée À LA MAIN par l'éditeur) : une version SANS aucun son (il ajoute le sien) + une version avec le mixage validé.
// Usage : node scripts/rendre-fonctionnalite.mjs <id>   (données : data/fonctionnalite-<id>.json)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const id = process.argv[2];
if (!id) { console.error('usage : rendre-fonctionnalite.mjs <id>'); process.exit(1); }
const d = JSON.parse(fs.readFileSync(`data/fonctionnalite-${id}.json`, 'utf8'));
const chrome = process.env.CHROME_PATH ?? (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null);
const QUALITE = ['--image-format=png', '--video-bitrate=16M', '--x264-preset=medium', '--pixel-format=yuv420p', '--color-space=bt709', '--audio-bitrate=192K', '--enforce-audio-track'];
fs.mkdirSync('out', { recursive: true }); fs.mkdirSync('a-publier/fonctionnalites', { recursive: true });
for (const [suffixe, sons] of [['SANS-SON', false], ['AVEC-MIXAGE', true]]) {
  const props = `out/props-fonc-${id}-${suffixe}.json`; fs.writeFileSync(props, JSON.stringify({ ...d, sons }));
  const sortie = `a-publier/fonctionnalites/${id}-${suffixe}.mp4`;
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', 'Fonctionnalite', sortie, `--props=${props}`, '--concurrency=1', '--log=error', ...QUALITE, ...(chrome ? [`--browser-executable=${chrome}`] : [])], { stdio: 'inherit' });
  fs.rmSync(props, { force: true });
  if (r.status !== 0) { console.error(`échec ${suffixe}`); process.exit(1); }
  console.log('✔', sortie);
}
