import test from 'node:test';
import assert from 'node:assert';
import { controler, nomInvalide } from './controler.mjs';
import { faireLecture, taches, permis, planifier, creneau, choisirADecaler, HEURE } from './decider.mjs';
const ok = { match: 'A vs B', ok: true, raisons: [] };
const base = { dom: { nom: 'Lille', buteurs: [{ nom: 'Mbappé', minutes: ["3'"] }] }, ext: { nom: 'Lens', buteurs: [] }, controle: { scores: [ok] } };
test('noms : les faux sont refusés, les vrais passent', () => {
  for (const n of ['', '  ', 'Júnior', 'Junior', 'Jr.', 'jr', 'Sr.', 'Filho', 'Neto', '—', '-', 'K', 'K.', null, undefined, 'undefined']) assert.ok(nomInvalide(n), `doit refuser ${n}`);
  for (const n of ['Vinícius Júnior', 'Emerson', 'Vitinha', 'van Dijk', 'Cásseres Jr.', 'Lee', 'Dia', "M'Bolhi Ouhab", 'Neymar']) assert.equal(nomInvalide(n), null, `doit garder ${n}`);
});
test('un nom générique caché en profondeur refuse la vidéo', () => {
  const d = { ...base, compos: [{ lignes: [[{ id: 1, nom: 'Jr.' }]] }] };
  assert.ok(controler('avant-journee', d).some((x) => x.includes('générique')));
});
test('score : sans relevé on refuse, faux on refuse, juste on passe', () => {
  assert.deepEqual(controler('apres-match', base), []);
  assert.ok(controler('apres-match', { ...base, controle: {} }).length);
  assert.ok(controler('apres-match', { ...base, controle: undefined }).length);
  assert.ok(controler('apres-match', { ...base, controle: { scores: [] } }).length);
  assert.ok(controler('apres-journee', { ...base, controle: { scores: [ok, { match: 'C vs D', ok: false, raisons: ['événements 1-0, score 2-0'] }] } }).join().includes('C vs D'));
});
test('blessure : fraîche passe, ancienne ou sans relevé refuse', () => {
  const a = { ...base, absents: [{ id: 7, usage: 'Luis Díaz', nom: 'Díaz' }] };
  assert.ok(controler('joueurs-journee', a).join().includes('sans date'));
  assert.ok(controler('joueurs-journee', { ...a, controle: { ...base.controle, absents: [{ id: 7, fraiche: false }] } }).join().includes('plus de 7 jours'));
  assert.deepEqual(controler('joueurs-journee', { ...a, controle: { ...base.controle, absents: [{ id: 7, fraiche: true }] } }), []);
  const s = { joueurs: [{ lignes: [{ id: 9, nom: 'Olise', absent: true }] }], controle: { absents: [] } };
  assert.ok(controler('avant-match', s).join().includes('Olise'));
  assert.deepEqual(controler('avant-match', { joueurs: [{ lignes: [{ id: 9, nom: 'Olise', absent: false }] }], controle: { absents: [] } }), []);
});
const cfg = { championnats: [301, 8], c1: 2, avantJournee: [], apresJournee: [301, 8], joueursJournee: [301], clubsPrioritaires: [591, 44], clubsC1: [591, 503, 7980], derbys: [[591, 44]], debutPublication: '2026-11-03' };
const T = Date.parse('2026-11-03T21:00:00Z');
test('décideur : gros match = club prioritaire, affiche C1 ou derby ; avant-match 4-5 h (gros) ou 1-2 h (petit) avant', () => {
  const m = (id, ligue, dom, ext, debut) => ({ id, ligue, round: 9, debut, etat: 'NS', dom, ext });
  const gros = taches([m(1, 301, 591, 1, T + 4.5 * HEURE)], cfg, T).find((t) => t.format === 'avant-match');
  assert.ok(gros && gros.gros && gros.poids === 3);
  assert.equal(taches([m(1, 301, 591, 1, T + 6 * HEURE)], cfg, T).filter((t) => t.format === 'avant-match').length, 0);
  const petit = taches([m(2, 301, 5, 6, T + 1.5 * HEURE)], cfg, T).find((t) => t.format === 'avant-match');
  assert.ok(petit && !petit.gros && petit.poids === 2.5);
  assert.equal(taches([m(2, 301, 5, 6, T + 3 * HEURE)], cfg, T).filter((t) => t.format === 'avant-match').length, 0);
  assert.ok(taches([m(3, 8, 591, 44, T + 4.5 * HEURE)], cfg, T).find((t) => t.format === 'avant-match')?.gros);
});
test('décideur : après-match, gros tout de suite, petit 10 min après la fin ; rien avant le jour de départ', () => {
  const m = (id, dom, debut) => ({ id, ligue: 301, round: 9, debut, etat: 'FT', dom, ext: 1 });
  const fin = T - 5 * 60000;
  assert.ok(taches([m(1, 591, T - 2 * HEURE)], cfg, T, { 1: fin }).some((t) => t.cle === 'apres-match-1'));
  assert.ok(!taches([m(2, 999, T - 2 * HEURE)], cfg, T, { 2: fin }).some((t) => t.format === 'apres-match'));
  assert.ok(taches([m(2, 999, T - 2 * HEURE)], cfg, T + 6 * 60000, { 2: fin }).some((t) => t.format === 'apres-match'));
  assert.ok(!taches([m(3, 591, Date.parse('2026-11-02T19:00:00Z'))], cfg, T, { 3: fin }).some((t) => t.format === 'apres-match'));
});
test('décideur : journée, seulement quand tous les matchs sont finis', () => {
  const a = { id: 1, ligue: 301, round: 9, debut: T - 5 * HEURE, etat: 'FT', dom: 1, ext: 2 }, b = { ...a, id: 2, etat: 'INPLAY_1ST_HALF' };
  const fins = { 1: T - 2 * HEURE };
  assert.ok(taches([a], cfg, T, fins).some((t) => t.format === 'apres-journee'));
  assert.ok(taches([a], cfg, T, fins).some((t) => t.format === 'joueurs-journee'));
  assert.ok(!taches([a, b], cfg, T, fins).some((t) => t.format === 'apres-journee'));
});
test('garde-fous : nuit, 30 min, plafond par jour', () => {
  const nuit = Date.parse('2026-11-04T01:30:00Z'); // 02 h 30 Paris
  assert.equal(permis({ format: 'avant-match' }, 'tiktok', [], nuit).ok, false);
  const t = Date.parse('2026-11-03T21:00:00Z'); // 22 h Paris
  assert.equal(permis({ format: 'apres-match', gros: true }, 'tiktok', [], Date.parse('2026-11-03T23:30:00Z')).ok, true); // 00 h 30 : exception gros après-match
  assert.equal(permis({ format: 'apres-match', gros: false }, 'tiktok', [], Date.parse('2026-11-03T23:30:00Z')).ok, false);
  assert.equal(permis({}, 'tiktok', [{ t: t - 20 * 60000, reseau: 'tiktok' }], t).ok, false);
  assert.equal(permis({}, 'tiktok', [{ t: t - 20 * 60000, reseau: 'youtube' }], t).ok, true);
  const six = Array.from({ length: 12 }, (_, i) => ({ t: t - (i + 1) * 35 * 60000, reseau: 'tiktok' }));
  assert.equal(permis({}, 'tiktok', six, t, { maxParJour: 12 }).raison, 'plafond');
});
test('calendrier : aucun appel sans match en cours, un toutes les 5 min pendant', () => {
  const m = { debut: T - HEURE, etat: 'INPLAY_2ND_HALF' };
  assert.equal(faireLecture({ lu: T - 60000, matchs: [m] }, T), false);
  assert.equal(faireLecture({ lu: T - 301000, matchs: [m] }, T), true);
  assert.equal(faireLecture({ lu: T - 3 * HEURE, matchs: [{ debut: T - 5 * HEURE, etat: 'FT' }] }, T), false);
  assert.equal(faireLecture(null, T), true);
});
import { lireScore } from './commun.mjs';
const fx = (buteurs, h = 2, a = 0, info = 'A won after full-time.', mt = [2, 0]) => ({ id: 1, name: 'A vs B', result_info: info, state: { state: 'FT' }, participants: [{ id: 1, name: 'A', meta: { location: 'home' } }, { id: 2, name: 'B', meta: { location: 'away' } }],
  scores: [['CURRENT', h, a], ['2ND_HALF', ...mt]].flatMap(([description, x, y]) => [{ description, score: { participant: 'home', goals: x } }, { description, score: { participant: 'away', goals: y } }]),
  events: buteurs.map((b, i) => ({ type: { code: 'goal' }, participant_id: 1, player_name: 'X', minute: i + 1, ...b })) });
test('score : chaque source fausse est vue, et un match juste passe', () => {
  assert.equal(lireScore(fx([{}, {}])).recoupe.ok, true);
  assert.equal(lireScore(fx([{}])).recoupe.ok, false, 'événements manquants');
  assert.equal(lireScore(fx([{}, {}, { rescinded: true }])).recoupe.ok, true, 'but annulé ignoré');
  assert.equal(lireScore(fx([{}, {}], 2, 0, 'B won after full-time.')).recoupe.ok, false, 'phrase contraire');
  assert.equal(lireScore(fx([{}, {}], 2, 0, null)).recoupe.ok, false, 'phrase absente');
  assert.equal(lireScore(fx([{}, {}], 2, 0, 'A won after full-time.', [1, 0])).recoupe.ok, false, 'fin de match différente');
});
import { absentsProuves } from './commun.mjs';
import { dureeJoueursJournee } from '../src/dureeJoueurs.mjs';
test('absents : le sans-preuve est retiré et remplacé ; aucun prouvé, aucun écran', async () => {
  const p = (a) => ({ fraiche: a.ok, preuve: 'x' });
  const l = [{ n: 1, ok: true }, { n: 2, ok: false }, { n: 3, ok: true }];
  const r = await absentsProuves(l, p, 2);
  assert.deepEqual(r.gardes.map((x) => x.n), [1, 3]);
  assert.deepEqual(r.retires.map((x) => x.n), [2]);
  assert.equal((await absentsProuves([{ ok: false }, { ok: false }], p, 4)).gardes.length, 0);
  const sans = { joueurs: [{}], absents: [] }, avec = { joueurs: [{}], absents: [{}] };
  assert.ok(dureeJoueursJournee(avec) > dureeJoueursJournee(sans));
  assert.deepEqual(controler('joueurs-journee', { ...base, absents: [] }), []);
});

// ── Règle de cohérence : chaque avant a son après, et l'inverse ──
const cfgP = { championnats: [301, 8], c1: 2, apresJournee: [301, 8], joueursJournee: [], clubsPrioritaires: [591, 44], clubsC1: [591, 503], derbys: [], maxParJour: 12, matchsParJour: 5, debutPublication: '2026-11-03' };
const jour = (n, h) => Date.parse(`2026-11-${String(n).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`);
test('cohérence : un après-match ne sort jamais sans son avant (sauf avant jamais dû)', () => {
  const m = { id: 1, ligue: 301, round: 9, debut: jour(10, 17), etat: 'FT', dom: 591, ext: 7 };
  const fins = { 1: jour(10, 19) };
  const t1 = taches([m], cfgP, jour(10, 20), { vusFinis: fins, avantOk: () => false });
  assert.ok(!t1.some((t) => t.format === 'apres-match'));
  const t2 = taches([m], cfgP, jour(10, 20), { vusFinis: fins, avantOk: () => true });
  assert.ok(t2.some((t) => t.format === 'apres-match'));
});
test('cohérence : le plafond coupe des paires entières, jamais une moitié', () => {
  // 12 matchs le même jour, plafond 4 vidéos : 2 paires exactement.
  const ms = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, ligue: 301, round: 20 + i, debut: jour(10, 12 + (i % 8)) + i * 3 * 60000, etat: 'NS', dom: 200 + i, ext: 300 + i }));
  const p = planifier(ms, { ...cfgP, maxParJour: 5, apresJournee: [] });
  assert.equal(p.retenus.size, 2);
  for (const id of p.retenus) assert.ok(taches(ms, { ...cfgP, maxParJour: 5, apresJournee: [] }, ms.find((m) => m.id === id).debut - 90 * 60000).some((t) => t.cle === `avant-match-${id}`));
});
test('cohérence : une journée (hors jour de départ) a son avant-journée ET son récap ; une soirée de C1 aussi', () => {
  const ligue = (id, n, h) => ({ id, ligue: 301, round: 50, debut: jour(n, h), etat: 'NS', dom: id, ext: id + 1000 });
  const ms = [ligue(1, 14, 19), ligue(2, 15, 14), ligue(3, 16, 14)]; // journée du week-end du 14
  const c = { ...cfgP, matchsParJour: 0, coherenceDepuis: '2026-11-07', grandsChampionnats: [] };
  const p = planifier(ms, c);
  const pj = p.pj.find((x) => x.round === 50);
  assert.ok(pj && pj.avecAvant && p.pairesRetenues.has(pj.cle));
  const avant = taches(ms, c, jour(14, 8), { avantOk: () => true });
  assert.ok(avant.some((t) => t.format === 'avant-journee'));
  const fini = ms.map((m) => ({ ...m, etat: 'FT' }));
  const apres = taches(fini, c, jour(17, 12), { vusFinis: { 1: jour(14, 21), 2: jour(15, 16), 3: jour(16, 16) }, avantOk: (k) => k === 'avant-journee-50' });
  assert.ok(apres.some((t) => t.format === 'apres-journee'));
  const sans = taches(fini, c, jour(17, 12), { vusFinis: { 1: jour(14, 21), 2: jour(15, 16), 3: jour(16, 16) }, avantOk: () => false });
  assert.ok(!sans.some((t) => t.format === 'apres-journee'));
  // C1 : deux soirs de la même journée = deux paires, avec --jour
  const c1 = [{ id: 11, ligue: 2, round: 77, debut: jour(17, 17), etat: 'NS', dom: 1, ext: 2 }, { id: 12, ligue: 2, round: 77, debut: jour(17, 20), etat: 'NS', dom: 3, ext: 4 }, { id: 13, ligue: 2, round: 77, debut: jour(18, 17), etat: 'NS', dom: 5, ext: 6 }, { id: 14, ligue: 2, round: 77, debut: jour(18, 20), etat: 'NS', dom: 7, ext: 8 }];
  const ps = planifier(c1, { ...cfgP, matchsParJour: 0 });
  assert.equal([...ps.pairesRetenues].filter((k) => k.startsWith('soiree-')).length, 2);
});

test('grands championnats : avant-journée même si la journée a commencé, jamais sautée, récap toujours, hors plafond', () => {
  const g = (id, n, h, etat = 'NS') => ({ id, ligue: 301, round: 60, debut: jour(n, h), etat, dom: id, ext: id + 1000 });
  const ms = [g(1, 6, 19, 'FT'), g(2, 7, 14), g(3, 8, 14), g(4, 8, 16)]; // journée déjà commencée, 3 matchs restants
  const c = { ...cfgP, matchsParJour: 0, maxParJour: 1, grandsChampionnats: [301] };
  const t1 = taches(ms, c, jour(6, 21), { avantOk: () => false });
  const av = t1.find((t) => t.format === 'avant-journee');
  assert.ok(av && av.prioritaire && av.poids === 5);
  // un seul match restant dans une journée commencée : pas d'avant-journée
  assert.ok(!taches([g(1, 6, 19, 'FT'), g(2, 7, 14)], c, jour(6, 21), { avantOk: () => false }).some((t) => t.format === 'avant-journee'));
  // récap : part même si l'avant n'est pas parti, hors plafond
  const fini = ms.map((m) => ({ ...m, etat: 'FT' }));
  const r = taches(fini, c, jour(9, 12), { vusFinis: { 1: jour(6, 21), 2: jour(7, 16), 3: jour(8, 16), 4: jour(8, 18) }, avantOk: () => false }).find((t) => t.format === 'apres-journee');
  assert.ok(r && r.prioritaire);
  const pubs = [{ t: jour(9, 8), reseau: 'tiktok' }];
  assert.equal(permis(r, 'tiktok', pubs, jour(9, 12), c).ok, true);
  assert.equal(permis({ ...r, prioritaire: false }, 'tiktok', pubs, jour(9, 12), c).raison, 'plafond');
});

// ── Déplacement automatique de l'avant-match le moins important (simulation, aucun envoi) ──
test('créneau : un contenu prioritaire déplace le moins important, jamais un autre prioritaire ni un plus important', () => {
  const cfgD = { maxParJour: 16, ecartMin: 30 };
  const t0 = jour(10, 12);
  const prog = (t, poids, cle, extra = {}) => ({ t, reseau: 'tiktok', programme: true, poids, cle, video: `${cle}.mp4`, ...extra });
  const pubs = [prog(t0 + 30 * 60000, 2.5, 'a'), prog(t0 + 45 * 60000, 2, 'b'), prog(t0 + 60 * 60000, 3, 'c')];
  const tache = { format: 'avant-journee', poids: 5, prioritaire: true, de: t0 + 20 * 60000, jusqu: t0 + 65 * 60000 };
  assert.equal(creneau(tache, 'tiktok', pubs, t0, cfgD), null); // 15 min d'écart seulement : 12:45 est à 15 min de a et de b
  const c = choisirADecaler(tache, 'tiktok', pubs, t0, cfgD);
  assert.equal(c.cle, 'b'); // le moins important (poids 2) dont le retrait libère un créneau
  assert.equal(choisirADecaler(tache, 'tiktok', [prog(t0 + 30 * 60000, 6, 'x'), prog(t0 + 45 * 60000, 5, 'y', { prioritaire: true }), prog(t0 + 60 * 60000, 6, 'z')], t0, cfgD), null);
  assert.ok(creneau(tache, 'tiktok', pubs.filter((p) => p !== c), t0, cfgD) !== null);
});

import { silenceAnormal } from './notifier.mjs';
import { heureParis as hP } from './decider.mjs';
test('veille : silence de 3 h en journée avec des vidéos en attente = alerte', () => {
  const t = Date.parse('2026-11-09T12:00:00Z'); // 13 h Paris
  const file = { x: { restants: ['tiktok'], de: t - 5 * HEURE, jusqu: t + HEURE } };
  assert.equal(silenceAnormal({ file, maintenant: t, derniereSortie: t - 4 * HEURE, heureParis: hP }), true);
  assert.equal(silenceAnormal({ file, maintenant: t, derniereSortie: t - 1 * HEURE, heureParis: hP }), false);
  assert.equal(silenceAnormal({ file: {}, maintenant: t, derniereSortie: 0, heureParis: hP }), false);
  const nuit = Date.parse('2026-11-09T02:00:00Z');
  assert.equal(silenceAnormal({ file, maintenant: nuit, derniereSortie: 0, heureParis: hP }), false);
});

import { echecLecture } from './decider.mjs';
test('échec « Video could not be read » reconnu comme passager', () => {
  assert.equal(echecLecture('instagram : Invalid post: Video could not be read from its URL.'), true);
  assert.equal(echecLecture('401 Unauthorized'), false);
});

import { rappelDeLaVeille } from './notifier.mjs';
import { jourParis as jP } from './decider.mjs';
test('rappel de la veille : après 18 h, vidéo prête du lendemain, une seule fois', () => {
  const cal = [{ date: '2026-11-10', heure: '12:00', id: 'a', statut: 'prête' }, { date: '2026-11-12', id: 'b', statut: 'à filmer' }];
  const soir = Date.parse('2026-11-09T18:30:00Z'); // 19 h 30 Paris
  assert.equal(rappelDeLaVeille(cal, soir, { jourParis: jP, heureParis: hP })?.id, 'a');
  assert.equal(rappelDeLaVeille(cal, soir, { jourParis: jP, heureParis: hP, dejaFaits: { a: 1 } }), null);
  assert.equal(rappelDeLaVeille(cal, Date.parse('2026-11-09T10:00:00Z'), { jourParis: jP, heureParis: hP }), null);
  assert.equal(rappelDeLaVeille(cal, Date.parse('2026-11-11T18:30:00Z'), { jourParis: jP, heureParis: hP }), null);
});

test('trêve : une vidéo top buteurs par jour prévu, à partir de 12 h', () => {
  const cfg = { treve: [{ id: 8, jour: '2026-11-11' }], championnats: [], joueursJournee: [] };
  const midi = Date.parse('2026-11-11T11:30:00Z'); // 12 h 30 Paris
  const ids = (ms) => taches([], cfg, ms, { vusFinis: {}, engages: new Set(), avantOk: () => true }).filter((t) => t.cle === 'classement-8-treve').length;
  assert.equal(ids(midi), 1);
  assert.equal(ids(Date.parse('2026-11-11T08:00:00Z')), 0);
  assert.equal(ids(Date.parse('2026-11-12T12:00:00Z')), 0);
});

// Rythme (22/11) : 1 vidéo par jour, 2 les jours de match, une le matin (12-14 h) et une le soir (19-24 h).
test('rythme : créneaux, plafond du jour et contenus gardés', async () => {
  const { parisA } = await import('./decider.mjs');
  const R = { actif: true, depuis: '2026-11-22T00:00:00Z', matin: ['12:00', '14:00'], soir: ['19:00', '24:00'], maxJour: 1, maxJourMatch: 2, liguesJourDeMatch: [301, 2], sansYoutube: ['classement'], joursMatch: ['2026-11-27'] };
  const cfg = { rythme: R };
  const t = { format: 'apres-journee', ligue: 301, poids: 5, prioritaire: true };
  assert.equal(permis(t, 'tiktok', [], parisA('2026-11-23', 16), cfg).raison, 'hors créneau');
  assert.ok(permis(t, 'tiktok', [], parisA('2026-11-23', 12), cfg).ok);
  const une = [{ reseau: 'tiktok', t: parisA('2026-11-23', 12) }];
  assert.equal(permis(t, 'tiktok', une, parisA('2026-11-23', 19), cfg).raison, 'plafond', 'jour sans match : 1 seule, même prioritaire');
  const vendredi = [{ reseau: 'tiktok', t: parisA('2026-11-27', 12) }];
  assert.ok(permis(t, 'tiktok', vendredi, parisA('2026-11-27', 19), cfg).ok, 'jour de match : la 2e part le soir');
  assert.equal(permis(t, 'tiktok', vendredi, parisA('2026-11-27', 13), cfg).raison, 'créneau pris', 'jamais 2 le matin');
  assert.ok(permis(t, 'instagram', une, parisA('2026-11-23', 19), cfg).ok, 'plafond compté par réseau');
  assert.equal(permis(t, 'tiktok', [], parisA('2026-11-23', 3), cfg).raison, 'nuit');
  // Contenus : pas d'avant-match ; le top buteurs du lundi part sans YouTube.
  const lundi = parisA('2026-11-23', 12) + 5 * 60000;
  const m = { id: 9, ligue: 384, round: 5, debut: lundi + 6 * HEURE, etat: 'NS', dom: 1, ext: 2 };
  const ts = taches([m], { championnats: [384], apresJournee: [], joueursJournee: [], debutPublication: '2026-11-01', rythme: R }, lundi);
  assert.ok(!ts.some((x) => x.format === 'avant-match'));
  assert.deepEqual(ts.find((x) => x.format === 'classement')?.reseaux, ['instagram', 'tiktok']);
});

// Q65 = a (26/11) : le récap de soirée de Ligue des champions part le soir même, jusqu'à 1 h du matin, comme celui de la Ligue 1.
test('rythme : récap de soirée de Ligue des champions permis jusqu\'à 1 h (soirée finie à 22:57)', async () => {
  const { parisA } = await import('./decider.mjs');
  const R = { actif: true, depuis: '2026-11-22T00:00:00Z', matin: ['12:00', '14:00'], soir: ['19:00', '24:00'], maxJour: 1, maxJourMatch: 2, liguesJourDeMatch: [301, 2], joursMatch: ['2026-11-25'] };
  const cfg = { rythme: R };
  const ldc = { format: 'apres-journee', ligue: 2, jour: '2026-11-25', poids: 5, prioritaire: true };
  const fin = parisA('2026-11-25', 22) + 57 * 60000, min = 60000;
  assert.ok(permis(ldc, 'tiktok', [], fin + 60 * min, cfg).ok, '23:57 : permis');
  assert.ok(permis(ldc, 'tiktok', [], fin + 93 * min, cfg).ok, '00:30 : permis');
  assert.ok(permis(ldc, 'tiktok', [], fin + 122 * min, cfg).ok, '00:59 : permis');
  assert.equal(permis(ldc, 'tiktok', [], fin + 123 * min, cfg).raison, 'nuit', '01:00 : plus permis');
  assert.equal(permis({ ...ldc, ligue: 384 }, 'tiktok', [], fin + 93 * min, cfg).raison, 'nuit', 'autre récap : pas d\'exception');
  assert.equal(permis({ ...ldc, jour: undefined }, 'tiktok', [], fin + 93 * min, cfg).raison, 'nuit', 'récap LdC sans jour : pas d\'exception');
  // Les autres règles restent : plafond de 2 par jour et par réseau, un seul envoi par créneau.
  const deux = [{ reseau: 'tiktok', t: parisA('2026-11-25', 12) }, { reseau: 'tiktok', t: parisA('2026-11-25', 19) }];
  assert.equal(permis(ldc, 'tiktok', deux, fin + 93 * min, cfg).raison, 'plafond', '00:30 avec 2 envois du jour : plafond');
  assert.equal(permis(ldc, 'tiktok', [deux[1]], fin + 93 * min, cfg).raison, 'créneau pris', 'soir déjà pris');
  assert.ok(permis(ldc, 'instagram', deux, fin + 93 * min, cfg).ok, 'plafond compté par réseau');
  assert.equal(permis(ldc, 'youtube', [{ reseau: 'youtube', t: fin - 6 * HEURE }, { reseau: 'youtube', t: fin - 3 * HEURE }], fin + 60 * min, cfg).raison, 'youtube 24 h');
});

test('YouTube : 2 envois au plus par 24 h glissantes, les envois refusés ne comptent pas', async () => {
  const { youtubeLibre } = await import('./decider.mjs');
  const h = (n) => Date.parse('2026-11-21T00:00:00Z') + n * HEURE;
  const p = [{ reseau: 'youtube', t: h(12) }, { reseau: 'youtube', t: h(19.5) }];
  assert.equal(youtubeLibre(p, h(33)), false, 'le 22 à 9 h : 2 envois dans les 24 h');
  assert.equal(youtubeLibre(p, h(37)), true, '24 h après le 1er : place libre');
  assert.equal(youtubeLibre([...p, { reseau: 'youtube', t: h(40), echec: true }], h(37)), true);
  assert.equal(youtubeLibre([{ reseau: 'youtube', t: h(30) }, { reseau: 'youtube', t: h(40) }], h(20)), false, 'envois programmés après comptés aussi');
  assert.equal(youtubeLibre(p, h(15)), false);
  assert.equal(permis({ format: 'apres-match' }, 'youtube', p, h(33), {}).raison, 'youtube 24 h');
});

test('stories : un avant-match devient une story à son heure, sans toucher au plafond des vidéos', async () => {
  const { parisA } = await import('./decider.mjs');
  const R = { actif: true, depuis: '2026-11-22T00:00:00Z', matin: ['12:00', '14:00'], soir: ['19:00', '24:00'], maxJour: 1, maxJourMatch: 2, liguesJourDeMatch: [301, 2], joursMatch: [] };
  const t0 = parisA('2026-11-23', 18) + 5 * 60000;
  const m = { id: 9, ligue: 301, round: 5, debut: t0 + HEURE, etat: 'NS', dom: 1, ext: 2 };
  const base = { championnats: [301], apresJournee: [], joueursJournee: [], debutPublication: '2026-11-01', rythme: R };
  assert.ok(!taches([m], base, t0).some((x) => x.story), 'stories inactives : rien');
  const ts = taches([m], { ...base, stories: { actif: true } }, t0);
  const s = ts.find((x) => x.cle === 'story-avant-9');
  assert.ok(s && s.story && s.reseaux[0] === 'instagram-story');
  assert.ok(!taches([{ ...m, ligue: 384 }], { ...base, championnats: [384], stories: { actif: true } }, t0).some((x) => x.story), 'petit match hors Ligue 1 : pas de story');
  const une = [{ reseau: 'tiktok', t: parisA('2026-11-23', 12) }];
  assert.ok(permis(s, 'instagram-story', une, t0, base).ok, 'hors créneau vidéo : la story part quand même');
});

test('formats : rendus la nuit d\'avant, créneau réservé au contenu automatique', async () => {
  const { parisA, tachesFormats } = await import('./decider.mjs');
  const R = { actif: true, depuis: '2026-11-22T00:00:00Z', matin: ['12:00', '14:00'], soir: ['19:00', '24:00'], maxJour: 1, maxJourMatch: 2, joursMatch: ['2026-11-24'] };
  const cfg = { rythme: R, formats: { actif: true, envoi: false, nuit: [22, 7], calendrier: [{ date: '2026-11-23', creneau: 'matin', format: 'top5', ligue: 301 }, { date: '2026-11-24', creneau: 'matin', format: 'duel', ligue: 301 }] } };
  assert.equal(tachesFormats(cfg, parisA('2026-11-22', 21)).length, 0, 'pas avant 22 h la veille');
  const t = tachesFormats(cfg, parisA('2026-11-22', 23));
  assert.equal(t.length, 1); assert.equal(t[0].format, 'f-top5'); assert.ok(t[0].depot);
  const auto = { format: 'classement' };
  assert.equal(permis(auto, 'tiktok', [], parisA('2026-11-23', 12), cfg).raison, 'plafond', 'lundi : le seul créneau est pris par le Top 5');
  assert.equal(permis(auto, 'tiktok', [], parisA('2026-11-24', 12), cfg).raison, 'créneau pris', 'mardi matin réservé');
  assert.ok(permis(auto, 'tiktok', [], parisA('2026-11-24', 20), cfg).ok, 'mardi soir libre (jour de C1)');
});
