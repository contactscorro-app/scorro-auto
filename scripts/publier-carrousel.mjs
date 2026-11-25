// Usage : node scripts/publier-carrousel.mjs <dossier brouillons/carrousel/AAAA-MM-JJ-theme> --reseaux=instagram,tiktok --quand=<ISO> [--brouillon]
// Carrousel (images) via Buffer : Instagram (post à plusieurs images, publication automatique) et TikTok (mode photo).
// --brouillon : enregistré en BROUILLON dans Buffer (saveToDraft), jamais publié — sert de test.
// Les JPG sont hébergés sur la publication « videos » du dépôt public (comme les vidéos) ; le registre est etat/carrousels.json (protège les images du ménage).
// Autorisation de l'éditeur (24/11, Q29 a) : ce format seulement.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const dossier = process.argv[2];
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const RESEAUX = (arg('reseaux') ?? 'instagram,tiktok').split(',');
const quand = arg('quand'), brouillon = process.argv.includes('--brouillon');
if (!dossier || !fs.existsSync(dossier)) throw new Error('dossier introuvable');
if (!quand && !brouillon) throw new Error('--quand obligatoire (sauf --brouillon)');
// Verrou anti-doublon (scripts/verrou.mjs) : seulement pour un vrai post (un brouillon n'est jamais publié). Inactif sur le Mac tant que publieur.verifierSurMac n'est pas à true.
if (!brouillon) { const { controleEnvoi } = await import('./verrou.mjs'); const v = controleEnvoi(); if (!v.ok) { console.log(`VERROU : ${v.raison} ; rien d'envoyé`); process.exit(4); } }
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => { const v = process.env[k] ?? env[k]; if (!v) throw new Error(`${k} manquant`); return v; };
const depot = V('VIDEOS_REPO');
const CANAL = { instagram: V('BUFFER_CHANNEL_INSTAGRAM'), tiktok: V('BUFFER_CHANNEL_TIKTOK') };
const nom = path.basename(dossier);
const texte = fs.readFileSync(`${dossier}/legende.txt`, 'utf8').trim();
const titreTikTok = texte.split('\n')[0].slice(0, 90);
const REG = 'etat/carrousels.json';
const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : {};
const q = async (query, variables) => (await (await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const MUTATION = 'mutation P($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }';
for (const reseau of RESEAUX) {
  const cle = brouillon ? `${nom}-TEST` : nom;
  if (reg[cle]?.[reseau]) { console.log(`DEJA ${reseau} ${reg[cle][reseau]}`); continue; }
  const imgs = fs.readdirSync(dossier).filter((f) => f.startsWith(`${reseau}-0`) && f.endsWith('.jpg')).sort();
  if (imgs.length < 2) throw new Error(`${reseau} : moins de 2 images`);
  // 1. Hébergement, puis contrôle : chaque URL répond 200 avec la bonne taille.
  const urls = [];
  for (const f of imgs) {
    const nomH = `carrousel-${nom}-${f}`;
    const tmp = `out/${nomH}`; fs.mkdirSync('out', { recursive: true }); fs.copyFileSync(`${dossier}/${f}`, tmp);
    const up = spawnSync('gh', ['release', 'upload', 'videos', tmp, '--repo', depot, '--clobber'], { encoding: 'utf8' });
    if (up.status !== 0) throw new Error(`hébergement ${f} : ${(up.stderr ?? '').slice(0, 200)}`);
    urls.push({ url: `https://github.com/${depot}/releases/download/videos/${encodeURIComponent(nomH)}`, taille: fs.statSync(tmp).size, nomH });
  }
  for (const u of urls) {
    let ok = false;
    for (let k = 0; k < 20 && !ok; k++) { const r = await fetch(u.url, { method: 'GET', redirect: 'follow' }).catch(() => null); const b = r?.ok ? await r.arrayBuffer() : null; ok = !!b && b.byteLength === u.taille; if (!ok) await new Promise((res) => setTimeout(res, 15000)); }
    if (!ok) throw new Error(`GARDE-FOU : image hébergée illisible ou incomplète : ${u.nomH}`);
  }
  // 2. Buffer : un seul post, images dans l'ordre.
  const input = {
    text: texte, channelId: CANAL[reseau], schedulingType: 'automatic',
    ...(brouillon ? { saveToDraft: true, mode: 'addToQueue' } : { mode: 'customScheduled', dueAt: new Date(Date.parse(quand)).toISOString() }),
    metadata: reseau === 'instagram' ? { instagram: { type: 'post', shouldShareToFeed: true } } : { tiktok: { title: titreTikTok } },
    assets: urls.map((u) => ({ image: { url: u.url } })),
  };
  const r = await q(MUTATION, { input });
  const post = r?.data?.createPost?.post;
  if (!post) throw new Error(`${reseau} : ${r?.data?.createPost?.message ?? r?.errors?.[0]?.message ?? JSON.stringify(r).slice(0, 200)}`);
  reg[cle] = { ...reg[cle], [reseau]: post.id, fichiers: [...new Set([...(reg[cle]?.fichiers ?? []), ...urls.map((u) => u.nomH)])], dueAt: quand ?? null };
  fs.writeFileSync(REG, JSON.stringify(reg, null, 1));
  console.log(`${brouillon ? 'BROUILLON' : 'PROGRAMME'} ${reseau} ${post.id} statut=${post.status} dueAt=${post.dueAt ?? '-'} images=${urls.length}`);
}
