// Usage : node scripts/rapport-semaine.mjs [--fin=ISO] [--sortie=chemin.md]
// Rapport de la semaine (lundi 00 h Paris → maintenant) : chiffres renvoyés par Buffer pour chaque publication et par réseau. Aucun chiffre inventé : « non disponible » si Buffer ne le fournit pas.
import fs from 'node:fs';
import { jourParis, heureParis, hhmmParis, parisA, HEURE } from './decider.mjs';
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => process.env[k] ?? env[k];
const q = async (query, variables) => (await (await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const RESEAUX = { instagram: V('BUFFER_CHANNEL_INSTAGRAM'), youtube: V('BUFFER_CHANNEL_YOUTUBE'), tiktok: V('BUFFER_CHANNEL_TIKTOK') };
const NA = 'non disponible';
const fin = arg('fin') ? Date.parse(arg('fin')) : Date.now();
const jFin = jourParis(fin);
const dow = (new Date(`${jFin}T12:00:00Z`).getUTCDay() + 6) % 7;
const lundi = jourParis(Date.parse(`${jFin}T12:00:00Z`) - dow * 24 * HEURE);
const debut = parisA(lundi, 0), debutPrec = debut - 7 * 24 * HEURE;
const iso = (ms) => new Date(ms).toISOString();
const org = (await q('{ account { organizations { id } } }')).data?.account?.organizations?.[0]?.id;
if (!org) throw new Error('organisation Buffer introuvable');
const agg = async (id, a, b) => { const r = await q(`query($o: OrganizationId!, $c:[ChannelId!], $s:DateTime!, $e:DateTime!){ aggregatedPostMetrics(input:{ organizationId:$o, channelIds:$c, startDateTime:$s, endDateTime:$e }){ metrics{ type value } } }`, { o: org, c: [id], s: iso(a), e: iso(b) }); return r.errors ? null : Object.fromEntries(r.data.aggregatedPostMetrics.metrics.map((m) => [m.type, m.value])); };
// Publications envoyées, avec leurs chiffres.
const posts = [];
let apres = null;
for (let i = 0; i < 10; i++) {
  const r = await q(`query($o: OrganizationId!, $c:[ChannelId!], $a:String){ posts(first: 100, after:$a, input:{ organizationId:$o, filter:{ channelIds:$c, status:[sent] } }){ edges{ node{ id channelService sentAt text externalLink metricsUpdatedAt metrics{ type value } } } pageInfo{ hasNextPage endCursor } } }`, { o: org, c: Object.values(RESEAUX), a: apres });
  if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 200));
  for (const { node } of r.data.posts.edges) posts.push(node);
  if (!r.data.posts.pageInfo.hasNextPage) break;
  apres = r.data.posts.pageInfo.endCursor;
}
// Rattachement à nos vidéos (fichier → format, match) par l'identifiant du post.
const reg = fs.existsSync('etat/publiees.json') ? JSON.parse(fs.readFileSync('etat/publiees.json', 'utf8')) : {};
const parId = new Map();
for (const [nom, rs] of Object.entries(reg)) for (const [rs1, id] of Object.entries(rs)) parId.set(id, { nom, reseau: rs1 });
const FORMATS = ['avant-match', 'apres-match', 'avant-journee', 'apres-journee', 'joueurs-journee', 'classement', 'classement-equipes', 'fonctionnalite', 'presentation'];
const etiquette = (p) => {
  const a = parId.get(p.id);
  if (!a) return { format: 'non rattaché', match: '' };
  const f = FORMATS.find((x) => a.nom.startsWith(x)) ?? 'autre';
  return { format: f, match: a.nom.replace(/\.mp4$/, '').replace(new RegExp(`^${f}-?`), '').replace(/-\d+(-\d{4}-\d\d-\d\d)?$/, '').replace(/-/g, ' ') };
};
const M = (p) => Object.fromEntries((p.metrics ?? []).map((m) => [m.type, m.value]));
const toutes = posts.filter((p) => p.sentAt && Date.parse(p.sentAt) >= debut && Date.parse(p.sentAt) <= fin).map((p) => {
  const m = M(p), vues = m.views, eng = m.engagementRate ?? (vues ? ((m.reactions ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0)) / vues * 100 : undefined);
  return { ...p, reseau: p.channelService, ...etiquette(p), rattache: parId.has(p.id), m, vues, eng, recent: fin - Date.parse(p.sentAt) < 24 * HEURE, dispo: Object.keys(m).length > 0 };
});
// Doublons : une publication non rattachée au même texte, sur le même réseau, qu'une publication rattachée (envoi en double de la même vidéo). Le reste non rattaché = publications manuelles.
const doublon = (p) => !p.rattache && toutes.some((x) => x.rattache && x.reseau === p.reseau && x.text === p.text && Math.abs(Date.parse(x.sentAt) - Date.parse(p.sentAt)) < 3 * HEURE);
for (const p of toutes) { p.doublon = doublon(p); p.manuelle = !p.rattache && !p.doublon; }
const enSemaine = toutes.filter((p) => p.rattache);
const doublons = toutes.filter((p) => p.doublon), manuelles = toutes.filter((p) => p.manuelle);
const fmt = (n, d = 0) => (n === undefined || n === null || Number.isNaN(n) ? NA : Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d }));
const moy = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : undefined);
const evol = (a, b) => (b === undefined || b === null ? 'non disponible (semaine précédente sans donnée)' : b === 0 ? (a === 0 ? '=' : 'nouveau') : `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(0)} %`);
const L = [];
L.push(`# Rapport de la semaine du ${lundi} (lundi 00 h → ${jourParis(fin)} ${hhmmParis(fin)}, heure de Paris)`, '', `Source : statistiques renvoyées par Buffer. « ${NA} » = Buffer ne renvoie pas ce chiffre. Les vidéos de moins de 24 h ont des chiffres encore partiels.`, '');
// 1. Par réseau
L.push('## 1. Par réseau', '', '| Réseau | Vidéos | Vues | Likes | Commentaires | Partages | Enregistrements | Abonnés gagnés | Évolution des vues |', '|---|---|---|---|---|---|---|---|---|');
const aucunPrec = [];
for (const [nom, id] of Object.entries(RESEAUX)) {
  const a = await agg(id, debut, fin), b = await agg(id, debutPrec, debut);
  const mine = enSemaine.filter((p) => p.reseau === nom);
  const complet = mine.length > 0 && mine.every((p) => p.dispo);
  const somme = (t) => (complet ? mine.reduce((x, p) => x + (p.m[t] ?? 0), 0) : a?.[t]);
  const etoile = complet || !a ? '' : ' *';
  const vuesSem = somme('views');
  L.push(`| ${nom} | ${mine.length} | ${fmt(vuesSem)}${etoile} | ${fmt(somme('reactions'))}${etoile} | ${fmt(somme('comments'))}${etoile} | ${fmt(somme('shares'))}${etoile} | ${fmt(somme('saves'))}${etoile} | ${nom === 'instagram' ? fmt(a?.follows) : NA} | ${a && b && b.postCount ? evol(vuesSem ?? 0, b.views ?? 0) : 'non disponible (pas de semaine précédente)'} |`);
  if (!b || !b.postCount) aucunPrec.push(nom);
}
L.push('', '\\* total renvoyé par Buffer pour tout le compte : il inclut les publications manuelles et les doublons, que Buffer ne permet pas de séparer (Instagram ne renvoie pas les chiffres par vidéo).', '', `**Publications manuelles** (hors programme automatique, exclues des classements et moyennes) : ${manuelles.length}${manuelles.length ? ' — ' + manuelles.map((p) => `${p.reseau} ${p.sentAt.slice(0, 10)} (${fmt(p.vues)} vues)`).join(' ; ') : ''}`, `**Doublons** (envoi en double d'une même vidéo, exclus) : ${doublons.length}`);
const DONNER = ["TikTok — Profil : le nombre d'« Abonnés » (début et fin de semaine) ; Analyses → Abonnés : gagnés / perdus", "Instagram — Insights → Audience : abonnés gagnés / perdus (et total début / fin de semaine)", "YouTube Studio — Analytics → Audience : abonnés gagnés / perdus, total début / fin de semaine", "YouTube Studio — Analytics → Engagement : partages et enregistrements (« Ajouts aux playlists ») de la semaine", "TikTok — Analyses → Aperçu : enregistrements (favoris) de la semaine"];
L.push('', '### À me donner en une fois (Buffer ne les fournit pas)', '', ...DONNER.map((x) => `- ${x}`), '');
// 2. Top / flop
const exploitables = enSemaine.filter((p) => p.dispo && p.vues !== undefined);
const ligne = (p) => `${p.reseau} · ${p.format}${p.match ? ` · ${p.match}` : ''} · ${fmt(p.vues)} vues · engagement ${p.eng === undefined ? NA : `${fmt(p.eng, 1)} %`} · ${p.sentAt.slice(0, 16).replace('T', ' ')} UTC${p.recent ? ' (partiel)' : ''}`;
const classe = (cle, titre) => { const t = [...exploitables].filter((p) => p[cle] !== undefined).sort((x, y) => y[cle] - x[cle]); L.push(`### ${titre}`, '', ...(t.length ? [`Top 3 :`, ...t.slice(0, 3).map((p) => `- ${ligne(p)}`), '', `Flop 3 :`, ...t.slice(-3).reverse().map((p) => `- ${ligne(p)}`)] : [NA]), ''); };
L.push('## 2. Top 3 et flop 3', '');
classe('vues', 'Par vues'); classe('eng', "Par taux d'engagement");
const sansChiffres = enSemaine.filter((p) => !p.dispo);
if (sansChiffres.length) L.push(`Publications sans chiffres renvoyés par Buffer : ${sansChiffres.length} (${[...new Set(sansChiffres.map((p) => p.reseau))].join(', ')}) — exclues des classements.`, '');
// 3. Par format
L.push('## 3. Par format', '', '| Format | Vidéos avec chiffres | Vues moyennes | Engagement moyen |', '|---|---|---|---|');
const parFormat = new Map();
for (const p of exploitables) parFormat.set(p.format, [...(parFormat.get(p.format) ?? []), p]);
for (const [f, l] of parFormat) L.push(`| ${f} | ${l.length} | ${fmt(moy(l.map((p) => p.vues)))} | ${fmt(moy(l.filter((p) => p.eng !== undefined).map((p) => p.eng)), 1)} % |`);
if (!parFormat.size) L.push(`| ${NA} | | | |`);
L.push('');
// 4. Horaires et jours
const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const tranche = (ms) => { const h = heureParis(ms); return h < 8 ? '0-8 h' : h < 12 ? '8-12 h' : h < 14 ? '12-14 h' : h < 18 ? '14-18 h' : h < 21 ? '18-21 h' : '21-24 h'; };
const groupe = (cle) => { const g = new Map(); for (const p of exploitables) { const k = cle(Date.parse(p.sentAt)); g.set(k, [...(g.get(k) ?? []), p]); } return g; };
L.push('## 4. Créneaux', '', '| Tranche (Paris) | Vidéos | Vues moyennes | Engagement moyen |', '|---|---|---|---|');
const gh = groupe(tranche); for (const [k, l] of [...gh].sort()) L.push(`| ${k} | ${l.length} | ${fmt(moy(l.map((p) => p.vues)))} | ${fmt(moy(l.filter((p) => p.eng !== undefined).map((p) => p.eng)), 1)} % |`);
if (!gh.size) L.push(`| ${NA} | | | |`);
L.push('', '| Jour | Vidéos | Vues moyennes | Engagement moyen |', '|---|---|---|---|');
const gj = groupe((ms) => jours[new Date(`${jourParis(ms)}T12:00:00Z`).getUTCDay()]); for (const [k, l] of gj) L.push(`| ${k} | ${l.length} | ${fmt(moy(l.map((p) => p.vues)))} | ${fmt(moy(l.filter((p) => p.eng !== undefined).map((p) => p.eng)), 1)} % |`);
if (!gj.size) L.push(`| ${NA} | | | |`);
L.push('');
// 5. Erreurs
const err = fs.existsSync('a-publier/ERREURS.txt') ? fs.readFileSync('a-publier/ERREURS.txt', 'utf8').split('\n').filter((l) => /^\d{4}-\d\d-\d\d/.test(l) && Date.parse(l.slice(0, 19).replace(' ', 'T') + 'Z') >= debut) : [];
const refus = err.filter((l) => /pas de vidéo|abandon/.test(l)), envoi = err.filter((l) => !/pas de vidéo|abandon/.test(l));
L.push('## 5. Erreurs', '', `Erreurs d'envoi, retards et plafonds : ${envoi.length}`, ...envoi.map((l) => `- ${l}`), '', `Vidéos refusées par les contrôles (nom, score, blessure…) : ${refus.length}`, ...refus.map((l) => `- ${l}`), '');
// 6. Recommandations
L.push('## 6. Recommandations pour la semaine suivante', '');
const assez = (l) => l.length >= 3;
const meilleur = (g, nom) => { const t = [...g].filter(([, l]) => assez(l)).map(([k, l]) => [k, moy(l.map((p) => p.vues)), l.length]).sort((a, b) => b[1] - a[1]); return t.length >= 2 ? { top: t[0], bas: t.at(-1) } : null; };
const rf = meilleur(parFormat), rh = meilleur(gh);
L.push(rf ? `1. **Formats** : pousser « ${rf.top[0]} » (${fmt(rf.top[1])} vues en moyenne sur ${rf.top[2]} vidéos) et réduire « ${rf.bas[0]} » (${fmt(rf.bas[1])} sur ${rf.bas[2]}).` : `1. **Formats** : échantillon trop petit pour conclure (moins de 3 vidéos par format avec chiffres). Garder le programme actuel et relire le rapport de dimanche prochain.`);
L.push(rh ? `2. **Horaires** : privilégier la tranche ${rh.top[0]} (${fmt(rh.top[1])} vues en moyenne sur ${rh.top[2]} vidéos), éviter ${rh.bas[0]} (${fmt(rh.bas[1])}).` : `2. **Horaires** : échantillon trop petit pour conclure (moins de 3 vidéos par tranche avec chiffres).`);
const tops = [...exploitables].sort((x, y) => y.vues - x.vues).filter((p) => p.match).slice(0, 3);
L.push(tops.length ? `3. **Clubs / affiches** : les vidéos les plus vues concernaient ${[...new Set(tops.map((p) => `« ${p.match} »`))].join(', ')} : donner la priorité aux affiches de ces clubs (score d'importance dans data/auto-config.json).` : `3. **Clubs** : aucune vidéo de match avec chiffres cette semaine : ${NA}.`);
L.push('', `_Rapport généré le ${jourParis(Date.now())} à ${hhmmParis(Date.now())} (Paris)._`);
const sortie = arg('sortie') ?? `rapports/semaine-${jFin}.md`;
fs.mkdirSync('rapports', { recursive: true });
fs.writeFileSync(sortie, L.join('\n') + '\n');
console.log(sortie);
