// Serveur seulement (SCORRO_CI=1) : récupère les médias qui ne doivent PAS être dans le dépôt public (sons Mixkit : redistribution interdite ;
// vidéos « fonctionnalités » déjà rendues ; carrousels préparés à la main). Ils sont lus dans un dépôt PRIVÉ :
//   MEDIAS_REPO (dépôt scorro-medias si l'éditeur dit oui à Q42), sinon ETAT_REPO (dépôt privé scorro-etat, qui existe déjà).
// Publications (releases) attendues dans ce dépôt :
//   « sons »            : sons-fluide-mixkit.tgz (les 4 fichiers Mixkit de public/sons-fluide/foot/)
//   « fonctionnalites » : NN-<id>.mp4, NN-<id>.duree, NN-<id>.vignette.png (copie de brouillons/fonctionnalites-v3/)
//   « carrousels »      : <AAAA-MM-JJ>-<theme>.tgz (contenu de brouillons/carrousel/<AAAA-MM-JJ>-<theme>/)
// Usage : node scripts/preparer-medias.mjs sons | fonc <id> | carrousel <AAAA-MM-JJ-theme>
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MIXKIT_FLUIDE = ['foot/but-cri-1.mp3', 'foot/but-cri-2.mp3', 'foot/stade-ambiance-1.mp3', 'foot/stade-ambiance-2.mp3'];
export const depotMedias = (env = process.env) => env.MEDIAS_REPO || env.ETAT_REPO || null;
const lancer = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }); return { ok: r.status === 0, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }; };
const court = (s) => s.split('\n').pop().slice(0, 200);

export function sonsMixkit({ dir = 'public/sons-fluide', env = process.env, run = lancer } = {}) {
  const manquants = () => MIXKIT_FLUIDE.filter((f) => !fs.existsSync(`${dir}/${f}`));
  if (!manquants().length) return { ok: true, detail: 'déjà là' };
  const depot = depotMedias(env);
  if (!depot) return { ok: false, detail: 'MEDIAS_REPO et ETAT_REPO absents' };
  fs.mkdirSync('out/medias', { recursive: true });
  const d = run('gh', ['release', 'download', 'sons', '--repo', depot, '--pattern', 'sons-fluide-mixkit.tgz', '--dir', 'out/medias', '--clobber']);
  if (!d.ok) return { ok: false, detail: `téléchargement : ${court(d.sortie)}` };
  fs.mkdirSync(dir, { recursive: true });
  const x = run('tar', ['-xzf', 'out/medias/sons-fluide-mixkit.tgz', '-C', dir]);
  if (!x.ok) return { ok: false, detail: `décompression : ${court(x.sortie)}` };
  const reste = manquants();
  return reste.length ? { ok: false, detail: `toujours absents : ${reste.join(', ')}` } : { ok: true, detail: `récupérés depuis ${depot}` };
}

export function fonctionnalite(fid, { dir = 'brouillons/fonctionnalites-v3', env = process.env, run = lancer } = {}) {
  if (!/^[a-z0-9-]+$/.test(fid ?? '')) return { ok: false, detail: `identifiant invalide : ${fid}` };
  const depot = depotMedias(env);
  if (!depot) return { ok: false, detail: 'MEDIAS_REPO et ETAT_REPO absents' };
  fs.mkdirSync(dir, { recursive: true });
  const d = run('gh', ['release', 'download', 'fonctionnalites', '--repo', depot, '--pattern', `*-${fid}.mp4`, '--pattern', `*-${fid}.duree`, '--pattern', `*-${fid}.vignette.png`, '--dir', dir, '--clobber']);
  return d.ok ? { ok: true, detail: `récupérée depuis ${depot}` } : { ok: false, detail: court(d.sortie) };
}

export function carrousel(nom, { dir = 'brouillons/carrousel', env = process.env, run = lancer } = {}) {
  if (!/^\d{4}-\d\d-\d\d-[a-z0-9-]+$/.test(nom ?? '')) return { ok: false, detail: `nom invalide : ${nom}` };
  const depot = depotMedias(env);
  if (!depot) return { ok: false, detail: 'MEDIAS_REPO et ETAT_REPO absents' };
  fs.mkdirSync('out/medias', { recursive: true });
  const d = run('gh', ['release', 'download', 'carrousels', '--repo', depot, '--pattern', `${nom}.tgz`, '--dir', 'out/medias', '--clobber']);
  if (!d.ok) return { ok: false, detail: court(d.sortie) };
  fs.mkdirSync(`${dir}/${nom}`, { recursive: true });
  const x = run('tar', ['-xzf', `out/medias/${nom}.tgz`, '-C', `${dir}/${nom}`]);
  return x.ok && fs.existsSync(`${dir}/${nom}/legende.txt`) ? { ok: true, detail: `récupéré depuis ${depot}` } : { ok: false, detail: `archive incomplète (${court(x.sortie)})` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [quoi, x] = process.argv.slice(2);
  const r = quoi === 'sons' ? sonsMixkit() : quoi === 'fonc' ? fonctionnalite(x) : quoi === 'carrousel' ? carrousel(x) : { ok: false, detail: 'usage : sons | fonc <id> | carrousel <AAAA-MM-JJ-theme>' };
  console.log(`${r.ok ? 'OK' : 'ÉCHEC'} médias ${quoi}${x ? ` ${x}` : ''} : ${r.detail}`);
  process.exit(r.ok ? 0 : 1);
}
