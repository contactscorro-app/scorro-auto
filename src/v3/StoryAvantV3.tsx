import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Son } from './kit';
import { OuvertureVignette, VIGNETTE_FIN } from './Vignettes';
import { planBruitages as planBruitagesAncien, NAPPES, VOLUME_NAPPE } from './sons';
import { planBruitages, type Evenement } from './sonsFluide';
import { CONTACT, OPTIONS_SONS, graineDe, sonsScorro } from './sonsScorro';

// Story avant-match, style v3 (≈ 8 s). Données : data/avant-match-<id>.json. Image 0 = vignette → « TON / PRONO ? » → le soulignement devient la carte :
// écussons qui tombent, heure, « 1, N ou 2 ? » → fin Scorro. Pas de « commentaire » : une story n'en a pas.
const P = PALETTES['avant-match'];
const H0 = 14, R1 = 62, C0 = 78, F = 214, DUREE_STORY_AVANT_V3 = F + 40;
export { DUREE_STORY_AVANT_V3 };
const CARTE = { x: 70, y: 460, w: 940, h: 960, r: 52 };

const Accroche: React.FC = () => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 24) return null;
  const t1 = taillePourLargeur('TON', 520, 900, 240), t2 = taillePourLargeur('PRONO ?', 860, 900, 240), k = doux(f, R1, R1 + 18);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}><Mots p={P} tailles={[t1, t2]} lignes={[[{ t: 'TON', f: H0 }], [{ t: 'PRONO', f: H0 + 6, souligne: H0 + 24 }, { t: '?', f: H0 + 11 }]]} /></AbsoluteFill>;
};
const Carte: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(200, CARTE.x), y: l(1010, CARTE.y), w: l(560, CARTE.w), h: l(16, CARTE.h), r: l(8, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.accent, opacity: 1 - verre, boxShadow: `0 0 34px ${P.accent}` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const Ecusson: React.FC<{ src: string; debut: number }> = ({ src, debut }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 240;
  return <Img src={staticFile(src)} style={{ width: 250, height: 250, objectFit: 'contain', transform: `translateY(${(1 - q(f)) * -240}px)`, opacity: Math.min(1, q(f) * 3), filter: flouVitesse(v, 16) }} />;
};
const Contenu: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const h = arrivee(f, fps, 18), z = 1 + 0.06 * doux(f, 0, F - C0);
  const eq = (e: any, debut: number) => <div style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}><Ecusson src={e.logo} debut={debut} /><div style={{ color: P.encre, fontWeight: 800, fontSize: e.nom.length > 14 ? 32 : 40, textAlign: 'center' }}>{e.nom}</div></div>;
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 40, top: CARTE.y + 90, width: CARTE.w - 80, transform: `scale(${z})`, fontFamily: POLICE, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color: P.accent, fontWeight: 800, fontSize: 42, letterSpacing: 1, opacity: doux(f, 0, 8), textAlign: 'center' }}>{[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ').toUpperCase()}</div>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>{eq(d.dom, 2)}<div style={{ color: P.accent, fontWeight: 900, fontSize: 90 }}>VS</div>{eq(d.ext, 6)}</div>
      <div style={{ marginTop: 44, color: P.encre, fontWeight: 900, fontSize: 120, transform: `scale(${h})`, fontVariantNumeric: 'tabular-nums' }}>{d.heure}</div>
      <div style={{ color: P.encre, opacity: 0.8 * doux(f, 24, 34), fontWeight: 700, fontSize: 40 }}>{d.jour}</div>
      <div style={{ marginTop: 50, opacity: doux(f, 40, 52), transform: `translateY(${(1 - doux(f, 40, 52)) * 30}px)` }}><span style={{ color: P.encre, fontWeight: 900, fontSize: 70 }}>1, N ou 2 ?</span></div>
    </div>
  );
};
// Nouvelle banque (24/11) : un son par action clé, au plus ~1 marquant / 2 s, nappe de stade basse.
export const sonsStoryAvantV3Fluide = (id = 0): Son[] => [
  { f: 0, src: NAPPES.stade, volume: VOLUME_NAPPE * 1.6, duree: F + 40 },
  ...planBruitagesAncien([
    { f: VIGNETTE_FIN, action: 'carte' },          // la vignette part
    { f: H0, action: 'frappe' },                   // « TON PRONO ? »
    { f: R1, action: 'raccord' },                  // le soulignement devient la carte
    { f: C0 + 10, action: 'impact', secondaire: true }, // les écussons tombent
    { f: C0 + 18, action: 'sifflet' },             // l'heure du coup d'envoi
    { f: C0 + 40, action: 'bulle' },               // « 1, N ou 2 ? »
    { f: F, action: 'zoomArriere' },               // fin
  ], { graine: id || 7, gainGlobal: 0.9 }),
];
export const sonsStoryAvantV3 = (): Son[] => [
  { f: 0, src: 'sons/fond-a.mp3', volume: 0.45, duree: F },
  { f: VIGNETTE_FIN, src: 'sons/sifflet-court.mp3', volume: 0.15, duree: 40 },
  { f: H0 + 24, src: 'sons/v3/clic-1.wav', volume: 0.16 },
  { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.2, duree: 30 },
  { f: C0 + 10, src: 'sons/v3/impact-1.wav', volume: 0.16 },
  { f: C0 + 18, src: 'sons/v3/pop-2.wav', volume: 0.15 },
  { f: C0 + 40, src: 'sons/v3/clic-2.wav', volume: 0.15 },
  { f: F, src: 'sons/v3/impact-2.wav', volume: 0.16 },
];
// Méthode sons du 24/11 (skill video-fluide, étendue aux stories le 25/11) : voir AvantJourneeV3. Chaque son tombe sur l'image exacte du mouvement.
export const evenementsStoryAvant = (): Evenement[] => [
  { f: VIGNETTE_FIN, action: 'sifflet' },                 // la vignette s'ouvre
  { f: H0, action: 'frappe' },                            // « TON PRONO ? » mot par mot
  { f: H0 + 24, action: 'clic', secondaire: true },       // soulignement de PRONO
  { f: R1, action: 'raccord' },                           // le soulignement devient la carte
  { f: C0 + 2 + CONTACT, action: 'impact' },              // le 1er écusson se pose (le 2e suit, sans son)
  { f: C0 + 40, action: 'bulle', secondaire: true },      // « 1, N ou 2 ? » arrive
  { f: F - 14 + CONTACT, action: 'ding' },                // le logo Scorro se pose (FinV3)
];
export const sonsStoryAvantFluide = (d: any): Son[] => sonsScorro(DUREE_STORY_AVANT_V3, planBruitages(evenementsStoryAvant(), { graine: graineDe({ id: d.fixtureId ?? 0 }), ...OPTIONS_SONS }), d.diagSons ?? {});
export const StoryAvantV3: React.FC<any> = (d) => (
  <AbsoluteFill style={{ fontFamily: POLICE }}>
    <FondV3 p={P} />
    <Carte />
    <Accroche />
    <Sequence from={C0} durationInFrames={F - C0 + 8}><Contenu d={d} /></Sequence>
    <Sequence from={F - 8}><FinV3 p={P} /></Sequence>
    <OuvertureVignette format="avant-match" data={d} />
    {d.sons && <Sons liste={d.sonsAnciens ? sonsStoryAvantV3Fluide(d.fixtureId ?? 0) : sonsStoryAvantFluide(d)} />}
    <Grain />
  </AbsoluteFill>
);
