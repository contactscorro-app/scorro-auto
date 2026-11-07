// Usage : node scripts/publier-buffer.mjs <a-publier/.../video.mp4> [--reseaux=instagram,youtube,tiktok] [--simulation]
// Instagram + YouTube + TikTok via Buffer, après validation de l'éditeur. 🔴 Fermé tant que data/publication.json ne dit pas sportmonksOk ET appEnLigne.
// --simulation : affiche ce qui serait envoyé, sans réseau ni clé. 
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const fichier = process.argv[2];
// Mode serveur (GitHub Actions) : la vidéo est déjà en ligne (--url) et la légende vient d'un fichier (--legende-fichier), car le MP4 local n'existe plus d'une passe à l'autre.
// --quand=<ISO> : programmation Buffer à une heure précise (la vidéo reste chez Buffer, le Mac peut être éteint). Sans cela : envoi immédiat.
const quand = process.argv.find((a) => a.startsWith('--quand='))?.split('=').slice(1).join('=');
const urlDeja = process.argv.find((a) => a.startsWith('--url='))?.split('=').slice(1).join('=');
const legendeFichier = process.argv.find((a) => a.startsWith('--legende-fichier='))?.split('=').slice(1).join('=');
const simulation = process.argv.includes('--simulation');
const RESEAUX = (process.argv.find((a) => a.startsWith('--reseaux='))?.split('=')[1] ?? 'instagram,youtube,tiktok').split(',');
const CANAL = { instagram: 'BUFFER_CHANNEL_INSTAGRAM', youtube: 'BUFFER_CHANNEL_YOUTUBE', tiktok: 'BUFFER_CHANNEL_TIKTOK' };
if (!fichier || (!urlDeja && !fs.existsSync(fichier))) throw new Error('vidéo introuvable');
const txt = legendeFichier ?? fichier.replace(/\.mp4$/, '.txt');
if (!fs.existsSync(txt)) throw new Error('légende introuvable');
const pub = JSON.parse(fs.readFileSync('data/publication.json', 'utf8'));
if (!simulation) {
  if (pub.sportmonksOk !== true) throw new Error('fermé : pas de réponse écrite de Sportmonks');
  if (pub.appEnLigne !== true) throw new Error("fermé : l'app n'est pas en ligne");
  if (/TEST-/.test(fichier)) throw new Error('une vidéo TEST ne se publie pas');
}
const REG = 'etat/publiees.json';
const faites = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : {};
const nom = path.basename(fichier);
const legende = fs.readFileSync(txt, 'utf8').replace(/^⚠️ TEST.*\n\n/, '').trim();
// Instagram/TikTok : « Lien dans la bio 👆 » (lien non cliquable). YouTube : le lien App Store direct.
const marque = JSON.parse(fs.readFileSync('data/marque.json', 'utf8'));
const legendeTikTok = legende;
const legendeYoutube = legende.replace('Lien dans la bio 👆', `Télécharge Scorro : ${marque.appStore}`).replace(/lien dans la bio\.?/i, `lien : ${marque.appStore}`);
const MUTATION = `mutation P($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`;
const titreYoutube = (legende.split('\n')[0] ?? 'Scorro').replace(' Lien dans la bio 👆', '').slice(0, 95);
const META = {
  instagram: { instagram: { type: 'reel', shouldShareToFeed: true } },
  youtube: { youtube: { title: titreYoutube, privacy: 'public', categoryId: '17', madeForKids: false } },
  tiktok: { tiktok: { title: titreYoutube.slice(0, 90) } },
};
const TEXTE = { instagram: legende, youtube: legendeYoutube, tiktok: legendeTikTok };
// shareNow : la publication part tout de suite, l'horaire est décidé par auto.mjs.
// Couverture : si <video>.png existe, Buffer reçoit son URL (thumbnailUrl) et l'image 0 comme instant de repli (thumbnailOffset).
const entree = (reseau, channelId, url, couv) => ({ text: TEXTE[reseau], channelId, schedulingType: 'automatic', ...(quand && Date.parse(quand) - Date.now() > 3 * 60000 ? { mode: 'customScheduled', dueAt: new Date(Date.parse(quand)).toISOString() } : { mode: 'shareNow' }), metadata: META[reseau], assets: [{ video: { url, ...(couv ? { thumbnailUrl: couv, metadata: { thumbnailOffset: 0 } } : {}) } }] });
if (simulation) {
  console.log(JSON.stringify({ mutation: MUTATION, ...Object.fromEntries(RESEAUX.map((r) => [r, entree(r, `<${CANAL[r]}>`, `<url publique>/${nom}`)])) }, null, 1));
  process.exit(0);
}
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => { const v = process.env[k] ?? env[k]; if (!v) throw new Error(`${k} manquant dans .env`); return v; };
// Buffer veut une URL publique directe : la vidéo validée, et elle seule, part sur la publication « videos » du dépôt public.
const depot = V('VIDEOS_REPO');
if (!urlDeja) {
  const up = spawnSync('gh', ['release', 'upload', 'videos', fichier, '--repo', depot, '--clobber'], { encoding: 'utf8' });
  if (up.status !== 0) throw new Error(`envoi de la vidéo : ${(up.stderr ?? '').slice(0, 200)}`);
}
const url = urlDeja ?? `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(nom)}`;
// Couverture : image <video>.png si elle existe (data/auto-config.json : couvertures:true), envoyée à Buffer comme thumbnailUrl.
let couv = null;
const png = fichier.replace(/\.mp4$/, '.png');
if (!urlDeja && fs.existsSync(png)) {
  const upc = spawnSync('gh', ['release', 'upload', 'videos', png, '--repo', depot, '--clobber'], { encoding: 'utf8' });
  if (upc.status === 0) couv = `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(path.basename(png))}`;
}
for (const reseau of RESEAUX) {
  const cle = CANAL[reseau];
  if (faites[nom]?.[reseau]) continue;
  const r = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: MUTATION, variables: { input: entree(reseau, V(cle), url, couv) } }) });
  const j = await r.json().catch(() => ({}));
  const id = j?.data?.createPost?.post?.id;
  if (!id) throw new Error(`${reseau} : ${j?.data?.createPost?.message ?? j?.errors?.[0]?.message ?? r.status}`);
  faites[nom] = { ...faites[nom], [reseau]: id };
  fs.mkdirSync('etat', { recursive: true });
  fs.writeFileSync(REG, JSON.stringify(faites, null, 1));
  console.log(`✅ ${reseau} : dans la file Buffer`);
  if (quand) {
    // Vérification : Buffer garde-t-il la vidéo de son côté ? (statut, heure, source du média)
    const v = await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `{ post(input:{id:"${id}"}) { status dueAt assets { source thumbnail } } }` }) }).then((x) => x.json()).catch(() => ({}));
    console.log(`PROGRAMME ${reseau} ${id} ${JSON.stringify(v?.data?.post ?? v?.errors?.[0]?.message ?? null)}`);
  }
}
