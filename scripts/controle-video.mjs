// Garde-fou avant CHAQUE envoi à Buffer : le fichier hébergé est-il complet, lisible, et de la durée prévue (±1 s) ?
// Usage : node scripts/controle-video.mjs <url> --duree=<secondes prévues> [--taille=<octets>] [--simulation-defaut=tronque|duree|absent]
// Code de sortie 0 = OK ; 1 = REFUSÉ (message « GARDE-FOU : … »).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
export const TOLERANCE = 1; // secondes
const lire = (txt, re) => txt.match(re)?.[1];
const secondes = (hms) => { const [h, m, s] = hms.split(':').map(Number); return h * 3600 + m * 60 + s; };
const ffmpeg = (args) => { const r = spawnSync('npx', ['remotion', 'ffmpeg', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); return `${r.stdout ?? ''}${r.stderr ?? ''}`; };
// Durée (s) d'un fichier local, lue par ffmpeg ; NaN si illisible.
export const dureeFichier = (f) => { const d = lire(ffmpeg(['-i', f]), /Duration: (\d+:\d+:\d+(?:\.\d+)?)/); return d ? secondes(d) : NaN; };
export async function controlerHebergement({ url, dureePrevue, taille, defaut }) {
  if (!Number.isFinite(dureePrevue) || dureePrevue <= 0) return ['durée prévue inconnue : envoi refusé par prudence'];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'controle-'));
  const f = path.join(dir, 'v.mp4');
  try {
    // 1. Le fichier est servi en entier (statut 200, taille annoncée = taille lue = taille du fichier envoyé).
    const r = await fetch(url, { redirect: 'follow' });
    if (defaut === 'absent' || !r.ok) return [`fichier hébergé introuvable (HTTP ${defaut === 'absent' ? 404 : r.status})`];
    let buf = Buffer.from(await r.arrayBuffer());
    if (defaut === 'tronque') buf = buf.subarray(0, Math.floor(buf.length * 0.3));
    const annonce = Number(r.headers.get('content-length') ?? NaN);
    if (Number.isFinite(annonce) && annonce !== buf.length && defaut !== 'tronque') return [`fichier hébergé tronqué : ${buf.length} octets lus sur ${annonce} annoncés`];
    if (taille && buf.length !== taille) return [`taille hébergée ${buf.length} ≠ taille envoyée ${taille} (fichier tronqué ou autre)`];
    fs.writeFileSync(f, buf);
    // 2. Il est lisible : conteneur MP4 valide, image + son, tout se décode jusqu'au bout.
    const info = ffmpeg(['-i', f]);
    const dur = lire(info, /Duration: (\d+:\d+:\d+(?:\.\d+)?)/);
    if (!dur || !/Video: h264/.test(info)) return ['fichier hébergé illisible (pas de vidéo H.264 lisible)'];
    if (!/Audio: aac/.test(info)) return ['fichier hébergé sans piste audio'];
    const dv = secondes(dur);
    const v = ffmpeg(['-v', 'error', '-i', f, '-map', '0:v', '-c', 'copy', '-f', 'null', '-']);
    const tv = lire(ffmpeg(['-i', f, '-map', '0:v', '-c', 'copy', '-f', 'null', '-']), /time=(\d+:\d+:\d+(?:\.\d+)?)/);
    const ta = lire(ffmpeg(['-i', f, '-map', '0:a', '-c', 'copy', '-f', 'null', '-']), /time=(\d+:\d+:\d+(?:\.\d+)?)/);
    if (/error|invalid|corrupt|truncat/i.test(v)) return [`fichier hébergé corrompu : ${v.trim().split('\n')[0].slice(0, 160)}`];
    if (!tv || !ta) return ['fichier hébergé : lecture de la piste vidéo ou audio impossible'];
    // 3. La durée correspond à la durée prévue, à ±1 s : durée annoncée, durée réellement lue (image et son).
    const mesures = { annoncee: dv, image: secondes(tv), son: secondes(ta) };
    if (defaut === 'duree') mesures.image = 2.9;
    const hors = Object.entries(mesures).filter(([, d]) => Math.abs(d - dureePrevue) > TOLERANCE).map(([k, d]) => `${k} ${d.toFixed(2)} s`);
    if (hors.length) return [`durée hors tolérance : prévue ${dureePrevue.toFixed(2)} s (±${TOLERANCE}), mesurée ${hors.join(', ')}`];
    return [];
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
  const url = process.argv[2];
  const pbs = await controlerHebergement({ url, dureePrevue: Number(arg('duree')), taille: arg('taille') ? Number(arg('taille')) : undefined, defaut: arg('simulation-defaut') });
  if (pbs.length) { console.log(`GARDE-FOU : ${pbs.join(' ; ')}`); process.exit(1); }
  console.log('GARDE-FOU : OK (fichier hébergé complet, lisible, durée conforme)');
}
