// Usage : node scripts/preparer-format.mjs <top5|duel|serie|trois|carte> [leagueId=301]
// Données des 6 nouveaux formats (planning validé le 22/11, rapports/planning-formats-2026-11-23.md). GET seulement, via le proxy.
// 🔴 Rien plutôt que faux : un score non recoupé, un écart avec /topscorers, une stat absente → AUCUN fichier écrit (erreur).
import fs from 'node:fs';
import { get, lireClassements, noms, nomUsage, carteJoueur, telecharger, ecarts, topEntier, trier, FINIS } from './commun.mjs';
const [format, ligueArg] = process.argv.slice(2);
const ligueId = Number(ligueArg ?? 301);
const LIGUES5 = [301, 8, 564, 384, 82];
const auJour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date()).replace(/^1 /, '1er ');
const saisonDe = async (id) => { const l = (await get(`sportmonks/leagues/${id}?include=currentSeason`)).data; return { l, s: l.currentseason?.id ?? l.currentSeason?.id }; };
const ecrire = (nom, d) => { fs.writeFileSync(`data/format-${nom}.json`, JSON.stringify(d, null, 2)); console.log(`data/format-${nom}.json`); };
const ligueInfo = async (l) => { const logo = `logos/ligue-${l.id}.png`; await telecharger(l.image_path, logo); return { id: l.id, nom: l.name, logo }; };

// Matchs terminés de la saison, chacun recoupé (événements, fin du temps réglementaire, phrase de résultat). Un seul raté : refus.
async function resultats(saisonId) {
  const s = (await get(`sportmonks/seasons/${saisonId}?include=stages;fixtures.scores;fixtures.state;fixtures.events;fixtures.participants&filters=eventTypes:14,15,16`)).data;
  const qualifs = new Set((s.stages ?? []).filter((x) => x.type_id === 225).map((x) => x.id));
  const fs_ = (s.fixtures ?? []).filter((f) => !qualifs.has(f.stage_id) && FINIS.includes(f.state?.developer_name ?? f.state?.state)).sort((a, b) => String(a.starting_at).localeCompare(String(b.starting_at)));
  const out = [];
  for (const f of fs_) {
    // Recoupement : score final = buts des événements (types 14, 15, 16, non annulés) ; au temps réglementaire (FT), = cumul de la 2e mi-temps.
    const eq = (cote) => {
      const p = f.participants.find((x) => x.meta?.location === cote);
      const b = f.scores.find((x) => x.description === 'CURRENT' && x.score?.participant === cote)?.score?.goals;
      if (!p || typeof b !== 'number') throw new Error(`score absent sur ${f.name}`);
      return { id: p.id, nom: noms[p.id] ?? p.name, logo: `logos/${p.id}.png`, logoSrc: p.image_path, buts: b };
    };
    const dom = eq('home'), ext = eq('away');
    const ev = (id) => (f.events ?? []).filter((e) => [14, 15, 16].includes(e.type_id) && !e.rescinded && e.participant_id === id).length;
    const mi2 = (c) => f.scores.find((x) => x.description === '2ND_HALF' && x.score?.participant === c)?.score?.goals;
    if (ev(dom.id) !== dom.buts || ev(ext.id) !== ext.buts) throw new Error(`score non recoupé, ${f.name} : événements ${ev(dom.id)}-${ev(ext.id)}, score ${dom.buts}-${ext.buts}`);
    if ((f.state?.developer_name ?? f.state?.state) === 'FT' && (mi2('home') !== dom.buts || mi2('away') !== ext.buts)) throw new Error(`score non recoupé, ${f.name} : 2e mi-temps ${mi2('home')}-${mi2('away')}`);
    out.push({ id: f.id, date: f.starting_at, dom, ext });
  }
  return out;
}
const parEquipe = (ms) => {
  const t = new Map();
  for (const m of ms) for (const [moi, lui] of [[m.dom, m.ext], [m.ext, m.dom]]) {
    const res = moi.buts > lui.buts ? 'V' : moi.buts < lui.buts ? 'D' : 'N';
    t.set(moi.id, [...(t.get(moi.id) ?? []), { res, pour: moi.buts, contre: lui.buts, adv: lui.nom, equipe: moi }]);
  }
  return t;
};

if (format === 'top5' || format === 'duel') {
  // Top 5 buteurs (même source et même recoupement que la vidéo classement) ; le duel oppose le n°1 et le n°2.
  const { l, s } = await saisonDe(ligueId);
  const c = await lireClassements(s);
  if (c.sans >= 5 && c.sans > c.comptes * 0.01) throw new Error(`${c.sans} buts sans buteur : refus`);
  // Top 5 : groupes d'ex æquo entiers, jusqu'à 6 lignes (ex. 3 joueurs à égalité à la 4e place) ; le duel prend les 2 premiers.
  const { lignes, suite } = topEntier(trier(c.buts), format === 'top5' ? 6 : 5);
  const faux = ecarts(lignes, c.aggButs, suite);
  if (faux.length) throw new Error(`ÉCART avec /topscorers : ${faux.join(' ; ')}`);
  const ligue = await ligueInfo(l);
  if (format === 'top5') {
    const top = [];
    for (const x of lignes) { await telecharger(c.clubs.get(x.equipe).image_path, `logos/${x.equipe}.png`); top.push({ ...(await carteJoueur(c.fiches.get(x.id) ?? { id: x.id, display_name: x.nom, name: x.nom })), rang: x.rang, n: x.n, club: noms[x.equipe] ?? c.clubs.get(x.equipe).name, logo: `logos/${x.equipe}.png` }); }
    if (top.length < 5) throw new Error(`top 5 impossible sans couper un ex æquo (${top.length} lignes entières)`);
    ecrire(`top5-${ligueId}`, { format: 'top5', ligue, accroche: 'Qui est le n°1 ?', sousTitre: `Top 5 buteurs · après ${c.matchs} matchs, au ${auJour}`, top, legende: `Top 5 buteurs, ${l.name}, au ${auJour}. Tu l'avais vu venir ?` });
  } else {
    // 24/11 (plan d'amélioration) : le duel le plus DISPUTÉ parmi les 4 premiers (stats les plus partagées), plus seulement n°1 contre n°2.
    const cands = lignes.slice(0, 4);
    const stat = async (x) => {
      const p = (await get(`sportmonks/players/${x.id}?include=statistics.details.type&filters=playerStatisticSeasons:${s}`)).data;
      const det = Object.fromEntries((p.statistics ?? []).filter((y) => y.season_id === s).flatMap((y) => y.details ?? []).map((y) => [y.type?.code, y.value]));
      const buts = det.goals?.total, passes = det.assists?.total ?? 0, min = det['minutes-played']?.total, cadres = det['shots-on-target']?.total, note = det.rating?.average, matchs = det.appearances?.total;
      if (buts !== x.n) throw new Error(`${nomUsage(p)} : ${buts} buts dans ses stats, ${x.n} dans les événements : pas de duel`);
      if ([min, cadres, note, matchs].some((v) => typeof v !== 'number')) throw new Error(`${nomUsage(p)} : stat absente, pas de duel`);
      await telecharger(c.clubs.get(x.equipe).image_path, `logos/${x.equipe}.png`);
      return { ...(await carteJoueur(p)), club: noms[x.equipe] ?? c.clubs.get(x.equipe).name, logo: `logos/${x.equipe}.png`, stats: { buts, passes, matchs, minParBut: Math.round(min / Math.max(1, buts)), cadres, note: Math.round(note * 100) / 100 } };
    };
    const fiches = [];
    for (const x of cands) { try { fiches.push(await stat(x)); } catch (e) { console.log(`duel : ${e.message}`); } }
    if (fiches.length < 2) throw new Error('moins de 2 joueurs avec des stats complètes : pas de duel');
    const LIGNES = [['Buts', 'buts', true], ['Passes décisives', 'passes', true], ['Minutes par but', 'minParBut', false], ['Tirs cadrés', 'cadres', true], ['Note moyenne', 'note', true]];
    const gagne = (A, B, k, plus) => (A.stats[k] === B.stats[k] ? 0 : (A.stats[k] > B.stats[k]) === plus ? 1 : 2);
    let best = null;
    for (let i = 0; i < fiches.length; i++) for (let j = i + 1; j < fiches.length; j++) {
      const g = LIGNES.map(([, k, plus]) => gagne(fiches[i], fiches[j], k, plus)), ecart = Math.abs(g.filter((x) => x === 1).length - g.filter((x) => x === 2).length);
      if (!best || ecart < best.ecart) best = { ecart, A: fiches[i], B: fiches[j] };
    }
    const { A, B } = best;
    const lignesDuel = [['Buts', 'buts', true], ['Passes décisives', 'passes', true], ['Minutes par but', 'minParBut', false], ['Tirs cadrés', 'cadres', true], ['Note moyenne', 'note', true]].map(([label, k, plus]) => ({ label, a: A.stats[k], b: B.stats[k], gagne: A.stats[k] === B.stats[k] ? 0 : (A.stats[k] > B.stats[k]) === plus ? 1 : 2 }));
    ecrire(`duel-${ligueId}`, { format: 'duel', ligue, accroche: `${A.nom} ou ${B.nom} ?`, sousTitre: `${l.name} · au ${auJour}`, a: A, b: B, lignes: lignesDuel, question: 'Tu prends qui ?', legende: `${A.usage} ou ${B.usage} ? Les stats de la saison en ${l.name}, au ${auJour}. Tu prends qui ?` });
  }
} else if (format === 'serie' || format === 'trois') {
  const { l, s } = await saisonDe(ligueId);
  const ms = await resultats(s);
  const t = parEquipe(ms);
  const ligue = await ligueInfo(l);
  if (format === 'serie') {
    // La plus longue série EN COURS : victoires, puis matchs sans défaite, puis défaites. Au moins 4 matchs, sinon pas de vidéo.
    const cands = [];
    for (const [id, l_] of t) {
      const fin = (ok) => { let n = 0; for (let i = l_.length - 1; i >= 0 && ok(l_[i].res); i--) n++; return n; };
      cands.push({ id, equipe: l_[0].equipe, v: fin((r) => r === 'V'), i: fin((r) => r !== 'D'), d: fin((r) => r === 'D'), liste: l_ });
    }
    const choix = [['v', 'victoires d\'affilée'], ['d', 'défaites d\'affilée'], ['i', 'matchs sans défaite']].map(([k, txt]) => ({ k, txt, c: [...cands].sort((a, b) => b[k] - a[k])[0] })).filter((x) => x.c[x.k] >= 4).sort((a, b) => b.c[b.k] - a.c[a.k])[0];
    if (!choix) throw new Error('aucune série en cours de 4 matchs ou plus : pas de vidéo');
    const e = choix.c; await telecharger(e.equipe.logoSrc, e.equipe.logo);
    const n = e[choix.k], derniers = e.liste.slice(-Math.max(n, 6));
    ecrire(`serie-${ligueId}`, { format: 'serie', ligue, accroche: `${n} ${choix.txt}`, equipe: { id: e.id, nom: e.equipe.nom, logo: e.equipe.logo }, n, type: choix.k, texte: choix.txt, matchs: derniers.map((m) => ({ res: m.res, score: `${m.pour}-${m.contre}`, adv: m.adv })), question: 'Il se passe quoi ?', sousTitre: `${l.name} · série en cours au ${auJour}`, legende: `${e.equipe.nom} : ${n} ${choix.txt} en ${l.name}. Il se passe quoi ? (série en cours au ${auJour})` });
  } else {
    // « 3 changements » version données : le club dont les points par match ont le plus progressé sur ses 5 derniers matchs, et 3 chiffres avant / après.
    const res = [];
    for (const [id, l_] of t) {
      if (l_.length < 9) continue;
      const av = l_.slice(0, -5), ap = l_.slice(-5);
      const pts = (x) => x.reduce((s_, m) => s_ + (m.res === 'V' ? 3 : m.res === 'N' ? 1 : 0), 0) / x.length;
      const moy = (x, k) => x.reduce((s_, m) => s_ + m[k], 0) / x.length;
      res.push({ id, equipe: l_[0].equipe, gain: pts(ap) - pts(av), stats: [['Points par match', pts(av), pts(ap), true], ['Buts marqués par match', moy(av, 'pour'), moy(ap, 'pour'), true], ['Buts encaissés par match', moy(av, 'contre'), moy(ap, 'contre'), false]], nav: av.length });
    }
    const best = res.sort((a, b) => b.gain - a.gain)[0];
    if (!best || best.gain < 0.5) throw new Error('aucun club n\'a vraiment changé (gain < 0,5 point par match) : pas de vidéo');
    await telecharger(best.equipe.logoSrc, best.equipe.logo);
    const r1 = (x) => Math.round(x * 10) / 10;
    ecrire(`trois-${ligueId}`, { format: 'trois', ligue, accroche: `${best.equipe.nom} a changé`, equipe: { id: best.id, nom: best.equipe.nom, logo: best.equipe.logo }, sousTitre: `5 derniers matchs contre les ${best.nav} d'avant · ${l.name}`, points: best.stats.map(([label, a, b, plus]) => ({ label, avant: r1(a), apres: r1(b), mieux: plus ? b > a : b < a })), question: 'Ça va durer ?', legende: `${best.equipe.nom} en ${l.name} : 3 chiffres qui ont changé sur les 5 derniers matchs. Ça va durer ?` });
  }
} else if (format === 'carte') {
  // Joueurs marocains, algériens et tunisiens des 5 grands championnats (effectifs de la saison) : nombre de joueurs, buts et passes (événements des matchs).
  const PAYS = { Morocco: { nom: 'Maroc', code: 'MA' }, Algeria: { nom: 'Algérie', code: 'DZ' }, Tunisia: { nom: 'Tunisie', code: 'TN' } };
  const tot = Object.fromEntries(Object.values(PAYS).map((p) => [p.code, { ...p, joueurs: 0, buts: 0, passes: 0, meilleur: null }]));
  const vus = new Set();
  for (const id of LIGUES5) {
    const { s } = await saisonDe(id);
    const c = await lireClassements(s);
    if (c.sans >= 5 && c.sans > c.comptes * 0.01) throw new Error(`ligue ${id} : ${c.sans} buts sans buteur, refus`);
    for (const club of c.clubs.values()) {
      const sq = await get(`sportmonks/squads/seasons/${s}/teams/${club.id}?include=player.nationality`);
      for (const x of sq.data ?? []) {
        const pays = PAYS[x.player?.nationality?.name];
        if (!pays) continue;
        const t_ = tot[pays.code], b = c.buts.get(x.player_id)?.n ?? 0, p = c.passes.get(x.player_id)?.n ?? 0;
        if (!vus.has(x.player_id)) t_.joueurs++; // un joueur transféré en cours de saison n'est compté qu'une fois
        vus.add(x.player_id); t_.buts += b; t_.passes += p;
        if (b > (t_.meilleur?.buts ?? -1)) t_.meilleur = { nom: nomUsage(x.player), buts: b, club: club.name };
      }
    }
  }
  if (Object.values(tot).some((x) => x.joueurs === 0)) throw new Error('un pays sans aucun joueur : données douteuses, pas de vidéo');
  ecrire('carte-maghreb', { format: 'carte', accroche: 'Le Maghreb en Europe', sousTitre: `5 grands championnats · nationalité Sportmonks · au ${auJour}`, pays: Object.values(tot), question: 'Quel pays fait le plus fort ?', legende: `Joueurs marocains, algériens et tunisiens dans les 5 grands championnats : combien, et combien de buts ? (au ${auJour}) Quel pays fait le plus fort ?` });
} else throw new Error('format inconnu');
