// Usage : node scripts/preparer-score-final.mjs <fixtureId>
// 1 appel au proxy + logos. Écrit data/score-final-<id>.json. Refuse tout match non terminé. Aucune IA, aucun secret.
import fs from 'node:fs';
import { FINIS, de, get, lireScore, logosDe, telecharger } from './commun.mjs';
const id = process.argv[2];
if (!/^\d+$/.test(id ?? '')) throw new Error('fixtureId manquant');
const inc = 'participants;scores;state;league;round;events.type;statistics.type;venue;lineups.details.type';
const f = (await get(`sportmonks/fixtures/${id}?include=${inc}`)).data;
if (!FINIS.includes(f.state?.state)) throw new Error(`match non terminé : ${f.state?.state}`);
const { dom, ext, fiables: butsFiables, gagnant, recoupe } = lireScore(f);

// Accroche : gabarits sans article ni élision sur le nom d'équipe, donc justes pour tout club.
const perdant = gagnant === dom ? ext : gagnant === ext ? dom : null;
const accroche = gagnant ? `${gagnant.nom} bat ${perdant.nom}` : `${dom.nom} et ${ext.nom} se neutralisent`;
const PLUS = { 2: 'Doublé', 3: 'Triplé', 4: 'Quadruplé' };
const classes = [...dom.buteurs, ...ext.buteurs].filter((b) => !b.minutes.some((m) => m.includes('csc')))
  .sort((a, b) => b.minutes.length - a.minutes.length);
// Un seul meilleur buteur du match, sinon pas de sous-titre : citer l'un de deux doublés serait choisir au hasard.
const star = classes[0] && classes[0].minutes.length !== classes[1]?.minutes.length ? classes[0] : null;
const sousTitre = star && PLUS[star.minutes.length] ? `${PLUS[star.minutes.length]} ${de(star.nom)}` : null;

// Stat clé : UNE règle — le plus grand écart relatif en faveur du vainqueur (ou entre les deux si nul).
const STATS = [['shots-on-target', 'Tirs cadrés', ''], ['big-chances-created', 'Grosses occasions', ''], ['shots-total', 'Tirs', ''], ['ball-possession', 'Possession', ' %']];
const val = (code, eq) => f.statistics?.find((s) => s.type?.code === code && s.participant_id === eq.id)?.data?.value;
const stat = STATS.map(([code, label, unite]) => {
  const a = val(code, dom), b = val(code, ext);
  if (typeof a !== 'number' || typeof b !== 'number' || a + b === 0) return null;
  const haut = gagnant ? val(code, gagnant) : Math.max(a, b);
  const bas = gagnant ? val(code, perdant) : Math.min(a, b);
  return { label, unite, dom: a, ext: b, ecart: haut <= bas ? 0 : haut / Math.max(bas, 1) };
}).filter(Boolean).sort((x, y) => y.ecart - x.ecart)[0];

// Après-match : les stats dans un ordre fixe, et la meilleure note si elle est seule en tête (pas de « joueur du match » : la source n'en donne pas).
const statsCles = STATS.concat([['passes', 'Passes', '']]).map(([code, label, unite]) => {
  const a = val(code, dom), b = val(code, ext);
  return typeof a === 'number' && typeof b === 'number' && a + b > 0 ? { label, unite, dom: a, ext: b } : null;
}).filter(Boolean);
const notes = (f.lineups ?? []).map((l) => ({ nom: l.player_name, equipe: l.team_id, note: l.details?.find((d) => d.type?.code === 'rating')?.data?.value }))
  .filter((x) => typeof x.note === 'number').sort((a, b) => b.note - a.note);
const meilleureNote = notes[0] && notes[0].note !== notes[1]?.note ? { nom: notes[0].nom, note: notes[0].note.toFixed(1).replace('.', ','), logo: `logos/${notes[0].equipe}.png` } : null;

const date = new Date(`${f.starting_at.replace(' ', 'T')}Z`);
const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(date).replace(/^1 /, '1er ');
await logosDe(dom, ext);
const ligue = { nom: f.league.name, logo: `logos/ligue-${f.league.id}.png`, tour: /^\d+$/.test(f.round?.name ?? '') ? `Journée ${f.round.name}` : null };
await telecharger(f.league.image_path, ligue.logo);
const sortie = { fixtureId: f.id, ligue, jour, stade: f.venue?.name ?? null, accroche, sousTitre, dom, ext, gagnant: gagnant?.id ?? null, stat: stat && stat.ecart > 1 ? stat : null, statsCles, meilleureNote, controle: { scores: [recoupe] } };
fs.writeFileSync(`data/score-final-${id}.json`, JSON.stringify(sortie, null, 2));
console.log(sortie.accroche, `${dom.buts}-${ext.buts}`, '|', sousTitre, '| buteurs fiables:', butsFiables, '| stat:', stat?.label, stat?.dom, stat?.ext);
