// Quelles vidéos sont dues, et quand les publier ? Fonction PURE (ni réseau ni fichier) : testable.
// Chaque tâche porte : poids (gros match > petit > journée > classement), de (premier instant permis), jusqu (dernier instant utile).
export const HEURE = 3600000;
export const MIN = 60000;
const FINIS = new Set(['FT', 'AET', 'FT_PEN']);
const pariss = (ms, o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(ms);
export const jourParis = (ms) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(ms);
export const heureParis = (ms) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(ms).replace(/\D/g, '')) % 24;
export const hhmmParis = (ms) => pariss(ms, { hour: '2-digit', minute: '2-digit' });
const joursEcart = (a, b) => Math.round((Date.parse(`${jourParis(b)}T12:00:00Z`) - Date.parse(`${jourParis(a)}T12:00:00Z`)) / (24 * HEURE));
const semaine = (ms) => { const d = new Date(Date.parse(`${jourParis(ms)}T12:00:00Z`)); const j = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - j); return d.toISOString().slice(0, 10); };
// Prochain 8 h (Paris) à partir de ms, si ms tombe entre 0 h et 8 h ; sinon ms.
export function apres8h(ms) {
  if (heureParis(ms) >= 8) return ms;
  let t = ms;
  while (heureParis(t) < 8) t += 10 * MIN;
  return Math.floor(t / (60 * MIN)) * 60 * MIN;
}

export const poidsDe = { gros: 3, petit: 2, journee: 1.5, classement: 1 };
export function estGros(m, cfg) {
  const equipes = [m.dom, m.ext];
  const dans = (liste) => equipes.some((e) => (liste ?? []).includes(e));
  const elargi = jourParis(m.debut) >= (cfg.elargiDepuis ?? '0000-00-00'); // la liste élargie ne s'applique qu'à partir de cette date
  if (elargi && dans(cfg.clubsGros)) return true;
  if (m.ligue === 301 && dans(cfg.clubsPrioritaires)) return true;
  if (coupesDe(cfg).includes(m.ligue) && dans(cfg.clubsC1)) return true;
  return (cfg.derbys ?? []).some(([a, b]) => equipes.includes(a) && equipes.includes(b));
}

// Plafond de vidéos par jour : chaque match suivi coûte 2 vidéos (avant + après). On garde, par jour de coup d'envoi, les plus gros :

// ───────── Règle de cohérence : chaque « avant » a son « après », et l'inverse. On planifie donc des PAIRES. ─────────
// Paires : un match (avant-match + après-match), une journée de championnat (avant-journée + récap), une soirée de C1 (avant-soirée + après-soirée).
// Le plafond par jour se compte en moitiés de paires ; si on doit couper, on coupe une paire entière, jamais une moitié.
const REPORTES = new Set(['POSTPONED', 'CANCELLED', 'SUSPENDED', 'ABANDONED']);
const FINS = FINIS;
const pad = (n) => String(n).padStart(2, '0');
// Instant (ms) de l'heure locale `h` (Paris) du jour `jour` (AAAA-MM-JJ).
export function parisA(jour, h) {
  let t = Date.parse(`${jour}T${pad(h)}:00:00Z`) - HEURE;
  for (let i = 0; i < 4; i++) { const d = (h - heureParis(t)) * HEURE + (jourParis(t) === jour ? 0 : (jourParis(t) < jour ? 24 : -24) * HEURE); if (!d) break; t += d; }
  return t;
}
const jourPlus = (jour, n) => jourParis(Date.parse(`${jour}T12:00:00Z`) + n * 24 * HEURE);
const FIN_MATCH = 115 * MIN; // fin estimée : coup d'envoi + 1 h 55
// Prochain instant où l'on peut publier (rien entre 0 h et 8 h ; exception : après-match d'un gros match jusqu'à 1 h).
const hors = (t, exception = false) => (exception && heureParis(t) < 1 ? t : apres8h(t));
// Plafond du jour : 12 en semaine, 16 le samedi et le dimanche (cfg.maxParJourWeekend).
export const capDuJour = (cfg, jour) => ([0, 6].includes(new Date(`${jour}T12:00:00Z`).getUTCDay()) ? cfg.maxParJourWeekend ?? cfg.maxParJour ?? 12 : cfg.maxParJour ?? 12);
// Score d'importance d'un match : clubs prioritaires des DEUX côtés (choc > un seul), derby, affiche de C1, haut de tableau et écart au classement.
export const SEUIL_GROS = 60;
export function importance(m, cfg) {
  const mienne = new Set(cfg.clubsPrioritaires ?? cfg.clubsLigue1 ?? []); // la liste de l'éditeur pèse plus
  const autres = new Set([...(cfg.clubsGros ?? []), ...(coupesDe(cfg).includes(m.ligue) ? cfg.clubsC1 ?? [] : [])]);
  const pts = (c) => (mienne.has(c) ? 40 : autres.has(c) ? 30 : 0);
  const a = pts(m.dom), b = pts(m.ext);
  let s = a + b + (a && b ? 20 : 0);
  if ((cfg.derbys ?? []).some(([x, y]) => [m.dom, m.ext].includes(x) && [m.dom, m.ext].includes(y))) s += 40;
  if (coupesDe(cfg).includes(m.ligue)) s += 50;
  if (m.posDom && m.posExt && m.nEq) s += 10 * (1 - (m.posDom + m.posExt) / (2 * m.nEq)) + 5 * (1 - Math.abs(m.posDom - m.posExt) / m.nEq);
  return Math.round(s * 10) / 10;
}
// Niveau 1 : 5 grands championnats + coupes d'Europe (C1, Europa League, Conference League). Niveau 2 : autres championnats européens, seulement s'il reste des créneaux. Niveau 3 : hors Europe, en pause.
export const coupesDe = (cfg) => cfg.coupesEurope ?? [cfg.c1];
export const ORDRE_LIGUES = [2, 301, 8, 564, 384, 82, 860, 944, 830];
const jourSemaine = (jour) => new Date(`${jour}T12:00:00Z`).getUTCDay();

export function planifier(matchs, cfg, engages = new Set()) {
  const jourDebut = cfg.debutPublication ?? '1970-01-01';
  const apresDebut = (m) => jourParis(m.debut) >= jourDebut;
  const conf = { ...cfg, clubsPrioritaires: cfg.clubsPrioritaires ?? cfg.clubsLigue1 };
  const gros = (m) => estGros(m, conf);
  const suivi = (m) => cfg.championnats.includes(m.ligue) || (cfg.liguesNiveau2 ?? []).includes(m.ligue) || coupesDe(cfg).includes(m.ligue) || ((cfg.liguesGrosSeulement ?? []).includes(m.ligue) && jourParis(m.debut) >= (cfg.elargiDepuis ?? '0000-00-00') && gros(m));
  const ligueRonde = (m) => cfg.championnats.includes(m.ligue) || coupesDe(cfg).includes(m.ligue) || (cfg.liguesGrosSeulement ?? []).includes(m.ligue);
  const nMatchs = cfg.matchsParJour ?? 5;
  const usage = new Map();
  const use = (j) => usage.get(j) ?? 0;
  // Places réservées aux vidéos hors paires : fonctionnalité (mardi, jeudi, samedi), top buteurs (lundi).
  const reserve = (j) => ([2, 4, 6].includes(jourSemaine(j)) ? 1 : 0) + (jourSemaine(j) === 1 ? 1 : 0);
  const libre = (j, n = 1) => use(j) + reserve(j) + n <= capDuJour(cfg, j);
  const prendre = (jours) => { for (const j of jours) usage.set(j, use(j) + 1); };
  const peutPrendre = (jours) => { const par = new Map(); for (const j of jours) par.set(j, (par.get(j) ?? 0) + 1); return [...par].every(([j, n]) => libre(j, n)); };

  const idx = (m) => Math.min(...[m.dom, m.ext].map((c) => { const i = (cfg.clubsGros ?? []).indexOf(c); return i < 0 ? 999 : i; }));
  const idxC1 = (m) => Math.min(...[m.dom, m.ext].map((c) => { const i = (cfg.clubsC1 ?? []).indexOf(c); return i < 0 ? 999 : i; }));
  const derby = (m) => (cfg.derbys ?? []).some(([a, b]) => [m.dom, m.ext].includes(a) && [m.dom, m.ext].includes(b));
  const rang = (m) => (derby(m) || coupesDe(cfg).includes(m.ligue) ? 0 : m.ligue === 301 && estGros(m, { ...conf, clubsGros: [] }) ? 1 : gros(m) ? 2 : m.ligue === 301 ? 3 : 4);

  // Paires de match.
  const pm = matchs.filter((m) => suivi(m) && apresDebut(m)).map((m) => {
    const g = gros(m);
    const avantDe = hors(m.debut - (g ? 5 : 2) * HEURE);
    const fin = m.debut + FIN_MATCH;
    const apresDe = hors(g ? fin : fin + 10 * MIN, g);
    return { type: 'match', cle: `match-${m.id}`, m, rang: rang(m), score: importance(m, conf), jours: [jourParis(avantDe), jourParis(apresDe)], jourMatch: jourParis(m.debut), niveau2: (cfg.liguesNiveau2 ?? []).includes(m.ligue) };
  });
  const cleTri = (a, b) => b.score - a.score || a.m.debut - b.m.debut || a.m.id - b.m.id; // les plus gros scores d'abord, quelle que soit l'heure
  const clubsJour = new Map(), nbJour = new Map(), prisJour = new Map();
  const accepter = (p, compterClubs = true) => {
    const j = p.jourMatch, clubs = clubsJour.get(j) ?? new Set(), pris = prisJour.get(j) ?? [];
    if ((nbJour.get(j) ?? 0) >= nMatchs) return false;
    if (compterClubs && [p.m.dom, p.m.ext].some((c) => clubs.has(c))) return false;
    if (p.score < SEUIL_GROS && pris.filter((q) => Math.abs(q.m.debut - p.m.debut) <= 30 * MIN).length >= 3) return false;
    if (!peutPrendre(p.jours)) return false;
    prendre(p.jours); clubs.add(p.m.dom); clubs.add(p.m.ext); clubsJour.set(j, clubs); nbJour.set(j, (nbJour.get(j) ?? 0) + 1); pris.push(p); prisJour.set(j, pris);
    return true;
  };

  // Paires de journée (championnats) et de soirée (C1).
  const parRonde = new Map();
  for (const m of matchs) if (m.round && ligueRonde(m) && apresDebut(m)) parRonde.set(m.round, [...(parRonde.get(m.round) ?? []), m]);
  const pj = [];
  const coherence = cfg.coherenceDepuis ?? '0000-00-00'; // les journées déjà commencées avant cette date n'ont pas d'avant-journée
  const groupes = [];
  for (const [round, ms] of parRonde) {
    if (coupesDe(cfg).includes(ms[0].ligue)) {
      const jours = new Map();
      for (const m of ms) jours.set(jourParis(m.debut), [...(jours.get(jourParis(m.debut)) ?? []), m]);
      for (const [j, g] of jours) if (g.length >= 2) groupes.push({ round, ms: g, jour: j, c1: true });
    } else if (cfg.apresJournee.includes(ms[0].ligue)) groupes.push({ round, ms, jour: null, c1: false });
  }
  for (const g of groupes) {
    const joues = g.ms.filter((m) => !REPORTES.has(m.etat));
    if (!joues.length || g.ms.length - joues.length > 1) continue;
    const F = Math.min(...joues.map((m) => m.debut)), L = Math.max(...joues.map((m) => m.debut));
    const jF = jourParis(F);
    const avantDe = g.c1 || heureParis(F) >= 18 ? parisA(jF, g.c1 ? 10 : 9) : parisA(jourPlus(jF, -1), 12);
    const avantFin = F - 60 * MIN;
    const apresDe = hors(L + FIN_MATCH + 60 * MIN);
    const cle = g.c1 ? `soiree-${g.round}-${g.jour}` : `journee-${g.round}`;
    const grand = (cfg.grandsChampionnats ?? [301, 8, 564, 384, 82]).includes(g.ms[0].ligue) && !g.c1;
    const avecAvant = grand ? true : jF >= coherence && avantDe < avantFin; // grands championnats : toujours un avant-journée, même si la journée a déjà commencé (matchs restants)
    pj.push({ type: g.c1 ? 'soiree' : 'journee', cle, round: g.round, jour: g.jour, ligue: g.ms[0].ligue, grand, avantDe, avantFin, apresDe, F, L, avecAvant, jours: avecAvant ? [jourParis(avantDe), jourParis(apresDe)] : [jourParis(apresDe)] });
  }

  const retenus = new Set(), pairesRetenues = new Set(), liste = [];
  // 1. Paires déjà engagées (avant publié) : toujours gardées, leur après est garanti.
  for (const p of pm) if (engages.has(p.cle)) { prendre(p.jours); retenus.add(p.m.id); nbJour.set(p.jourMatch, (nbJour.get(p.jourMatch) ?? 0) + 1); const c = clubsJour.get(p.jourMatch) ?? new Set(); c.add(p.m.dom); c.add(p.m.ext); clubsJour.set(p.jourMatch, c); liste.push(p); }
  for (const p of pj) if (engages.has(p.cle)) { prendre(p.jours); pairesRetenues.add(p.cle); liste.push(p); }
  // 1 bis. Journées des 5 grands championnats : AVANT TOUT LE RESTE et avant les plafonds (jamais sautées) ; leurs places sont prises d'abord, les autres vidéos se partagent le reste.
  for (const p of pj.filter((p) => p.grand && !pairesRetenues.has(p.cle))) { prendre(p.jours); pairesRetenues.add(p.cle); liste.push(p); }
  // 2. Les gros scores d'importance (chocs entre clubs prioritaires, derbys, affiches de C1).
  for (const p of pm.filter((p) => p.score >= SEUIL_GROS && !p.niveau2 && !retenus.has(p.m.id)).sort(cleTri)) if (accepter(p)) { retenus.add(p.m.id); liste.push(p); }
  // 3. Récaps de journée et de soirée (9 à 10 clubs par vidéo) : AVANT les paires de petits matchs.
  for (const p of pj.filter((p) => !pairesRetenues.has(p.cle)).sort((a, b) => ORDRE_LIGUES.indexOf(a.ligue) - ORDRE_LIGUES.indexOf(b.ligue) || a.F - b.F)) {
    if (peutPrendre(p.jours)) { prendre(p.jours); pairesRetenues.add(p.cle); liste.push(p); }
  }
  // 4. Les autres matchs, par score d'importance.
  for (const p of pm.filter((p) => p.score < SEUIL_GROS && !p.niveau2 && !retenus.has(p.m.id)).sort(cleTri)) if (accepter(p)) { retenus.add(p.m.id); liste.push(p); }
  // 5. Niveau 2 (autres championnats européens) : seulement s'il reste des créneaux après le niveau 1.
  for (const p of pm.filter((p) => p.niveau2 && !retenus.has(p.m.id)).sort(cleTri)) if (accepter(p)) { retenus.add(p.m.id); liste.push(p); }
  return { retenus, pairesRetenues, liste, usage, pj, pm };
}

// m : { id, ligue, round, debut (ms), etat, dom, ext } ; ctx : { vusFinis, engages:Set, avantOk:(cle)=>boolean }
export function taches(matchs, cfg, maintenant, ctx = {}) {
  if (ctx && !ctx.vusFinis && !ctx.engages && !ctx.avantOk && Object.keys(ctx).some((k) => /^\d+$/.test(k))) ctx = { vusFinis: ctx }; // ancien appel : table des fins vues
  const vusFinis = ctx.vusFinis ?? {};
  const avantOk = ctx.avantOk ?? (() => true);
  const t = [];
  const jourDebut = cfg.debutPublication ?? '1970-01-01';
  const apresDebut = (m) => jourParis(m.debut) >= jourDebut;
  const fini = (m) => FINS.has(m.etat);
  const conf = { ...cfg, clubsPrioritaires: cfg.clubsPrioritaires ?? cfg.clubsLigue1 };
  const gros = (m) => estGros(m, conf);
  const plan = planifier(matchs, cfg, ctx.engages ?? new Set());
  const vuFini = (m) => vusFinis[m.id] ?? maintenant;
  const rangC1 = (m) => Math.min(...[m.dom, m.ext].map((c) => { const i = (cfg.clubsC1 ?? []).indexOf(c); return i < 0 ? 999 : i; }));
  const grosC1Soir = new Map();
  for (const m of matchs) if (coupesDe(cfg).includes(m.ligue) && apresDebut(m) && plan.retenus.has(m.id)) { const j = jourParis(m.debut); grosC1Soir.set(j, [...(grosC1Soir.get(j) ?? []), m]); }
  for (const ms of grosC1Soir.values()) ms.sort((a, b) => rangC1(a) - rangC1(b) || a.id - b.id);

  for (const m of matchs) {
    if (!plan.retenus.has(m.id)) continue;
    const g = gros(m), poids = g ? poidsDe.gros : m.ligue === 301 ? 2.5 : poidsDe.petit;
    if (m.etat === 'NS') {
      const de = m.debut - (g ? 5 : 2) * HEURE;
      if (maintenant >= de - (cfg.avanceH ?? 0) * HEURE && maintenant < m.debut - 10 * MIN) {
        const rang = grosC1Soir.get(jourParis(m.debut))?.indexOf(m) ?? -1;
        t.push({ cle: `avant-match-${m.id}`, format: 'avant-match', id: m.id, prono: rang > 0, gros: g, poids, de, jusqu: m.debut - 10 * MIN, paire: `match-${m.id}` });
      }
    }
    if (fini(m)) {
      const f = vuFini(m), de = g ? f : f + 10 * MIN;
      // Pas d'après sans son avant (sauf match ajouté en cours de journée, où l'avant n'a jamais été dû).
      if (maintenant >= de && avantOk(`avant-match-${m.id}`)) t.push({ cle: `apres-match-${m.id}`, format: 'apres-match', id: m.id, gros: g, poids, de, jusqu: f + 6 * HEURE, paire: `match-${m.id}` });
    }
  }
  // Journées et soirées : avant-journée / avant-soirée, puis récap.
  for (const p of plan.liste.filter((p) => p.type !== 'match' && plan.pairesRetenues.has(p.cle))) {
    const ms = matchs.filter((m) => m.round === p.round && (p.jour ? jourParis(m.debut) === p.jour : true));
    const suffixe = p.jour ? `-${p.jour}` : '';
    const base = { id: p.round, jour: p.jour ?? undefined, paire: p.cle, gros: false, poids: poidsDe.journee };
    const aVenir = ms.filter((m) => m.etat === 'NS');
    if (p.grand) {
      // Grand championnat : avant-journée sur les matchs qui restent (au moins 2 si la journée a commencé), jusqu'à 1 h avant le prochain coup d'envoi.
      const debutee = aVenir.length < ms.length;
      const jusqu = aVenir.length ? Math.min(...aVenir.map((m) => m.debut)) - 60 * MIN : 0;
      if (aVenir.length >= (debutee ? 2 : 1) && maintenant >= p.avantDe - (cfg.avanceH ?? 0) * HEURE && maintenant < jusqu) t.push({ ...base, cle: `avant-journee-${p.round}${suffixe}`, format: 'avant-journee', de: p.avantDe, jusqu, poids: 5, prioritaire: true });
    } else if (p.avecAvant && ms.every((m) => m.etat === 'NS') && maintenant >= p.avantDe - (cfg.avanceH ?? 0) * HEURE && maintenant < p.avantFin) t.push({ ...base, cle: `avant-journee-${p.round}${suffixe}`, format: 'avant-journee', de: p.avantDe, jusqu: p.avantFin });
    const joues = ms.filter((m) => !REPORTES.has(m.etat)), reportes = ms.length - joues.length;
    if (reportes > 1 || !joues.length || !joues.every(fini)) continue;
    const f = Math.max(...joues.map(vuFini)), de = f + 60 * MIN;
    const midi = (() => { let x = f; for (let i = 0; i < 72 && jourParis(x) === jourParis(f); i++) x += HEURE; for (let i = 0; i < 24 && heureParis(x) !== 12; i++) x += HEURE; return x; })();
    if (maintenant < de) continue;
    if (p.avecAvant && !p.grand && !avantOk(`avant-journee-${p.round}${suffixe}`)) continue; // grands championnats : le récap part toujours
    t.push({ ...base, cle: `apres-journee-${p.round}${suffixe}`, format: 'apres-journee', reportes, de, jusqu: p.grand ? f + 36 * HEURE : midi, ...(p.grand ? { poids: 5, prioritaire: true } : {}) });
    if (cfg.joueursJournee.includes(p.ligue) && !p.jour) t.push({ ...base, cle: `joueurs-journee-${p.round}`, format: 'joueurs-journee', reportes, de, jusqu: midi, paire: undefined });
  }
  // Top buteurs + passeurs Ligue 1 : le lundi à partir de 10 h (Paris), une fois par semaine (vidéo seule, place réservée).
  if (new Date(Date.parse(`${jourParis(maintenant)}T12:00:00Z`)).getUTCDay() === 1 && heureParis(maintenant) >= 10 && jourParis(maintenant) >= jourDebut) t.push({ cle: `classement-301-${semaine(maintenant)}`, format: 'classement', id: 301, gros: false, poids: poidsDe.classement, de: maintenant, jusqu: maintenant + 10 * HEURE });
  return t;
}
// Garde-fous : rien entre 0 h et 8 h (sauf après-match d'un gros match, jusqu'à 1 h), 30 min d'écart, 12 par jour et par réseau.
export function permis(tache, reseau, pubs, maintenant, cfg = {}) {
  const h = heureParis(maintenant);
  const nuit = h < 8;
  const exception = tache.format === 'apres-match' && tache.gros && h < 1;
  if (nuit && !exception) return { ok: false, raison: 'nuit' };
  const du = pubs.filter((p) => p.reseau === reseau);
  if (du.some((p) => Math.abs(maintenant - p.t) < (tache.prioritaire ? 15 : cfg.ecartMin ?? 30) * MIN)) return { ok: false, raison: 'écart' };
  if (!tache.prioritaire && du.filter((p) => jourParis(p.t) === jourParis(maintenant)).length >= capDuJour(cfg, jourParis(maintenant))) return { ok: false, raison: 'plafond' };
  return { ok: true };
}

// Premier créneau où programmer une publication sur ce réseau : entre `de` et `jusqu`, pas la nuit, 30 min d'écart avec toute publication (faite ou déjà programmée), plafond du jour. null si rien n'est possible.
export function creneau(tache, reseau, pubs, maintenant, cfg = {}) {
  const pas = 5 * MIN;
  let t = Math.ceil(Math.max(tache.de, maintenant + 5 * MIN) / pas) * pas;
  for (; t <= tache.jusqu; t += pas) { if (permis(tache, reseau, pubs, t, cfg).ok) return t; }
  return null;
}
// Quand un contenu de niveau 1 (prioritaire) n'a aucun créneau, quelle publication programmée déplacer ? La moins importante (poids le plus bas, puis la plus proche), à condition que son retrait libère vraiment un créneau pour la tache. null sinon.
export function choisirADecaler(tache, reseau, pubs, maintenant, cfg = {}) {
  const cands = pubs.filter((p) => p.reseau === reseau && p.programme && !p.prioritaire && p.t > maintenant + 10 * MIN && (p.poids ?? 0) < (tache.poids ?? 99)).sort((a, b) => (a.poids ?? 0) - (b.poids ?? 0) || a.t - b.t);
  for (const c of cands) if (creneau(tache, reseau, pubs.filter((p) => p !== c), maintenant, cfg) !== null) return c;
  return null;
}
// Faut-il relire le calendrier ? Une fois par jour, puis toutes les 5 min pendant qu'un match suivi est en cours ou proche. Sinon : aucun appel.
export function faireLecture(cal, maintenant) {
  if (!cal || jourParis(cal.lu) !== jourParis(maintenant)) return true;
  const enCours = (cal.matchs ?? []).some((m) => !FINIS.has(m.etat) && maintenant >= m.debut && maintenant <= m.debut + 4 * HEURE);
  const aVerifier = (cal.matchs ?? []).some((m) => !FINIS.has(m.etat) && maintenant > m.debut - 15 * MIN && maintenant < m.debut);
  return (enCours || aVerifier) && maintenant - cal.lu >= 5 * MIN - 5000;
}
