// 28/11 (l'éditeur, Q-ligues-1 = a) : les midis réservés aux formats pas encore en v3 (« trois » le 29/11, « série » le 30/11) sont libérés ;
// la règle de score (choixSujets) les donne à une autre vidéo. Seuls les formats de formats.v3 gardent leur créneau.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { choixSujets, formatsReserves, permis, parisA, MIN } from './decider.mjs';

const vrai = JSON.parse(fs.readFileSync('data/auto-config.json', 'utf8'));

test('formats.v3 = les formats f-* marqués v3:true dans FORMATS d’auto.mjs (hors fonctionnalités)', () => {
  const src = fs.readFileSync('scripts/auto.mjs', 'utf8');
  const v3 = [...src.matchAll(/^\s*'f-([a-z0-9]+)': \{ v3: true/gm)].map((m) => m[1]).filter((f) => f !== 'fonc').sort();
  assert.deepEqual([...vrai.formats.v3].sort(), v3);
});

test('config réelle : trois (29/11) et série (30/11) ne réservent plus rien ; top5 et duel oui', () => {
  const garde = formatsReserves(vrai).map((e) => e.format);
  assert.ok(!garde.includes('trois') && !garde.includes('serie') && !garde.includes('carte'), garde.join(','));
  assert.ok(garde.includes('top5') && garde.includes('duel'));
  // Sans liste formats.v3 : comportement d'avant (tout le calendrier réservé).
  const avant = { ...vrai, formats: { ...vrai.formats } }; delete avant.formats.v3;
  assert.ok(formatsReserves(avant).some((e) => e.format === 'trois'));
});

const conf = (v3) => ({ ...structuredClone(vrai), formats: { ...structuredClone(vrai.formats), v3, calendrier: [{ date: '2026-12-13', creneau: 'matin', format: 'trois', ligue: 301 }] }, ordreFonctionnalites: [], carrousels: { actif: false } });
// Journée de Ligue 1 (9 matchs) le samedi 12 et le dimanche 13/12 : le récap du dimanche soir, et un après-match de choc le samedi.
let id = 1;
const M = (jour, h, dom, ext) => ({ id: id++, ligue: 301, round: 5001, season: 3010, debut: parisA(jour, h), etat: 'NS', dom, ext, nom: `${dom}-${ext}` });
const ms = [M('2026-12-12', 17, 1, 2), M('2026-12-12', 21, 591, 289), M('2026-12-13', 13, 3, 4), ...[5, 7, 9, 11].map((x) => M('2026-12-13', 15, x, x + 1)), M('2026-12-13', 17, 13, 14), M('2026-12-13', 20, 44, 450)];

test('choix des sujets : le midi d’un format pas en v3 est libre, celui d’un format v3 reste pris', () => {
  const libre = choixSujets(ms, conf(['top5', 'duel']), parisA('2026-12-11', 9)).pris.get('2026-12-13 matin');
  assert.ok(!/^format-trois/.test(libre ?? ''), `pris par ${libre}`);
  const garde = choixSujets(ms, conf(['top5', 'duel', 'trois']), parisA('2026-12-11', 9)).pris.get('2026-12-13 matin');
  assert.equal(garde, 'format-trois-2026-12-13');
});

test('permis : une vidéo du dimanche midi n’est plus bloquée par « trois » (créneau pris / plafond)', () => {
  const t = { cle: 'classement-301-2026-12-13', format: 'classement', id: 301, ligue: 301, reseaux: ['instagram', 'tiktok'] };
  const a = parisA('2026-12-13', 12) + 30 * MIN;
  const raison = (c) => { const p = permis(t, 'instagram', [], a, c); return p.ok ? 'ok' : p.raison; };
  assert.ok(!['créneau pris', 'plafond'].includes(raison(conf(['top5', 'duel']))), raison(conf(['top5', 'duel'])));
  assert.ok(['créneau pris', 'plafond'].includes(raison(conf(['top5', 'duel', 'trois']))), raison(conf(['top5', 'duel', 'trois'])));
});

test('tâches : plus de tâche « trois » ni « série » (rien à rendre ni à programmer) ; le top 5 d’un format v3 reste', async () => {
  const { tachesFormats } = await import('./decider.mjs');
  const c = { ...structuredClone(vrai), formats: { ...structuredClone(vrai.formats), calendrier: [{ date: '2026-12-13', creneau: 'matin', format: 'trois' }, { date: '2026-12-14', creneau: 'matin', format: 'top5' }] } };
  assert.deepEqual(tachesFormats(c, parisA('2026-12-12', 23)).filter((t) => t.cle.startsWith('format-') && !t.cle.startsWith('format-fonc')).map((t) => t.cle), []);
  assert.deepEqual(tachesFormats(c, parisA('2026-12-13', 23)).filter((t) => t.cle.startsWith('format-') && !t.cle.startsWith('format-fonc')).map((t) => t.cle), ['format-top5-2026-12-14']);
});
