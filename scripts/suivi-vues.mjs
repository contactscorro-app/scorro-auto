// Usage : node scripts/suivi-vues.mjs
// Suivi des vues par vidéo. LECTURE SEULE : une seule requête Buffer « posts » (aucune mutation, rien n'est publié ni modifié).
// 1. Ajoute un relevé horodaté de toutes les publications envoyées à etat/releves-vues.jsonl (historique).
// 2. Réécrit rapports/suivi-vues.csv : une ligne par publication et par réseau, avec vues à J+1 et J+3 tirées des relevés.
// J+1 = relevé pris entre 20 h et 30 h après l'envoi ; J+3 = entre 66 h et 80 h. Sans relevé dans la fenêtre : vide.
// Pour que J+1 et J+3 se remplissent tout seuls, ce script doit tourner au moins toutes les 4 h (à valider par l'éditeur).
import fs from 'node:fs';
import { jourParis, hhmmParis, HEURE } from './decider.mjs';
const env = Object.fromEntries((fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const V = (k) => process.env[k] ?? env[k];
const q = async (query, variables) => (await (await fetch('https://api.buffer.com', { method: 'POST', headers: { Authorization: `Bearer ${V('BUFFER_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const CANAUX = { instagram: V('BUFFER_CHANNEL_INSTAGRAM'), youtube: V('BUFFER_CHANNEL_YOUTUBE'), tiktok: V('BUFFER_CHANNEL_TIKTOK') };
const org = (await q('{ account { organizations { id } } }')).data?.account?.organizations?.[0]?.id;
if (!org) throw new Error('organisation Buffer introuvable');
const posts = [];
let apres = null;
for (let i = 0; i < 10; i++) {
  const r = await q(`query($o: OrganizationId!, $c:[ChannelId!], $a:String){ posts(first: 100, after:$a, input:{ organizationId:$o, filter:{ channelIds:$c, status:[sent] } }){ edges{ node{ id channelService sentAt text metricsUpdatedAt metrics{ type value } } } pageInfo{ hasNextPage endCursor } } }`, { o: org, c: Object.values(CANAUX), a: apres });
  if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 200));
  for (const { node } of r.data.posts.edges) posts.push(node);
  if (!r.data.posts.pageInfo.hasNextPage) break;
  apres = r.data.posts.pageInfo.endCursor;
}
const vuesDe = (p) => (p.metrics ?? []).find((m) => m.type === 'views')?.value;
// 1. Relevé
const maintenant = Date.now();
fs.mkdirSync('etat', { recursive: true });
fs.appendFileSync('etat/releves-vues.jsonl', posts.filter((p) => p.sentAt).map((p) => JSON.stringify({ t: new Date(maintenant).toISOString(), id: p.id, vues: vuesDe(p) ?? null, maj: p.metricsUpdatedAt ?? null })).join('\n') + '\n');
const releves = new Map();
for (const l of fs.readFileSync('etat/releves-vues.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.vues === null) continue; releves.set(r.id, [...(releves.get(r.id) ?? []), r]); }
// 2. Rattachement aux vidéos (etat/publiees.json : fichier → réseau → id du post)
const reg = fs.existsSync('etat/publiees.json') ? JSON.parse(fs.readFileSync('etat/publiees.json', 'utf8')) : {};
const parId = new Map();
for (const [nom, rs] of Object.entries(reg)) for (const [r, id] of Object.entries(rs)) parId.set(id, nom);
const FORMATS = ['avant-match', 'apres-match', 'avant-journee', 'apres-journee', 'joueurs-journee', 'classement-equipes', 'classement', 'fonctionnalite', 'presentation'];
const LIGUES = { 301: 'Ligue 1', 8: 'Premier League', 564: 'Liga', 384: 'Serie A', 82: 'Bundesliga', 2: 'Ligue des champions' };
const etiquette = (p) => {
  const nom = parId.get(p.id);
  if (!nom) return { type: 'manuelle', sujet: (p.text ?? '').split('\n')[0].slice(0, 60).replace(/[;"]/g, ' ') };
  const type = FORMATS.find((x) => nom.startsWith(x)) ?? 'autre';
  let sujet = nom.replace(/\.mp4$/, '').replace(new RegExp(`^${type}-?`), '');
  const ligue = sujet.match(/saison-\d{4}-\d{4}-(\d+)(-\d{4}-\d\d-\d\d)?$/)?.[1];
  sujet = ligue ? LIGUES[ligue] ?? ligue : sujet.replace(/-\d+$/, '').replace(/-/g, ' ');
  return { type, sujet };
};
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const TREVE = { de: '2026-11-10', a: '2026-11-20' }; // trêve internationale de novembre (Ligue 1 : dernière journée 06-09/11, reprise 21/11)
const dans = (p, a, b) => (releves.get(p.id) ?? []).map((r) => ({ ...r, age: (Date.parse(r.t) - Date.parse(p.sentAt)) / HEURE })).filter((r) => r.age >= a && r.age <= b).sort((x, y) => Math.abs(x.age - (a + b) / 2) - Math.abs(y.age - (a + b) / 2))[0];
const lignes = posts.filter((p) => p.sentAt).map((p) => ({ p, t: Date.parse(p.sentAt), ...etiquette(p) })).sort((a, b) => a.t - b.t);
// Doublon : même réseau, même texte, moins de 3 h d'écart avec une publication déjà vue (republication).
const vus = [];
for (const l of lignes) { l.doublon = vus.some((x) => x.p.channelService === l.p.channelService && x.p.text === l.p.text && Math.abs(x.t - l.t) < 3 * HEURE); vus.push(l); }
// Nombre de vidéos publiées le même jour sur le même réseau, et écart (h) avec la précédente sur ce réseau : variables de fréquence.
const parReseau = (l) => lignes.filter((x) => x.p.channelService === l.p.channelService && !x.doublon);
const csv = [['date', 'heure_paris', 'jour', 'type', 'sujet', 'plateforme', 'periode', 'videos_ce_jour_reseau', 'ecart_precedente_h', 'vues_J+1', 'vues_J+3', 'vues_actuelles', 'age_h', 'buffer_maj', 'doublon'].join(';')];
for (const l of lignes) {
  const r = parReseau(l), i = r.indexOf(l), prec = i > 0 ? r[i - 1] : null;
  const j = jourParis(l.t), age = (maintenant - l.t) / HEURE;
  const j1 = dans(l.p, 20, 30), j3 = dans(l.p, 66, 80);
  csv.push([j, hhmmParis(l.t), JOURS[new Date(`${j}T12:00:00Z`).getUTCDay()], l.type, l.sujet, l.p.channelService, j >= TREVE.de && j <= TREVE.a ? 'treve' : 'normale', r.filter((x) => jourParis(x.t) === j).length, prec ? ((l.t - prec.t) / HEURE).toFixed(1) : '', j1?.vues ?? '', j3?.vues ?? '', vuesDe(l.p) ?? '', age.toFixed(0), l.p.metricsUpdatedAt?.slice(0, 16) ?? '', l.doublon ? 'oui' : ''].join(';'));
}
fs.writeFileSync('rapports/suivi-vues.csv', csv.join('\n') + '\n');
console.log(`rapports/suivi-vues.csv : ${lignes.length} publications, relevé ajouté à etat/releves-vues.jsonl`);
