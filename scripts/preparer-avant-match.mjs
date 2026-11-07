// Usage : node scripts/preparer-avant-match.mjs <fixtureId> [--prono]
// Par défaut : carte + stars (meilleur buteur et passeur du championnat) + compos. --prono : carte + un joueur clé par équipe, sans compos.
// 2 appels + 2 formes + face-à-face. Écrit data/avant-match-<id>.json. Classement : valeurs brutes, jamais de zone ni de badge.
import fs from 'node:fs';
import { FINIS, carteStat, fraicheurAbsent, composDuMatch, get, instant, meilleur, noms, rangFr, statsEquipe, telecharger, texteButs, textePasses, toutesLesPages } from './commun.mjs';
const prono = process.argv.includes('--prono');
const id = process.argv[2];
if (!/^\d+$/.test(id ?? '')) throw new Error('fixtureId manquant');
const f = (await get(`sportmonks/fixtures/${id}?include=participants;state;league;round;sidelined.sideline;predictedLineups`)).data;
if (f.state?.state !== 'NS') throw new Error(`match déjà commencé ou annulé : ${f.state?.state}`);
const envoi = instant(f);
const part = (cote) => {
  const p = f.participants.find((x) => x.meta?.location === cote);
  if (!p) throw new Error(`pas d'équipe ${cote}`);
  return p;
};
const resultat = (m, equipeId) => {
  const buts = (pid) => m.scores?.find((s) => s.description === 'CURRENT' && s.participant_id === pid)?.score?.goals;
  const adv = m.participants?.find((x) => x.id !== equipeId);
  const a = buts(equipeId), b = buts(adv?.id);
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  if (a !== b) return a > b ? 'V' : 'D';
  if (m.state?.state === 'FT_PEN') {
    const moi = m.participants.find((x) => x.id === equipeId)?.meta?.winner;
    return moi === true ? 'V' : moi === false ? 'D' : null;
  }
  return 'N';
};
const jourIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const inc = 'include=participants;scores;state';
const forme = async (equipeId) => {
  const debut = jourIso(envoi - 180 * 86400000);
  const lignes = await toutesLesPages(`sportmonks/fixtures/between/${debut}/${jourIso(envoi)}/${equipeId}?${inc}`);
  const res = lignes.filter((m) => FINIS.includes(m.state?.state) && instant(m) < envoi)
    .sort((a, b) => instant(b) - instant(a)).slice(0, 5).map((m) => resultat(m, equipeId));
  // Un résultat illisible : pas de forme plutôt qu'une forme fausse. Ordre affiché : du plus ancien au plus récent.
  return res.length === 5 && res.every(Boolean) ? res.reverse() : [];
};
const stand = (await get(`sportmonks/standings/seasons/${f.season_id}`)).data ?? [];
const classement = (equipeId) => {
  const l = stand.filter((x) => x.participant_id === equipeId);
  // Plusieurs lignes (groupes, phases) : on ne devine pas laquelle compte.
  return l.length === 1 && typeof l[0].position === 'number' ? { rang: rangFr(l[0].position), points: l[0].points } : null;
};
const fiche = async (cote) => {
  const p = part(cote);
  const logo = `logos/${p.id}.png`;
  await telecharger(p.image_path, logo);
  return { id: p.id, nom: noms[p.id] ?? p.name, logo, forme: await forme(p.id), classement: classement(p.id) };
};
const dom = await fiche('home');
const ext = await fiche('away');
const h2hLignes = await toutesLesPages(`sportmonks/fixtures/head-to-head/${dom.id}/${ext.id}?${inc}`);
const derniers = h2hLignes.filter((m) => FINIS.includes(m.state?.state) && instant(m) < envoi).sort((a, b) => instant(b) - instant(a)).slice(0, 5);
const rH2h = derniers.map((m) => resultat(m, dom.id));
const h2h = derniers.length && rH2h.every(Boolean)
  ? { n: derniers.length, dom: rH2h.filter((r) => r === 'V').length, nuls: rH2h.filter((r) => r === 'N').length, ext: rH2h.filter((r) => r === 'D').length }
  : null;
const date = new Date(envoi);
const tz = { timeZone: 'Europe/Paris' };
const jour = new Intl.DateTimeFormat('fr-FR', { ...tz, weekday: 'long', day: 'numeric', month: 'long' }).format(date).replace(/ 1 /, ' 1er ');
const heure = new Intl.DateTimeFormat('fr-FR', { ...tz, hour: '2-digit', minute: '2-digit' }).format(date).replace(':', 'h');
const ligue = { nom: f.league.name, logo: `logos/ligue-${f.league.id}.png`, tour: /^\d+$/.test(f.round?.name ?? '') ? `Journée ${f.round.name}` : null };
await telecharger(f.league.image_path, ligue.logo);
// Stars et joueurs clés : championnat, événements recoupés avec /topscorers. Un absent est dit absent ; un joueur clé ne peut pas l'être, ni être hors du onze probable.
const absents = new Set((f.sidelined ?? []).filter((x) => !x.sideline?.completed).map((x) => x.player_id));
const onze = (f.predictedlineups ?? []).length === 22 ? new Set(f.predictedlineups.map((x) => x.player_id)) : null;
const joueurs = [], relevesAbsents = [], absentsRetires = [];
const infoAbsent = new Map((f.sidelined ?? []).map((x) => [x.player_id, x.sideline]));
for (const e of [dom, ext]) {
  const st = await statsEquipe(e.id);
  if (!st) continue;
  const lignes = [];
  if (prono) {
    const dispo = { ...st, joueurs: st.joueurs.filter((j) => !absents.has(j.id) && (!onze || onze.has(j.id))).map((j) => ({ ...j, impl: j.buts + j.passes })) };
    const c = dispo.joueurs.filter((j) => j.buts === j.aggB && j.passes === j.aggP).sort((a, b) => b.impl - a.impl || b.buts - a.buts)[0];
    if (c) lignes.push(await carteStat(c, 'Joueur clé', `Impliqué sur ${c.impl} buts en ${st.ligue}`));
  } else {
    const b = meilleur(st, 'buts', 'passes'), p = meilleur(st, 'passes', 'buts');
    // Le même joueur en tête des deux : une seule ligne.
    if (b && p && b.id === p.id) lignes.push(await carteStat(b, `${b.ex ? 'Co-meilleur' : 'Meilleur'} buteur et ${p.ex ? 'co-meilleur ' : ''}passeur`, `${texteButs(b.buts)} · ${textePasses(p.passes)}`, absents.has(b.id)));
    else {
      if (b) lignes.push(await carteStat(b, b.ex ? 'Co-meilleur buteur' : 'Meilleur buteur', texteButs(b.buts), absents.has(b.id)));
      if (p) lignes.push(await carteStat(p, p.ex ? 'Co-meilleur passeur' : 'Meilleur passeur', textePasses(p.passes), absents.has(p.id)));
    }
  }
  // Une star reste à l'écran (ses chiffres sont vrais) ; seule la mention « Absent » tombe si elle n'a pas de preuve récente.
  for (const j of lignes) {
    if (!j.absent) continue;
    const r = await fraicheurAbsent(infoAbsent.get(j.id) ?? { player_id: j.id }, e.id);
    if (r.fraiche) relevesAbsents.push({ id: j.id, ...r });
    else { j.absent = false; absentsRetires.push(`${j.usage} : ${r.preuve}`); }
  }
  if (lignes.length) joueurs.push({ equipe: e.nom, logo: e.logo, ligue: st.ligue, lignes });
}
const sortie = { titreJoueurs: prono ? 'Les joueurs clés' : 'Les stars', sousTitreJoueurs: prono ? 'Ceux qui peuvent faire la différence' : 'Leur saison en championnat', joueurs, controle: { absents: relevesAbsents, absentsRetires }, fixtureId: f.id, ligue, jour: `${jour} · heure de Paris`, heure, accroche: `${dom.nom}\u00A0– ${ext.nom}`, dom, ext, h2h, compos: prono ? [] : await composDuMatch(f.id, dom, ext, envoi) };
fs.writeFileSync(`data/avant-match-${id}.json`, JSON.stringify(sortie, null, 2));
console.log(sortie.accroche, heure, jour, '| forme', dom.forme.join(''), ext.forme.join(''), '| class', dom.classement, ext.classement, '| h2h', h2h, '|', sortie.compos.map((c) => `${c.equipe} : ${c.titre}, ${c.detail}`).join(' ; '));
for (const e of joueurs) for (const j of e.lignes) console.log(e.equipe, '|', j.role, '|', j.nom, '|', j.stat, '| absent', j.absent, '| photo', !!j.photo);
