// Usage : node scripts/preparer-avant-journee.mjs <roundId>
// La liste de la journée + les compos des affiches, choisies avec la liste de clubs prioritaires (data/clubs-prioritaires.json).
// Compo : predictedLineups si 22 joueurs, sinon DERNIER ONZE ALIGNÉ, nommé tel quel. Jamais présenté comme probable.
import fs from 'node:fs';
import { composDuMatch, get, instant, noms, rangFr, telecharger } from './commun.mjs';
const id = process.argv[2];
const jourArg = process.argv.find((a) => a.startsWith('--jour='))?.split('=')[1];
const suffixe = jourArg ? `-${jourArg}` : '';
const jourDe = (f) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(Date.parse(`${f.starting_at.replace(' ', 'T')}Z`));
if (!/^\d+$/.test(id ?? '')) throw new Error('roundId manquant');
const r = (await get(`sportmonks/rounds/${id}?include=league;fixtures.participants;fixtures.state`)).data;
const aVenir = r.fixtures.filter((f) => f.state?.state === 'NS' && (!jourArg || jourDe(f) === jourArg));
if (!aVenir.length) throw new Error('aucun match à venir');
const st = (await get(`sportmonks/standings/seasons/${r.season_id}`)).data ?? [];
const rangDe = (equipe) => { const x = st.filter((s) => s.participant_id === equipe); return x.length === 1 ? x[0] : null; };
const tz = { timeZone: 'Europe/Paris' };
const jour = (ms) => new Intl.DateTimeFormat('fr-FR', { ...tz, weekday: 'short' }).format(ms).replace(/^./, (c) => c.toUpperCase());
const heure = (ms) => new Intl.DateTimeFormat('fr-FR', { ...tz, hour: '2-digit', minute: '2-digit' }).format(ms).replace(':', 'h');
const cote = (f, c) => {
  const p = f.participants.find((x) => x.meta?.location === c);
  const s = rangDe(p.id);
  return { id: p.id, nom: noms[p.id] ?? p.name, logoSrc: p.image_path, logo: `logos/${p.id}.png`, rang: s ? rangFr(s.position) : null, pos: s?.position ?? null, points: s?.points ?? null };
};
const lignes = [...aVenir].sort((a, b) => instant(a) - instant(b) || a.id - b.id).map((f) => ({ id: f.id, jour: jour(instant(f)), heure: heure(instant(f)), dom: cote(f, 'home'), ext: cote(f, 'away'), envoi: instant(f) }));
for (const m of lignes) { await telecharger(m.dom.logoSrc, m.dom.logo); await telecharger(m.ext.logoSrc, m.ext.logo); }
// Affiches : d'abord les chocs entre deux clubs prioritaires, puis un club prioritaire ; à égalité, la plus petite somme des rangs, puis le mieux classé.
// Ligue sans liste : tous les matchs sont candidats et seul le classement décide. Sans rang connu : pas d'affiche plutôt qu'un choix au hasard.
const MAX_AFFICHES = 3;
const liste = JSON.parse(fs.readFileSync('data/clubs-prioritaires.json', 'utf8'))[r.league.id] ?? null;
const poids = (m) => (liste ? [m.dom.id, m.ext.id].filter((x) => liste.includes(x)).length : 1);
const affiches = lignes.filter((m) => m.dom.pos && m.ext.pos && poids(m) > 0)
  .sort((a, b) => poids(b) - poids(a) || a.dom.pos + a.ext.pos - b.dom.pos - b.ext.pos || Math.min(a.dom.pos, a.ext.pos) - Math.min(b.dom.pos, b.ext.pos)).slice(0, MAX_AFFICHES);

const compos = [];
for (const a of affiches) compos.push(...await composDuMatch(a.id, a.dom, a.ext, a.envoi));
const ligue = { nom: r.league.name, logo: `logos/ligue-${r.league.id}.png`, texte: `${r.league.name} · Journée ${r.name}` };
await telecharger(r.league.image_path, ligue.logo);
const sortie = { ligue, accroche: `Journée ${r.name}`, sousTitre: 'Tous les matchs', matchs: lignes, affiches, compos };
fs.writeFileSync(`data/avant-journee-${id}${suffixe}.json`, JSON.stringify(sortie, null, 2));
console.log(ligue.texte, lignes.length, 'matchs | affiches :', affiches.map((a) => `${a.dom.nom}(${a.dom.rang})-${a.ext.nom}(${a.ext.rang})`).join(', '), '|', compos.map((c) => `${c.equipe} ${c.titre} ${c.detail}`).join(' ; '));
