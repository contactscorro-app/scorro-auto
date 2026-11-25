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
// Garde-fou : durée PRÉVUE par la composition (secondes), obligatoire hors simulation. Le fichier hébergé doit la respecter à ±1 s, sinon aucun envoi.
const dureePrevue = Number(process.argv.find((a) => a.startsWith('--duree='))?.split('=')[1]);
const defautSimule = process.argv.find((a) => a.startsWith('--simulation-defaut='))?.split('=')[1];
const RESEAUX = (process.argv.find((a) => a.startsWith('--reseaux='))?.split('=')[1] ?? 'instagram,youtube,tiktok').split(',');
const CANAL = { instagram: 'BUFFER_CHANNEL_INSTAGRAM', youtube: 'BUFFER_CHANNEL_YOUTUBE', tiktok: 'BUFFER_CHANNEL_TIKTOK', 'instagram-story': 'BUFFER_CHANNEL_INSTAGRAM' };
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
  // Story Instagram (developers.buffer.com, PostType « story ») : publication automatique seulement sans texte, lien, sticker ni musique.
  'instagram-story': { instagram: { type: 'story', shouldShareToFeed: false } },
};
const TEXTE = { instagram: legende, youtube: legendeYoutube, tiktok: legendeTikTok, 'instagram-story': '' };
// shareNow : la publication part tout de suite, l'horaire est décidé par auto.mjs.
// Couverture (décision du 22/11, schéma Buffer vérifié le 23/11) : l'image 0 EST la vignette. Instagram et TikTok : thumbnailOffset 0 ms.
// YouTube : Buffer ne permet rien (l'image 0 fait foi). thumbnailUrl n'est JAMAIS envoyé (refusé par l'API).
const entree = (reseau, channelId, url, couv) => ({ text: TEXTE[reseau], channelId, schedulingType: 'automatic', ...(quand && Date.parse(quand) - Date.now() > 3 * 60000 ? { mode: 'customScheduled', dueAt: new Date(Date.parse(quand)).toISOString() } : { mode: 'shareNow' }), metadata: META[reseau], assets: [{ video: { url, ...(['instagram', 'tiktok'].includes(reseau) ? { metadata: { thumbnailOffset: 0 } } : {}) } }] });
if (simulation) {
  console.log(JSON.stringify({ mutation: MUTATION, ...Object.fromEntries(RESEAUX.map((r) => [r, entree(r, `<${CANAL[r]}>`, `<url publique>/${nom}`)])) }, null, 1));
  process.exit(0);
}
// Verrous anti-doublon (scripts/verrou.mjs) : un seul publieur (publieur.json), SCORRO_ENVOIS, puis file Buffer. Sur le Mac : inactifs tant que publieur.verifierSurMac n'est pas à true.
const { controleEnvoi, verrouApplique, dejaDansBuffer } = await import('./verrou.mjs');
{
  const v = controleEnvoi();
  if (!v.ok) { console.log(`VERROU : ${v.raison} ; rien d'envoyé`); process.exit(4); }
}
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => { const v = process.env[k] ?? env[k]; if (!v) throw new Error(`${k} manquant dans .env`); return v; };
// Buffer veut une URL publique directe : la vidéo validée, et elle seule, part sur la publication « videos » du dépôt public.
const depot = V('VIDEOS_REPO');
// Âge de la vidéo en ligne (dernière mise à jour de l'asset sur la publication « videos »). null si absente.
const assetHeberge = () => {
  const r = spawnSync('gh', ['api', `repos/${depot}/releases/tags/videos`, '--jq', `.assets[]|select(.name==${JSON.stringify(path.basename(fichier))})|[.size,.updated_at,.state]|@tsv`], { encoding: 'utf8' });
  const [taille, maj, etat] = (r.stdout ?? '').trim().split('\t');
  return r.status === 0 && maj ? { taille: Number(taille), maj: Date.parse(maj), etat } : null;
};
if (!urlDeja) {
  // Pas de nouvel envoi si la même vidéo (même taille) est déjà en ligne : le délai de 5 min ne doit pas repartir de zéro à chaque passe.
  const deja = fs.existsSync(fichier) ? assetHeberge() : null;
  if (!(deja && deja.etat === 'uploaded' && deja.taille === fs.statSync(fichier).size)) {
    const up = spawnSync('gh', ['release', 'upload', 'videos', fichier, '--repo', depot, '--clobber'], { encoding: 'utf8' });
    if (up.status !== 0) throw new Error(`envoi de la vidéo : ${(up.stderr ?? '').slice(0, 200)}`);
  }
}
// GARDE-FOU (délai) : au moins 5 min entre la mise en ligne et la programmation dans Buffer (cache GitHub : ancienne version ou rien pendant quelques minutes).
if (!simulation) {
  const DELAI = Number(process.env.SCORRO_TEST_DELAI_MS ?? 5 * 60000), h = assetHeberge(); // SCORRO_TEST_DELAI_MS : uniquement pour tester ce garde-fou
  if (!h || h.etat !== 'uploaded') throw new Error('GARDE-FOU : vidéo absente de la publication « videos » ou pas encore terminée');
  const age = Date.now() - h.maj;
  if (age < DELAI) { console.log(`ATTENTE-HEBERGEMENT : en ligne depuis ${Math.round(age / 1000)} s, minimum 300 s avant Buffer`); process.exit(3); }
}
const url = urlDeja ?? `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(nom)}`;
// GARDE-FOU (avant tout envoi à Buffer) : fichier hébergé complet, lisible, de la durée prévue (±1 s). Sinon : rien n'est envoyé.
{
  const { controlerHebergement } = await import('./controle-video.mjs');
  const tailleEnvoyee = !urlDeja && fs.existsSync(fichier) ? fs.statSync(fichier).size : undefined;
  const pbs = await controlerHebergement({ url, dureePrevue, taille: tailleEnvoyee, defaut: defautSimule });
  if (pbs.length) { console.log(`GARDE-FOU : ${pbs.join(' ; ')}`); throw new Error(`GARDE-FOU : ${pbs.join(' ; ')}`); }
  console.log('GARDE-FOU : OK (hébergé complet, lisible, durée conforme)');
}
// Test du garde-fou seul (avec --url) : on s'arrête ici, rien n'est envoyé à Buffer.
if (process.argv.includes('--controle-seul')) process.exit(0);
const couv = null; // plus d'image de couverture envoyée (voir plus haut)
for (const reseau of RESEAUX) {
  const cle = CANAL[reseau];
  if (faites[nom]?.[reseau]) { console.log(`DEJA ${reseau} ${faites[nom][reseau]} : ${nom} est déjà dans ${REG}, rien d'envoyé`); continue; }
  if (verrouApplique()) {
    // Verrou 3 : la vidéo est-elle déjà programmée ou envoyée sur ce canal (par l'autre côté) ? Lecture impossible = aucun envoi.
    let idBuffer;
    try { idBuffer = await dejaDansBuffer({ q: async (query, variables) => (await (await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()), canal: V(cle), nom }); }
    catch (e) { console.log(`VERROU : ${e.message} ; rien d'envoyé`); process.exit(4); }
    if (idBuffer) { faites[nom] = { ...faites[nom], [reseau]: idBuffer }; fs.mkdirSync('etat', { recursive: true }); fs.writeFileSync(REG, JSON.stringify(faites, null, 1)); console.log(`DEJA ${reseau} ${idBuffer} : ${nom} est déjà dans la file Buffer, rien d'envoyé`); continue; }
  }
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
