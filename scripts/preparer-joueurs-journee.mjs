// Usage : node scripts/preparer-joueurs-journee.mjs <roundId>
// « Les joueurs de la journée » : doublés et plus, 2 passes décisives et plus, grosses notes. Journée finie seulement.
// Écran des absents : la journée suivante, listes Sportmonks, seulement les joueurs décisifs de leur équipe. Rien de sûr : pas d'écran.
import fs from 'node:fs';
import { FINIS, absentsProuves, carteJoueur, classementsDe, fraicheurAbsent, get, instant, lireScore, logosDe, noms, telecharger, texteButs, textePasses } from './commun.mjs';
const id = process.argv[2];
if (!/^\d+$/.test(id ?? '')) throw new Error('roundId manquant');
const inc = 'league;fixtures.participants;fixtures.scores;fixtures.state;fixtures.events.type;fixtures.lineups.player;fixtures.lineups.details.type';
const r = (await get(`sportmonks/rounds/${id}?include=${inc}`)).data;
const pasFinis = r.fixtures.filter((f) => !FINIS.includes(f.state?.state));
if (pasFinis.length) throw new Error(`journée non finie : ${pasFinis.map((f) => `${f.name} (${f.state?.state})`).join(', ')}`);
const NOTE_FORTE = 8, PLAFOND = 6, PLACES_EXPLOITS = 5;
const SERIE = { 2: 'Doublé', 3: 'Triplé', 4: 'Quadruplé', 5: 'Quintuplé' };
const parJoueur = new Map();
const scores = [], relevesAbsents = [], absentsRetires = [];
const fiche = (pid, equipe, match) => {
  if (!parJoueur.has(pid)) parJoueur.set(pid, { id: pid, equipe, match, buts: 0, sp: 0, passes: 0, note: null, p: null });
  return parJoueur.get(pid);
};
for (const f of r.fixtures) {
  const { dom, ext, fiables, recoupe } = lireScore(f);
  scores.push(recoupe);
  await logosDe(dom, ext);
  const match = `${dom.nom} ${dom.buts}-${ext.buts} ${ext.nom}`;
  if (!fiables) { console.log('⚠️ match écarté (buts ≠ score) :', f.name); continue; }
  for (const l of f.lineups ?? []) {
    const j = fiche(l.player_id, l.team_id, match);
    j.p = l.player ?? { id: l.player_id, display_name: l.player_name };
    const n = l.details?.find((d) => d.type?.code === 'rating')?.data?.value;
    if (typeof n === 'number') j.note = n;
  }
  for (const e of f.events ?? []) {
    if (!['goal', 'penalty'].includes(e.type?.code) || e.player_id == null) continue;
    const j = fiche(e.player_id, e.participant_id, match);
    j.buts++;
    if (e.type.code === 'penalty') j.sp++;
    if (e.related_player_id != null) fiche(e.related_player_id, e.participant_id, match).passes++;
  }
}
const tous = [...parJoueur.values()].filter((j) => j.p);
const parNote = (a, b) => (b.note ?? 0) - (a.note ?? 0);
const exploits = tous.filter((j) => j.buts >= 2 || j.passes >= 2).sort((a, b) => b.buts - a.buts || b.passes - a.passes || parNote(a, b)).slice(0, PLACES_EXPLOITS);
const notes = tous.filter((j) => !exploits.includes(j) && j.note >= NOTE_FORTE).sort(parNote);
const choisis = [...exploits, ...notes].slice(0, PLAFOND);
if (!choisis.length) throw new Error('aucun joueur ne remplit les critères');
const virgule = (n) => n.toFixed(1).replace('.', ',');
const lignes = (j) => {
  const faits = [];
  if (j.buts) faits.push(SERIE[j.buts] ?? texteButs(j.buts));
  if (j.passes) faits.push(j.buts ? `${j.passes} ${j.passes > 1 ? 'passes' : 'passe'}` : textePasses(j.passes));
  const sous = [];
  if (j.sp) sous.push(j.sp === j.buts ? 'Sur penalty' : `dont ${j.sp} sur penalty`);
  if (j.note != null) sous.push(`Note ${virgule(j.note)}`);
  return faits.length ? [faits.join(' + '), ...(sous.length ? [sous.join(' · ')] : [])] : [`Note ${virgule(j.note)}`];
};
const joueurs = [];
for (const j of choisis) joueurs.push({ ...(await carteJoueur(j.p)), logo: `logos/${j.equipe}.png`, match: j.match, lignes: lignes(j) });
const ligue = { nom: r.league.name, logo: `logos/ligue-${r.league.id}.png`, texte: `${r.league.name} · Journée ${r.name}` };
await telecharger(r.league.image_path, ligue.logo);

// Absents : la prochaine journée. Important = dans les 3 plus décisifs de son équipe en championnat (au moins 3 buts + passes, recoupés).
const saison = (await get(`sportmonks/seasons/${r.season_id}?include=rounds`)).data;
const fin = Math.max(...r.fixtures.map(instant));
const suivante = (saison.rounds ?? []).filter((x) => Date.parse(`${String(x.starting_at).slice(0, 10)}T23:59:00Z`) > fin && !x.finished).sort((a, b) => String(a.starting_at).localeCompare(String(b.starting_at)))[0];
let absents = [], sousTitreAbsents = null;
if (suivante) {
  const s = (await get(`sportmonks/rounds/${suivante.id}?include=fixtures.participants;fixtures.state;fixtures.sidelined.sideline.player`)).data;
  const c = await classementsDe(r.season_id);
  const impl = (pid) => (c.buts.get(pid)?.n ?? 0) + (c.passes.get(pid)?.n ?? 0);
  const coherent = (pid) => (c.buts.get(pid)?.n ?? 0) === (c.aggButs.get(pid) ?? 0) && (c.passes.get(pid)?.n ?? 0) === (c.aggPasses.get(pid) ?? 0);
  const topEquipe = (eq) => [...new Set([...c.buts.values(), ...c.passes.values()].filter((x) => x.equipe === eq).map((x) => x.id))].sort((a, b) => impl(b) - impl(a)).slice(0, 3);
  const trouves = [];
  let declares = 0;
  for (const f of s.fixtures ?? []) {
    if (f.state?.state !== 'NS') continue;
    const envoi = instant(f);
    for (const x of f.sidelined ?? []) {
      const d = x.sideline;
      declares++;
      if (!d?.player || d.completed) continue;
      if (d.end_date && Date.parse(`${d.end_date}T23:59:00Z`) < envoi) continue;
      if (!topEquipe(x.participant_id).includes(x.player_id) || impl(x.player_id) < 3 || !coherent(x.player_id)) continue;
      const adv = f.participants.find((p) => p.id !== x.participant_id);
      const eq = f.participants.find((p) => p.id === x.participant_id);
      if (!eq) continue;
      await telecharger(eq.image_path, `logos/${eq.id}.png`);
      trouves.push({ d, equipe: x.participant_id, impl: impl(x.player_id), logo: `logos/${eq.id}.png`, contre: noms[adv?.id] ?? adv?.name });
    }
  }
  console.log(`absents : journée ${suivante.name}, ${declares} déclarés, ${trouves.length} importants`);
  // Sans preuve récente, le joueur est retiré et remplacé par le suivant. Plus aucun absent : pas d'écran « absents ».
  const { gardes, retires } = await absentsProuves(trouves.sort((a, b) => b.impl - a.impl), (t) => fraicheurAbsent(t.d, t.equipe), 4);
  for (const t of retires) absentsRetires.push(`${t.d.player.display_name?.trim() ?? t.d.player_id} : ${t.releve.preuve}`);
  for (const t of gardes) {
    relevesAbsents.push({ id: t.d.player.id, ...t.releve });
    absents.push({ ...(await carteJoueur(t.d.player)), logo: t.logo, motif: t.d.category === 'suspended' ? 'Suspendu' : 'Blessé', detail: `Impliqué sur ${t.impl} buts · contre ${t.contre}` });
  }
  sousTitreAbsents = `Journée ${suivante.name}, à ce jour`;
}
const sortie = { ligue, joueurs, absents, sousTitreAbsents, controle: { scores, absents: relevesAbsents, absentsRetires } };
fs.writeFileSync(`data/joueurs-journee-${id}.json`, JSON.stringify(sortie, null, 2));
for (const j of joueurs) console.log(j.usage, '|', j.match, '|', j.lignes.join(' / '), '| photo', !!j.photo);
for (const n of absentsRetires) console.log('RETIRÉ', n);
for (const j of absents) console.log('ABSENT', j.usage, j.motif, j.detail, JSON.stringify(relevesAbsents.find((x) => x.id === j.id)));
