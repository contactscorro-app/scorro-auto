// Fond léger fond-a (l'éditeur 25/11 18:54 ; Q60 = a, 25/11 20:44) : SEUL fond continu autorisé, au niveau bas du Top 5 du 23/11 (0,08), dans le Top 5,
// le récap, l'avant-journée et les stories ; duel, fonctionnalités et vidéo après-match : aucun fond ;
// aucun autre fond continu (stade, nappes, ambiance, foule…). Teste le filtre de rendu (kit.sonsJoues) et les plans réels de chaque format.
// node --test scripts/v3/fond-a.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const tmp = path.join(R, 'out', `_test-fond-a-${process.pid}.mjs`);
fs.mkdirSync(path.dirname(tmp), { recursive: true });
await build({ stdin: { contents: `export { sonsJoues, estContinu, FOND_A, SRC_FOND_A, FONDU_WHOOSH, fonduFin } from './src/v3/kit'; export { sonsRecapV3 } from './src/v3/RecapV3'; export { sonsAvantJourneeV3 } from './src/v3/AvantJourneeV3'; export { sonsApresV3 } from './src/v3/ApresMatchV3'; export { sonsStoryAvantV3 } from './src/v3/StoryAvantV3'; export { sonsDuelV3 } from './src/v3/DuelV3'; export { sonsTop5V3 } from './src/v3/Top5V3'; export { sonsFoncAncien } from './src/v3/FonctionnaliteV3';`, resolveDir: R, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: tmp, jsx: 'automatic', loader: { '.png': 'empty' }, logLevel: 'error', external: ['remotion', 'react', '@remotion/*'] });
const m = await import(pathToFileURL(tmp).href); fs.rmSync(tmp);
const lire = (f) => JSON.parse(fs.readFileSync(path.join(R, 'data', f), 'utf8'));
const donnees = (prefixe) => fs.readdirSync(path.join(R, 'data')).filter((f) => f.startsWith(prefixe) && f.endsWith('.json')).map((f) => [f, lire(f)]);

const sansFond = (nom, liste) => { for (const b of m.sonsJoues(liste)) assert.ok(!/(nappe|fond|ambiance|stade|tribunes|foule|clameur|applaudissements)/.test(b.src), `${nom} : son continu ${b.src}`); };
const verifier = (nom, liste) => {
  const joues = m.sonsJoues(liste);
  const fonds = joues.filter((b) => b.src === m.SRC_FOND_A);
  assert.equal(fonds.length, 1, `${nom} : un seul fond-a attendu`);
  assert.equal(fonds[0].volume, m.FOND_A, `${nom} : fond-a au niveau bas`);
  assert.ok(fonds[0].volume <= 0.08, `${nom} : fond-a ≤ 0,08`);
  for (const b of joues) if (b !== fonds[0]) assert.ok(!/(nappe|fond|ambiance|stade|tribunes|foule|clameur|applaudissements)/.test(b.src), `${nom} : autre son continu ${b.src}`);
};

test('filtre : fond-a passe (ramené à 0,08), tout autre son continu est retiré', () => {
  assert.equal(m.FOND_A, 0.08);
  const j = m.sonsJoues([{ f: 0, src: 'sons/fond-a.mp3', volume: 0.45, duree: 300 }, { f: 0, src: 'sons/ambiance-stade.mp3', volume: 0.3 }, { f: 0, src: 'sons/fond-c.mp3', volume: 0.07 }, { f: 0, src: 'sons-fluide/nappes/nappe-air.mp3', volume: 0.05 }, { f: 2, src: 'sons/clameur-courte.mp3', volume: 0.2 }, { f: 3, src: 'sons/v3/pop-1.wav', volume: 0.2 }]);
  assert.deepEqual(j.map((b) => [b.src, b.volume]), [['sons/fond-a.mp3', 0.08], ['sons/v3/pop-1.wav', 0.2]]);
  assert.ok(!m.estContinu({ f: 0, src: 'sons/fond-a.mp3', volume: 0.08 }));
  for (const src of ['sons/fond-a-brut.mp3', 'sons/fond-d.mp3', 'sons/stade-joie.mp3', 'sons/applaudissements.mp3', 'sons-fluide/foot/stade-ambiance-1.mp3']) assert.ok(m.estContinu({ f: 0, src, volume: 0.1 }), src);
  assert.equal(m.sonsJoues([{ f: 0, src: 'sons/fond-a.mp3', volume: 0.02 }])[0].volume, 0.02, 'plus bas que 0,08 : gardé');
});
test('top 5 : fond-a à 0,08 comme au 23/11', () => { for (const n of [3, 5, 6]) verifier(`top5-${n}`, m.sonsTop5V3(n)); });
test('récap : fond-a à 0,08 (plus 0,45) sur tous les JSON', () => { const d = donnees('apres-journee'); assert.ok(d.length); for (const [f, x] of d) verifier(f, m.sonsRecapV3(x)); });
test('avant-journée : fond-a à 0,08', () => { const d = donnees('avant-journee'); assert.ok(d.length); for (const [f, x] of d) verifier(f, m.sonsAvantJourneeV3(x)); });
test('story après : fond-a à 0,08 ; vidéo après-match : aucun fond', () => { const d = donnees('score-final'); assert.ok(d.length); for (const [f, x] of d.slice(0, 10)) { verifier(`story-${f}`, m.sonsApresV3({ ...x, story: true })); sansFond(f, m.sonsApresV3({ ...x, story: false })); } });
test('story avant : fond-a à 0,08', () => verifier('story-avant', m.sonsStoryAvantV3()));
test('duel : aucun fond', () => { const d = donnees('format-duel'); assert.ok(d.length); for (const [f, x] of d) sansFond(f, m.sonsDuelV3(x)); });
test('fonctionnalités : aucun fond', () => { const d = donnees('format-fonc-'); assert.ok(d.length); for (const [f, x] of d) sansFond(f, m.sonsFoncAncien(x)); });
test('fondu de 0,2 s à la fin du whoosh seulement (Q59)', () => { assert.equal(m.FONDU_WHOOSH, 6); assert.equal(m.fonduFin({ f: 0, src: 'sons/whoosh-2.mp3', volume: 0.2 }), 6); assert.equal(m.fonduFin({ f: 0, src: 'sons/v3/pop-1.wav', volume: 0.2 }), 0); });
