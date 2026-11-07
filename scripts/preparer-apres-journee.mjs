// Usage : node scripts/preparer-apres-journee.mjs <roundId>
// Refuse tant qu'un match de la journée n'est pas terminé. Le classement final : brut, sans zone ni badge.
import fs from 'node:fs';
import { FINIS, get, lireScore, logosDe, noms, telecharger } from './commun.mjs';
const id = process.argv[2];
// --jour=AAAA-MM-JJ : une soirée seulement (Ligue des champions, dont la journée s'étale sur deux soirs).
const jourArg = process.argv.find((a) => a.startsWith('--jour='))?.split('=')[1];
const suffixe = jourArg ? `-${jourArg}` : '';
const jourDe = (f) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(Date.parse(`${f.starting_at.replace(' ', 'T')}Z`));
if (!/^\d+$/.test(id ?? '')) throw new Error('roundId manquant');
const r = (await get(`sportmonks/rounds/${id}?include=league;fixtures.participants;fixtures.scores;fixtures.state;fixtures.events.type`)).data;
if (jourArg) r.fixtures = r.fixtures.filter((f) => jourDe(f) === jourArg);
const REPORTES = ['POSTPONED', 'CANCELLED', 'SUSPENDED', 'ABANDONED'];
const reportes = r.fixtures.filter((f) => REPORTES.includes(f.state?.state));
if (reportes.length > 1) throw new Error(`journée non finie : ${reportes.length} matchs reportés`);
r.fixtures = r.fixtures.filter((f) => !REPORTES.includes(f.state?.state));
const pasFinis = r.fixtures.filter((f) => !FINIS.includes(f.state?.state));
if (pasFinis.length) throw new Error(`journée non finie : ${pasFinis.map((f) => `${f.name} (${f.state?.state})`).join(', ')}`);
const scores = [];
const matchs = [...r.fixtures].sort((a, b) => a.starting_at.localeCompare(b.starting_at) || a.id - b.id).map((f) => {
  const { dom, ext, fiables, gagnant, recoupe } = lireScore(f);
  scores.push(recoupe);
  if (!fiables) console.log('⚠️ buteurs masqués (buts ≠ score) :', f.name);
  return { id: f.id, dom, ext, gagnant: gagnant?.id ?? null };
});
for (const m of matchs) await logosDe(m.dom, m.ext);
const st = (await get(`sportmonks/standings/seasons/${r.season_id}?include=participant`)).data ?? [];
const uniques = new Set(st.map((x) => x.participant_id));
// Plusieurs lignes par équipe (groupes, phases) : on ne devine pas laquelle compte.
const aJour = st.length > 0 && st.every((x) => x.round_id === r.id);
if (!aJour) console.log('⚠️ classement omis : il ne correspond pas à cette journée (round_id', st[0]?.round_id, ')');
const lignes = aJour && st.length === uniques.size ? [...st].sort((a, b) => a.position - b.position).slice(0, 7) : [];
for (const l of lignes) await telecharger(l.participant.image_path, `logos/${l.participant_id}.png`);
const ligue = { nom: r.league.name, logo: `logos/ligue-${r.league.id}.png` };
await telecharger(r.league.image_path, ligue.logo);
ligue.texte = `${r.league.name} · Journée ${r.name}`;
const buts = matchs.reduce((n, m) => n + m.dom.buts + m.ext.buts, 0);
const sortie = {
  ligue, accroche: 'Tous les scores', sousTitre: `${buts} buts en ${matchs.length} matchs${reportes.length ? ' · 1 match reporté' : ''}`, matchs,
  classement: lignes.map((l) => ({ id: l.participant_id, rang: l.position, nom: noms[l.participant_id] ?? l.participant.name, logo: `logos/${l.participant_id}.png`, points: l.points })),
  controle: { scores },
};
fs.writeFileSync(`data/apres-journee-${id}${suffixe}.json`, JSON.stringify(sortie, null, 2));
console.log(ligue.texte, matchs.map((m) => `${m.dom.nom} ${m.dom.buts}-${m.ext.buts} ${m.ext.nom}`).join(' | '), '| 1er', sortie.classement[0]?.nom, sortie.classement[0]?.points);
