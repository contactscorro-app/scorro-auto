// Choix des sujets (l'éditeur, chat du 28/11 13:45) : Ligue 1 + Premier League + Liga ; 2 vidéos par jour et par réseau au plus (midi + soir) ;
// plusieurs sujets pour un créneau → le meilleur score ; récap reporté au lendemain, sinon il saute ; carrousel jamais au même moment qu'une vidéo.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { choixSujets, scoreSujet, taches, permis, parisA, jourParis, HEURE, MIN } from './decider.mjs';

const vrai = JSON.parse(fs.readFileSync('data/auto-config.json', 'utf8'));
// Config réelle de l'essai ; formats du planning coupés (dates passées) ; fonctionnalités avec un ordre, comme auto.mjs le pose.
const conf = (o = {}) => ({ ...structuredClone(vrai), formats: { actif: false }, ordreFonctionnalites: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], carrousels: { actif: true, heure: 19, calendrier: { '2026-12-07': 'top5' } }, ...o });
let id = 1;
const M = (ligue, round, jour, h, dom, ext, etat = 'NS', mi = 0) => ({ id: id++, ligue, round, season: ligue * 10, debut: parisA(jour, h) + mi * MIN, etat, dom, ext, nom: `${dom}-${ext}` });
// Semaine type du 4 au 7/12/2026 : Ligue 1 (ven. 20:45 → dim. 20:45), Premier League (sam. 13:30 → dim. 17:30), Liga (ven. 21:00 → lun. 21:00).
function semaineType() {
  id = 1;
  const L1 = [M(301, 1001, '2026-12-04', 20, 591, 289, 'NS', 45), M(301, 1001, '2026-12-05', 17, 3682, 690), M(301, 1001, '2026-12-05', 21, 1, 2), M(301, 1001, '2026-12-05', 21, 3, 4), M(301, 1001, '2026-12-05', 21, 5, 6),
    M(301, 1001, '2026-12-06', 15, 79, 7047), M(301, 1001, '2026-12-06', 17, 7, 8, 'NS', 15), M(301, 1001, '2026-12-06', 17, 10, 11, 'NS', 15), M(301, 1001, '2026-12-06', 20, 44, 450, 'NS', 45)];
  const PL = [M(8, 2001, '2026-12-05', 13, 18, 8, 'NS', 30), ...[12, 13, 15, 16, 17, 20, 21, 22].map((x, i) => M(8, 2001, i < 4 ? '2026-12-05' : '2026-12-06', 16, 100 + x, 200 + x)), M(8, 2001, '2026-12-06', 17, 19, 6, 'NS', 30)];
  const LI = [M(564, 3001, '2026-12-04', 21, 300, 301), ...[1, 2, 3, 4, 5, 6, 7, 8].map((x, i) => M(564, 3001, i < 4 ? '2026-12-05' : '2026-12-06', 18, 310 + x, 330 + x)), M(564, 3001, '2026-12-07', 21, 340, 341)];
  return [...L1, ...PL, ...LI];
}
const finir = (ms, t) => ms.map((m) => (t >= m.debut + 115 * MIN ? { ...m, etat: 'FT' } : m));
const lundi = parisA('2026-12-07', 12);

test('score : ligue + format + affiche (0 à 20) ; Ligue 1 avant PL/Liga à affiche égale', () => {
  const c = conf();
  assert.equal(scoreSujet({ ligue: 301, format: 'apres-journee' }, c), 70);
  assert.equal(scoreSujet({ ligue: 8, format: 'apres-journee' }, c), 55);
  assert.equal(scoreSujet({ ligue: 564, format: 'avant-journee' }, c), 45);
  assert.equal(scoreSujet({ ligue: 301, format: 'classement' }, c), 55);
  // Clasico (derby Real–Barça, deux gros clubs) : bonus d'affiche plafonné à 20.
  const clasico = { ligue: 564, dom: 3468, ext: 83, debut: parisA('2026-12-05', 21) };
  assert.equal(scoreSujet({ ligue: 564, format: 'apres-journee', matchs: [clasico] }, c), 75);
  assert.ok(scoreSujet({ ligue: 564, format: 'apres-journee', matchs: [clasico] }, c) > scoreSujet({ ligue: 301, format: 'apres-journee', matchs: [{ ligue: 301, dom: 1, ext: 2, debut: 0 }] }, c), 'un Clasico passe devant un récap de Ligue 1 sans affiche');
});

test('semaine type : jamais plus de 2 par jour, jamais 2 dans le même créneau, réservations respectées', () => {
  const c = conf(), ms = semaineType();
  const { affect, pris } = choixSujets(ms, c, parisA('2026-12-03', 9));
  const parJour = new Map();
  for (const a of affect.values()) parJour.set(a.jour, [...(parJour.get(a.jour) ?? []), a.creneau]);
  for (const [j, cr] of parJour) { assert.ok(cr.length <= 2, `${j} : ${cr}`); assert.equal(new Set(cr).size, cr.length, `${j} : 2 vidéos dans le même créneau`); }
  // Jeudi 19 h et samedi 12 h : fonctionnalités, jamais un autre sujet.
  assert.match(pris.get('2026-12-03 soir'), /^format-fonc-/);
  assert.match(pris.get('2026-12-05 matin'), /^format-fonc-/);
  for (const a of affect.values()) assert.ok(!(a.jour === '2026-12-05' && a.creneau === 'matin') && !(a.jour === '2026-12-03' && a.creneau === 'soir'));
});

test('dimanche chargé : récap L1 le soir, récap PL le lendemain, avant-journée PL/Liga sautés ou la veille', () => {
  const c = conf(), ms = semaineType();
  const { affect, sautes } = choixSujets(ms, c, parisA('2026-12-03', 9));
  const ou = (cle) => { const a = affect.get(cle); return a ? `${a.jour} ${a.creneau}` : 'sauté'; };
  assert.equal(ou('avant-journee-1001'), '2026-12-04 matin', 'avant-journée L1 : vendredi midi');
  assert.equal(ou('apres-journee-1001'), '2026-12-06 soir', 'récap L1 : dimanche soir');
  // Récap PL : derby Arsenal–Tottenham (affiche 20) → 75 ; dimanche soir pris par la L1 (90) → lundi midi (75 − 10), devant le top buteurs (55).
  assert.equal(ou('apres-journee-2001'), '2026-12-07 matin', 'récap PL : lundi midi');
  assert.equal(ou('classement-301-2026-12-07'), '2026-12-07 soir', 'top buteurs : lundi soir');
  assert.ok(affect.get('classement-301-2026-12-07').de >= parisA('2026-12-07', 21), 'pas avant 21 h : carrousel à 19 h');
  assert.equal(ou('apres-journee-3001'), '2026-12-08 matin', 'récap Liga (lundi 21 h) : mardi midi');
  assert.equal(ou('apres-match-10'), '2026-12-05 soir', 'samedi soir : après-match du choc Chelsea–Liverpool (pas de récap ce jour-là)');
  // Vendredi : midi pris par la L1 ; avant-journée PL (1er match samedi 13:30) → vendredi soir ; avant-journée Liga (vendredi 21 h) : sauté.
  assert.equal(ou('avant-journee-2001'), '2026-12-04 soir');
  assert.equal(ou('avant-journee-3001'), 'sauté');
  assert.ok(sautes.some((s) => s.cle === 'avant-journee-3001' && /2026-12-04 matin : avant-journee-1001/.test(s.raison)), 'la raison nomme le sujet qui a pris le créneau');
});

test('un sujet déjà publié ou programmé garde son créneau (l\'affectation ne le déplace pas)', () => {
  const c = conf(), ms = semaineType();
  const pubs = [{ reseau: 'instagram', t: parisA('2026-12-06', 20) + 30 * MIN, cle: 'apres-journee-2001' }];
  const { affect } = choixSujets(finir(ms, parisA('2026-12-06', 21)), c, parisA('2026-12-06', 21), { pubs });
  assert.equal(affect.get('apres-journee-2001').deja, true);
  const l1 = affect.get('apres-journee-1001');
  assert.equal(`${l1.jour} ${l1.creneau}`, '2026-12-07 matin', 'dimanche soir pris : le récap L1 passe lundi midi (devant le top buteurs, score plus haut)');
});

test('taches : récap PL fini dimanche 19:25 retenu pour lundi midi ; récap L1 à 23:45 ; top buteurs lundi 21 h, après le carrousel', () => {
  const c = conf(), ms = semaineType();
  const vus = {}, pubs = [];
  const at = (t) => { const x = finir(ms, t); for (const m of x) if (m.etat === 'FT') vus[m.id] ??= m.debut + 115 * MIN; return taches(x, c, t, { vusFinis: vus, pubs }).filter((y) => !y.story).map((y) => y.cle); };
  const publier = (cle, t) => { for (const reseau of ['instagram', 'tiktok', 'youtube']) pubs.push({ reseau, t, cle }); };
  publier('avant-journee-1001', parisA('2026-12-04', 12)); publier('avant-journee-2001', parisA('2026-12-04', 19));
  assert.ok(!at(parisA('2026-12-06', 21)).includes('apres-journee-2001'), '21:00 : récap PL retenu pour lundi');
  assert.ok(at(parisA('2026-12-06', 23) + 45 * MIN).includes('apres-journee-1001'), '23:45 : récap L1');
  publier('apres-journee-1001', parisA('2026-12-06', 23) + 45 * MIN);
  const midi = at(parisA('2026-12-07', 12) + 5 * MIN);
  assert.ok(midi.includes('apres-journee-2001') && !midi.includes('classement-301-2026-12-07'), 'lundi midi : récap PL, pas le top buteurs');
  publier('apres-journee-2001', parisA('2026-12-07', 12) + 5 * MIN);
  assert.ok(!at(parisA('2026-12-07', 19) + 30 * MIN).includes('classement-301-2026-12-07'), 'lundi 19:30 : carrousel, pas de vidéo');
  assert.ok(at(parisA('2026-12-07', 21) + 5 * MIN).includes('classement-301-2026-12-07'), 'lundi 21:05 : top buteurs');
});

test('carrousel du lundi 19 h : aucune vidéo entre 17 h et 21 h ; autres jours inchangés', () => {
  const c = conf({ rythme: { ...conf().rythme, joursMatch: ['2026-12-07', '2026-12-08'] } });
  const t = { format: 'apres-journee', ligue: 8, poids: 5 };
  assert.equal(permis(t, 'instagram', [], parisA('2026-12-07', 19) + 30 * MIN, c).raison, 'carrousel');
  assert.equal(permis(t, 'instagram', [], parisA('2026-12-07', 20) + 55 * MIN, c).raison, 'carrousel');
  assert.ok(permis(t, 'instagram', [], parisA('2026-12-07', 21) + 5 * MIN, c).ok);
  assert.ok(permis(t, 'instagram', [], parisA('2026-12-08', 19) + 30 * MIN, c).ok, 'mardi : pas de carrousel');
});

test('journée avancée (2 matchs seulement) : ni avant-journée ni récap', () => {
  id = 500;
  const ms = [M(564, 4023, '2026-12-02', 19, 3468, 594), M(564, 4023, '2026-12-02', 21, 7980, 83, 'NS', 30)];
  const journal = [];
  choixSujets(ms, conf(), parisA('2026-12-01', 9), { journal });
  assert.ok(journal.some((j) => /2 match/.test(j.raison)));
  // Les tâches de cette journée sautent (elles ne passent pas à côté du choix).
  const t = parisA('2026-12-02', 12) + 5 * MIN;
  assert.ok(!taches(ms, conf(), t, { pubs: [] }).some((x) => /4023/.test(x.cle)), 'pas d\'avant-journée');
  const fin = ms.map((m) => ({ ...m, etat: 'FT' })), vus = Object.fromEntries(fin.map((m) => [m.id, m.debut + 115 * MIN]));
  assert.ok(!taches(fin, conf(), parisA('2026-12-03', 12) + 5 * MIN, { vusFinis: vus, pubs: [] }).some((x) => /4023/.test(x.cle)), 'pas de récap');
  // Le choc Atlético–Barça de ce soir-là garde son après-match (ce n'est pas un jour de récap).
  const r = choixSujets(fin, conf(), parisA('2026-12-02', 23) + 30 * MIN, { vusFinis: vus });
  const a = r.affect.get(`apres-match-${ms[1].id}`);
  assert.equal(a && `${a.jour} ${a.creneau}`, '2026-12-02 soir');
});

test('choix coupé (actif:false) : règle d\'avant, Ligue 1 seule en avant-journée et récap', () => {
  const c = conf(); c.rythme.choix.actif = false; c.rythme.liguesJourDeMatch = [301, 2];
  const ms = semaineType(), vus = {};
  const t = parisA('2026-12-06', 21);
  const x = finir(ms, t); for (const m of x) if (m.etat === 'FT') vus[m.id] = m.debut + 115 * MIN;
  const cles = taches(x, c, t, { vusFinis: vus }).map((y) => y.cle);
  assert.ok(!cles.some((k) => k === 'apres-journee-2001' || k === 'apres-journee-3001'), 'PL et Liga écartés comme avant');
  assert.equal(permis({ format: 'apres-journee', ligue: 8 }, 'instagram', [], parisA('2026-12-07', 19) + 30 * MIN, { ...c, rythme: { ...c.rythme, joursMatch: ['2026-12-07'] } }).ok, true, 'pas de règle carrousel quand le choix est coupé');
});

test('les stories (instagram-story) n\'occupent pas un créneau de vidéo', () => {
  const c = conf(), ms = semaineType();
  const pubs = [{ reseau: 'instagram-story', t: parisA('2026-12-06', 20), cle: 'story-avant-9' }, { reseau: 'instagram', t: parisA('2026-12-06', 20) + 5 * MIN, cle: 'story-apres-8', story: true }];
  const a = choixSujets(ms, c, parisA('2026-12-03', 9), { pubs }).affect.get('apres-journee-1001');
  assert.equal(`${a.jour} ${a.creneau}`, '2026-12-06 soir');
});

test('avant-journée sans aucun créneau possible : il saute (il ne passe pas à côté du choix)', () => {
  const c = conf(), ms = semaineType();
  // Samedi 14:30 : la PL a commencé (13:30), prochain match à 16:00 → le créneau de midi est fini, la veille est passée.
  id = 900;
  const pl = ms.filter((m) => m.ligue === 8).map((m) => ({ ...m, debut: m.debut + (m.debut < parisA('2026-12-06', 0) ? 0 : -24 * HEURE) }));
  const t = parisA('2026-12-05', 14) + 30 * MIN;
  const x = finir(pl, t);
  const vus = Object.fromEntries(x.filter((m) => m.etat === 'FT').map((m) => [m.id, m.debut + 115 * MIN]));
  assert.ok(!taches(x, c, t, { vusFinis: vus, pubs: [] }).some((y) => y.cle === 'avant-journee-2001'));
});
