// Série « fonctionnalités » (publiée À LA MAIN) : dépose la vidéo SANS SON en BROUILLON dans Buffer (jamais publiée, jamais programmée).
// Usage : node scripts/brouillon-buffer.mjs <id> [--simulation] [--reseaux=instagram,youtube,tiktok]
// Les légendes viennent de data/legendes-fonctionnalites.json. Rien n'est écrit dans etat/ : le pipeline automatique ne voit pas ce script.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const id = process.argv[2];
const simulation = process.argv.includes('--simulation');
const RESEAUX = (process.argv.find((a) => a.startsWith('--reseaux='))?.split('=')[1] ?? 'instagram,youtube,tiktok').split(',');
const CANAL = { instagram: 'BUFFER_CHANNEL_INSTAGRAM', youtube: 'BUFFER_CHANNEL_YOUTUBE', tiktok: 'BUFFER_CHANNEL_TIKTOK' };
const L = JSON.parse(fs.readFileSync('data/legendes-fonctionnalites.json', 'utf8'))[id];
if (!L) throw new Error(`pas de légendes pour ${id}`);
const fichier = `a-publier/fonctionnalites/${id}-SANS-SON.mp4`;
if (!fs.existsSync(fichier)) throw new Error('vidéo sans son introuvable');
const MUTATION = `mutation P($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`;
const META = {
  instagram: { instagram: { type: 'reel', shouldShareToFeed: true } },
  youtube: { youtube: { title: L.titreYoutube.slice(0, 95), privacy: 'private', categoryId: '17', madeForKids: false } },
  tiktok: { tiktok: { title: (L.titreYoutube ?? id).replace(/ #shorts/, '').slice(0, 90) } },
};
const entree = (r, channelId, url) => ({ text: L[r], channelId, schedulingType: 'notification', mode: 'addToQueue', saveToDraft: true, metadata: META[r], assets: [{ video: { url } }] });
const nom = `brouillon-${id}-SANS-SON.mp4`;
if (simulation) { console.log(JSON.stringify(Object.fromEntries(RESEAUX.map((r) => [r, entree(r, `<${CANAL[r]}>`, `<url publique>/${nom}`)])), null, 1)); process.exit(0); }
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => { const v = process.env[k] ?? env[k]; if (!v) throw new Error(`${k} manquant`); return v; };
const depot = V('VIDEOS_REPO');
fs.mkdirSync('out', { recursive: true }); fs.copyFileSync(fichier, `out/${nom}`);
const up = spawnSync('gh', ['release', 'upload', 'videos', `out/${nom}`, '--repo', depot, '--clobber'], { encoding: 'utf8' });
if (up.status !== 0) throw new Error(`envoi de la vidéo : ${(up.stderr ?? '').slice(0, 200)}`);
const url = `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(nom)}`;
for (const r of RESEAUX) {
  const rep = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: MUTATION, variables: { input: entree(r, V(CANAL[r]), url) } }) });
  const j = await rep.json().catch(() => ({}));
  const pid = j?.data?.createPost?.post?.id;
  console.log(pid ? `BROUILLON ${r} ${pid}` : `ÉCHEC ${r} : ${j?.data?.createPost?.message ?? j?.errors?.[0]?.message ?? rep.status}`);
}
