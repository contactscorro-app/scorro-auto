// Outils partagés des préparateurs : appels au proxy (GET seulement), pagination complète, logos, noms.
import fs from 'node:fs';
import path from 'node:path';
export const PROXY = (process.env.SCORRO_PROXY ?? 'https://proxy-non-configure.invalid');
export async function get(chemin) {
  const r = await fetch(`${PROXY}/api/${chemin}`);
  if (!r.ok) throw new Error(`proxy ${r.status} sur ${chemin.split('?')[0]}`);
  return r.json();
}
// 🔴 Endpoints paginés et non triés : tout lire, ou refuser. Un classement incomplet est faux.
export async function toutesLesPages(chemin, plafond = 4) {
  const sep = chemin.includes('?') ? '&' : '?';
  const lignes = [];
  for (let page = 1; page <= plafond; page++) {
    const j = await get(`${chemin}${sep}per_page=50&page=${page}`);
    lignes.push(...(j.data ?? []));
    if (!j.pagination?.has_more) return lignes;
  }
  throw new Error(`plus de ${plafond} pages sur ${chemin.split('?')[0]}`);
}
export const noms = JSON.parse(fs.readFileSync('data/noms.json', 'utf8'));
export async function telecharger(url, chemin) {
  fs.mkdirSync(path.dirname(`public/${chemin}`), { recursive: true });
  const x = await fetch(url);
  if (!x.ok) throw new Error(`image ${x.status}`);
  fs.writeFileSync(`public/${chemin}`, Buffer.from(await x.arrayBuffer()));
}
export const de = (n) => (/^[aeiouyàâéèêîôû]/i.test(n) ? `d'${n}` : `de ${n}`);
export const rangFr = (n) => (n === 1 ? '1er' : `${n}e`);
export const FINIS = ['FT', 'AET', 'FT_PEN'];
export const instant = (f) => Date.parse(`${f.starting_at.replace(' ', 'T')}Z`);

// --- Lecture d'un match terminé (une seule règle pour Score final, Après-match, Après-journée) ---
const CODES_BUT = { goal: '', penalty: ' (sp)', owngoal: ' (csc)' };
// 🔴 Domicile/extérieur : meta.location, JAMAIS l'ordre du tableau. Buts ≠ score → pas de buteurs, rien plutôt que faux.
export function lireScore(f) {
  const equipe = (cote) => {
    const p = f.participants.find((x) => x.meta?.location === cote);
    if (!p) throw new Error(`pas d'équipe ${cote} sur ${f.id}`);
    const s = f.scores.find((x) => x.description === 'CURRENT' && x.score?.participant === cote);
    if (typeof s?.score?.goals !== 'number') throw new Error(`pas de score ${cote} sur ${f.id}`);
    return { id: p.id, nom: noms[p.id] ?? p.name, logo: `logos/${p.id}.png`, logoSrc: p.image_path, buts: s.score.goals };
  };
  const dom = equipe('home');
  const ext = equipe('away');
  const buts = (f.events ?? []).filter((e) => e.type?.code in CODES_BUT && !e.rescinded);
  const compte = (eq) => buts.filter((e) => e.participant_id === eq.id).length;
  const fiables = compte(dom) === dom.buts && compte(ext) === ext.buts;
  const min = (e) => `${e.minute}${e.extra_minute ? `+${e.extra_minute}` : ''}'${CODES_BUT[e.type.code]}`;
  const buteurs = (eq) => {
    if (!fiables) return [];
    const m = new Map();
    for (const e of [...buts].sort((a, b) => a.minute - b.minute || (a.extra_minute ?? 0) - (b.extra_minute ?? 0))) {
      if (e.participant_id !== eq.id) continue;
      m.set(e.player_name, [...(m.get(e.player_name) ?? []), min(e)]);
    }
    return [...m].map(([nom, minutes]) => ({ nom, minutes }));
  };
  dom.buteurs = buteurs(dom);
  ext.buteurs = buteurs(ext);
  const gagnant = dom.buts > ext.buts ? dom : ext.buts > dom.buts ? ext : null;
  // Recoupement du score, dans la même réponse : événements, cumul à la fin du temps réglementaire, phrase de résultat. Une seule source : Sportmonks.
  const raisons = [];
  if (!fiables) raisons.push(`événements ${compte(dom)}-${compte(ext)}, score ${dom.buts}-${ext.buts}`);
  if (f.state?.state === 'FT') {
    const fin = (c) => f.scores.find((x) => x.description === '2ND_HALF' && x.score?.participant === c)?.score?.goals;
    if (fin('home') !== dom.buts || fin('away') !== ext.buts) raisons.push(`fin du temps réglementaire ${fin('home')}-${fin('away')}, score ${dom.buts}-${ext.buts}`);
    const brut = (c) => f.participants.find((x) => x.meta?.location === c)?.name;
    const info = f.result_info ?? '';
    if (!info) raisons.push('phrase de résultat absente');
    else if (gagnant ? !info.includes(brut(gagnant === dom ? 'home' : 'away')) : !/draw/i.test(info)) raisons.push(`phrase de résultat : ${info}`);
  }
  return { dom, ext, fiables, gagnant, recoupe: { match: f.name, ok: raisons.length === 0, raisons } };
}
export async function logosDe(...equipes) {
  for (const e of equipes) await telecharger(e.logoSrc, e.logo);
}

// --- Classements buteurs/passeurs : calculés depuis les événements, RECOUPÉS avec /topscorers (logique de proxy/lib/aggTopscorers.js) ---
const FINIS_DEV = new Set(FINIS);
export async function lireClassements(saisonId) {
  const s = (await get(`sportmonks/seasons/${saisonId}?include=stages;fixtures.scores;fixtures.state;fixtures.events;fixtures.participants&filters=eventTypes:14,15,16`)).data;
  const qualifs = new Set((s.stages ?? []).filter((x) => x.type_id === 225).map((x) => x.id));
  const matchs = (s.fixtures ?? []).filter((f) => !qualifs.has(f.stage_id) && FINIS_DEV.has(f.state?.developer_name))
    .sort((a, b) => String(a.starting_at).localeCompare(String(b.starting_at)));
  const buts = new Map(), passes = new Map(), clubs = new Map();
  let sans = 0, comptes = 0;
  const ajoute = (t, id, nom, eq) => t.set(id, { id, n: (t.get(id)?.n ?? 0) + 1, nom: nom ?? t.get(id)?.nom, equipe: eq ?? t.get(id)?.equipe });
  for (const f of matchs) {
    for (const p of f.participants ?? []) clubs.set(p.id, p);
    const total = (f.scores ?? []).filter((x) => x.description === 'CURRENT').reduce((n, x) => n + (x.score?.goals ?? 0), 0);
    let nommes = 0;
    for (const e of f.events ?? []) {
      if (![14, 15, 16].includes(e.type_id)) continue;
      if (e.player_id != null) nommes++;
      if (e.type_id === 15 || e.player_id == null) continue; // le csc compte au score, jamais au buteur
      ajoute(buts, e.player_id, e.player_name, e.participant_id);
      if (e.related_player_id != null) ajoute(passes, e.related_player_id, e.related_player_name, e.participant_id);
    }
    comptes += total;
    sans += Math.max(0, total - nommes);
  }
  const lireAgg = async (type) => {
    const j = await get(`agg/topscorers?season=${saisonId}&type=${type}`);
    if (j.meta?.complete !== true) throw new Error(`agrégat ${type} incomplet`);
    for (const r of j.data ?? []) if (r.player) fiches.set(r.player_id, r.player);
    return new Map((j.data ?? []).map((r) => [r.player_id, r.total]));
  };
  const fiches = new Map();
  return { matchs: matchs.length, sans, comptes, clubs, buts, passes, aggButs: await lireAgg(208), aggPasses: await lireAgg(209), fiches, nomSaison: s.name, ligueId: s.league_id };
}
export const trier = (t) => [...t.values()].sort((a, b) => b.n - a.n);
// Top affiché : des groupes d'ex æquo ENTIERS, jamais plus de `max` lignes. Couper dans un ex æquo serait choisir au hasard.
export function topEntier(liste, max = 10) {
  const lignes = [];
  let i = 0;
  while (i < liste.length) {
    let j = i;
    while (j < liste.length && liste[j].n === liste[i].n) j++;
    if (lignes.length + (j - i) > max) break;
    const rang = i + 1;
    for (let k = i; k < j; k++) lignes.push({ ...liste[k], rang });
    i = j;
  }
  const n0 = liste[i]?.n;
  const suite = n0 == null ? null : { joueurs: liste.filter((x) => x.n === n0).length, n: n0 };
  return { lignes, suite };
}
// Tout écart entre événements et agrégat sur les lignes affichées (ou la suite) : on le nomme, et l'appelant refuse.
export function ecarts(lignes, agg, suite, liste) {
  const e = lignes.filter((l) => (agg.get(l.id) ?? 0) !== l.n).map((l) => `${l.nom} : événements ${l.n}, agrégat ${agg.get(l.id) ?? 0}`);
  const ids = new Set(lignes.map((l) => l.id));
  const seuil = suite?.n ?? 0;
  for (const [id, n] of agg) if (!ids.has(id) && n > seuil) e.push(`joueur ${id} : agrégat ${n}, absent du top événements`);
  return e;
}

// --- Noms et photos de joueurs : une seule règle pour tous les formats. ---
const corrections = JSON.parse(fs.readFileSync('data/corrections-noms.json', 'utf8'));
const mot = (m) => m.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');
const mots = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean);
const PARTICULES = new Set(['van', 'von', 'de', 'del', 'della', 'der', 'den', 'di', 'da', 'dos', 'das', 'do', 'la', 'le', 'el', 'al', 'bin', 'ben', 'ter', 'ten', 'mac', 'mc', 'san', 'santa']);
const SUFFIXE = /^(j[uú]nior|junior|jr\.?|filho|neto|sobrinho|sr\.?)$/i;
// Nom d'usage : display_name, sauf s'il est corrompu (≥ 2 mots, aucun en commun avec le vrai nom). Même règle que bestPlayerName dans l'app.
export function nomUsage(p) {
  const fixe = corrections[p.id]?.usage;
  if (fixe) return fixe;
  const d = mots(p.display_name).join(' '), vrai = mots(p.name).join(' ');
  if (!d) return vrai || mots(p.common_name).join(' ');
  if (!vrai || mots(d).length < 2) return d;
  const ref = new Set([...mots(vrai), ...mots(p.firstname), ...mots(p.lastname)].map(mot));
  if (mots(d).some((m) => ref.has(mot(m)))) return d;
  const c = mots(p.common_name);
  return c.some((m) => ref.has(mot(m))) ? c.join(' ') : vrai;
}
// Nom court (terrain, cartes). 2 mots : le dernier, sauf « Vinícius Júnior ». 3 mots et plus : la partie de display_name que common_name désigne
// comme patronyme (« E. Mayenda Dossou »), sinon le dernier bloc avec ses particules. Jamais le nom d'état civil de common_name seul.
export function nomCourt(p) {
  const fixe = corrections[p.id]?.court;
  if (fixe) return fixe;
  const u = mots(nomUsage(p));
  if (u.length <= 1) return u[0] ?? '';
  if (u.length === 2) return SUFFIXE.test(u[1]) ? u.join(' ') : u[1];
  const suite = u.slice(1), ref = new Set(mots(p.common_name).map(mot));
  const debut = suite.findIndex((m) => ref.has(mot(m)));
  if (debut >= 0) {
    let fin = suite.length - 1;
    while (!ref.has(mot(suite[fin]))) fin--;
    return suite.slice(debut, fin + 1).join(' ');
  }
  let i = u.length - 1;
  while (i > 1 && PARTICULES.has(mot(u[i - 1]))) i--;
  return u.slice(i).join(' ');
}
const initiales = (p) => { const u = mots(nomUsage(p)); return (u.length > 1 ? u[0][0] + u[u.length - 1][0] : u[0]?.[0] ?? '').toUpperCase(); };
// Photo Sportmonks ; pas de photo (image générique ou téléchargement raté) : null, et l'écran affiche les initiales.
export async function photoDe(p) {
  if (!p?.image_path || /placeholder/.test(p.image_path)) return null;
  const chemin = `joueurs/${p.id}.png`;
  try { await telecharger(p.image_path, chemin); return chemin; } catch { return null; }
}
export const carteJoueur = async (p) => ({ id: p.id, nom: nomCourt(p), usage: nomUsage(p), ini: initiales(p), photo: await photoDe(p) });

// --- Compos : predictedLineups si 22 joueurs, sinon DERNIER ONZE ALIGNÉ, nommé tel quel. Jamais présenté comme probable. ---
const enLignes = async (joueurs) => {
  const parLigne = new Map();
  for (const j of joueurs) {
    const m = /^(\d+):(\d+)$/.exec(j.formation_field ?? '');
    if (!m) return null;
    const c = await carteJoueur(j.player ?? { id: j.player_id, display_name: j.player_name });
    parLigne.set(+m[1], [...(parLigne.get(+m[1]) ?? []), { ...c, col: +m[2] }]);
  }
  return [...parLigne].sort((a, b) => a[0] - b[0]).map(([, v]) => v.sort((a, b) => a.col - b.col));
};
const formationDe = (l) => l.slice(1).map((x) => x.length).join('-');
const dernierOnze = async (equipe, envoi) => {
  const debut = new Date(envoi - 60 * 86400000).toISOString().slice(0, 10), fin = new Date(envoi).toISOString().slice(0, 10);
  const ms = await toutesLesPages(`sportmonks/fixtures/between/${debut}/${fin}/${equipe}?include=state;participants`);
  const d = ms.filter((m) => FINIS.includes(m.state?.state) && instant(m) < envoi).sort((a, b) => instant(b) - instant(a))[0];
  if (!d) return null;
  const f = (await get(`sportmonks/fixtures/${d.id}?include=lineups.player`)).data;
  const onze = (f.lineups ?? []).filter((x) => x.team_id === equipe && x.type_id === 11);
  if (onze.length !== 11) return null;
  const adv = d.participants.find((x) => x.id !== equipe);
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(instant(d)).replace(/^1 /, '1er ');
  return { onze, contre: noms[adv?.id] ?? adv?.name, date };
};
export async function composDuMatch(fixtureId, dom, ext, envoi) {
  const f = (await get(`sportmonks/fixtures/${fixtureId}?include=predictedLineups.player`)).data;
  const pred = f.predictedlineups ?? [];
  const sortie = [];
  for (const e of [dom, ext]) {
    const siens = pred.filter((x) => x.team_id === e.id);
    const probable = pred.length === 22 && siens.length === 11;
    const d = probable ? null : await dernierOnze(e.id, envoi);
    const l = await enLignes(probable ? siens : d?.onze ?? []);
    if (!l || !l.length) { console.log(`⚠️ pas de compo lisible pour ${e.nom}`); continue; }
    sortie.push({
      affiche: `${dom.nom} – ${ext.nom}`, equipe: e.nom, logo: e.logo, lignes: l,
      titre: probable ? 'Compo probable' : 'Dernier onze aligné',
      detail: probable ? `${formationDe(l)} · estimation, pas officielle` : `${formationDe(l)} · contre ${d.contre}, ${d.date}`,
    });
  }
  return sortie;
}

// --- Stars et joueurs clés d'une équipe : championnat en cours, depuis les événements, recoupé avec /topscorers, joueurs encore dans l'effectif. ---
const classementsParSaison = new Map();
const classementsDe = async (saison) => {
  if (!classementsParSaison.has(saison)) classementsParSaison.set(saison, await lireClassements(saison));
  return classementsParSaison.get(saison);
};
export { classementsDe };
const nb = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
export async function statsEquipe(equipeId) {
  const t = (await get(`sportmonks/teams/${equipeId}?include=activeSeasons.league`)).data;
  const saisons = (t.activeseasons ?? []).filter((x) => x.league?.sub_type === 'domestic');
  if (saisons.length !== 1) { console.log(`⚠️ ${t.name} : ${saisons.length} championnat(s) actif(s), pas de stats`); return null; }
  const c = await classementsDe(saisons[0].id);
  if (c.sans >= 5 && c.sans > c.comptes * 0.01) { console.log(`⚠️ ${saisons[0].league.name} : ${c.sans} buts sans buteur, pas de stats`); return null; }
  const effectif = new Map(((await get(`sportmonks/squads/teams/${equipeId}?include=player`)).data ?? []).map((x) => [x.player_id, x.player]));
  const ids = new Set([...c.buts.values(), ...c.passes.values()].filter((x) => x.equipe === equipeId).map((x) => x.id));
  const joueurs = [...ids].filter((id) => effectif.has(id)).map((id) => ({ id, p: effectif.get(id), buts: c.buts.get(id)?.n ?? 0, passes: c.passes.get(id)?.n ?? 0, aggB: c.aggButs.get(id) ?? 0, aggP: c.aggPasses.get(id) ?? 0 }));
  return { ligue: saisons[0].league.name, saison: saisons[0].name, joueurs, c, equipeId };
}
// Le meilleur selon `cle` ; ex æquo départagés par l'autre stat puis le nom, et annoncés comme tels. Tout écart événements/agrégat près du sommet : rien.
export function meilleur(st, cle, autre) {
  const liste = st.joueurs.filter((j) => j[cle] > 0).sort((a, b) => b[cle] - a[cle] || b[autre] - a[autre] || nomCourt(a.p).localeCompare(nomCourt(b.p), 'fr'));
  if (!liste.length) return null;
  const haut = liste[0][cle], agg = cle === 'buts' ? 'aggB' : 'aggP';
  const fautif = liste.filter((j) => j[cle] >= haut - 1 && j[cle] !== j[agg]);
  if (fautif.length) { console.log(`🔴 ${st.ligue} ${cle} : écart ${fautif.map((j) => `${nomCourt(j.p)} ${j[cle]}/${j[agg]}`).join(', ')}`); return null; }
  return { ...liste[0], ex: liste.filter((j) => j[cle] === haut).length > 1 };
}
export const carteStat = async (j, role, stat, absent) => ({ ...(await carteJoueur(j.p)), role, stat, absent: !!absent });
export const texteButs = (n) => nb(n, 'but', 'buts');
export const textePasses = (n) => nb(n, 'passe décisive', 'passes décisives');

// --- Blessures : Sportmonks ne donne aucune date de mise à jour. La preuve de fraîcheur : début de moins de 7 jours, ou présence sur la liste d'un match de l'équipe joué depuis moins de 7 jours. ---
const listesRecentes = new Map();
export async function fraicheurAbsent(d, equipeId, maintenant = Date.now()) {
  const SEPT = 7 * 86400000;
  if (d.start_date && maintenant - Date.parse(`${d.start_date}T12:00:00Z`) < SEPT) return { fraiche: true, preuve: `début le ${d.start_date}` };
  if (!listesRecentes.has(equipeId)) {
    const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    const ms = await toutesLesPages(`sportmonks/fixtures/between/${iso(maintenant - SEPT)}/${iso(maintenant)}/${equipeId}?include=state;sidelined`);
    listesRecentes.set(equipeId, ms.filter((m) => FINIS.includes(m.state?.state) && maintenant - instant(m) < SEPT));
  }
  const m = listesRecentes.get(equipeId).find((x) => (x.sidelined ?? []).some((s) => s.player_id === d.player_id));
  return m ? { fraiche: true, preuve: `liste du match du ${m.starting_at.slice(0, 10)}` } : { fraiche: false, preuve: 'aucune liste de moins de 7 jours' };
}
// Ne garde que les absents prouvés (preuve de moins de 7 jours), jusqu'à `max` ; les autres sont rendus à part pour être notés. Un absent sans preuve n'apparaît nulle part à l'écran.
export async function absentsProuves(liste, preuve, max) {
  const gardes = [], retires = [];
  for (const a of liste) {
    if (gardes.length >= max) break;
    const r = await preuve(a);
    if (r.fraiche) gardes.push({ ...a, releve: r });
    else retires.push({ ...a, releve: r });
  }
  return { gardes, retires };
}
