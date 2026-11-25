import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Pal, type Son } from './kit';
import { OuvertureVignette, VIGNETTE_FIN } from './Vignettes';
import { planBruitages, type Evenement } from './sonsFluide';
import { CONTACT, OPTIONS_SONS, graineDe, sonsScorro } from './sonsScorro';

// Avant-journée (Ligue 1), style v3. Données : data/avant-journee-<round>.json (tous les matchs de la journée, rangs au classement).
// Image 0 = vignette → « AVANT-JOURNÉE / LIGUE 1 » → le soulignement devient la carte : les matchs arrivent un par un (jour, heure, écussons, rangs)
// → un disque sombre devient le fond : « TON MATCH À NE PAS RATER ? » → fin.
const P = PALETTES['avant-journee'];
const SOMBRE: Pal = { fond: '#0B0E14', encre: '#F4F6FA', accent: '#FF8A3D', clair: false };
const H0 = 14, R1 = 72, L0 = 88, PAR = 14, QUESTION = 90, FIN_D = 66;
export const tempsAvantJournee = (d: any) => { const n = d.matchs?.length ?? 0, R2 = Math.max(L0 + n * PAR + 90, 300), F = R2 + QUESTION; return { n, R2, F, total: F + FIN_D }; };
const CARTE = { x: 60, y: 330, w: 960, h: 1290, r: 52 };

const Accroche: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 24) return null;
  const l2 = d.ligue.nom.toUpperCase(), t1 = taillePourLargeur('AVANT-JOURNÉE', 900, 900, 200), t2 = taillePourLargeur(l2, 860, 900, 220), k = doux(f, R1, R1 + 18);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}>
    <Mots p={P} tailles={[t1, t2]} lignes={[[{ t: 'AVANT-JOURNÉE', f: H0 }], [{ t: l2, f: H0 + 7, souligne: H0 + 26 }]]} />
    <div style={{ marginTop: 30, fontFamily: POLICE, fontWeight: 800, fontSize: 50, color: P.encre, opacity: 0.8 * doux(f, H0 + 16, H0 + 28) }}>{d.ligue.texte?.split(' · ')[1] ?? d.accroche}</div>
  </AbsoluteFill>;
};
const Carte: React.FC<{ fin: number }> = ({ fin }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2 || f > fin + 30) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(240, CARTE.x), y: l(1000, CARTE.y), w: l(600, CARTE.w), h: l(16, CARTE.h), r: l(8, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = doux(f, fin + 4, fin + 20);
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, opacity: 1 - sortie }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.encre, opacity: 1 - verre }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const LigneMatch: React.FC<{ m: any; debut: number; n: number }> = ({ m, debut, n }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 200;
  const h = n > 9 ? 108 : 122, logo = n > 9 ? 64 : 76, txt = n > 9 ? 34 : 38;
  const eq = (e: any, droite: boolean) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: droite ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
      <Img src={staticFile(e.logo)} style={{ width: logo, height: logo, objectFit: 'contain' }} />
      <div style={{ minWidth: 0, textAlign: droite ? 'right' : 'left' }}>
        <div style={{ color: P.encre, fontWeight: 900, fontSize: e.nom.length > 13 ? txt * 0.8 : txt, lineHeight: 1.02 }}>{e.nom}</div>
        {e.rang && <div style={{ color: P.encre, opacity: 0.65, fontWeight: 700, fontSize: txt * 0.72 }}>{e.rang}</div>}
      </div>
    </div>
  );
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderRadius: 24, background: 'rgba(255,255,255,0.35)', transform: `translateX(${(1 - q(f)) * 220}px)`, opacity: Math.min(1, q(f) * 2), filter: flouVitesse(v, 12) }}>
      {eq(m.dom, false)}
      <div style={{ width: 150, textAlign: 'center', flexShrink: 0 }}><div style={{ color: P.encre, fontWeight: 900, fontSize: txt * 1.25 }}>{m.heure}</div><div style={{ color: P.encre, opacity: 0.7, fontWeight: 700, fontSize: txt * 0.72 }}>{m.jour}</div></div>
      {eq(m.ext, true)}
    </div>
  );
};
const Liste: React.FC<{ d: any; t: any }> = ({ d, t }) => {
  const f = useCurrentFrame();
  const z = 1 + 0.05 * doux(f, 0, t.R2 - L0), sortie = doux(f, t.R2 - L0 - 2, t.R2 - L0 + 12);
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 34, top: CARTE.y + 40, width: CARTE.w - 68, height: CARTE.h - 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, transform: `scale(${z})`, opacity: 1 - sortie, fontFamily: POLICE }}>
      {d.matchs.map((m: any, i: number) => <LigneMatch key={m.id} m={m} debut={i * PAR} n={t.n} />)}
    </div>
  );
};
const Disque: React.FC<{ debut: number }> = ({ debut }) => {
  const f = useCurrentFrame();
  if (f < debut - 4) return null;
  const k = doux(f, debut - 4, debut + 20), r = 30 + k * 2300;
  return <div style={{ position: 'absolute', left: 540 - r, top: 940 - r, width: 2 * r, height: 2 * r, borderRadius: r, background: SOMBRE.fond }} />;
};
const Question: React.FC = () => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret) return null;
  const t1 = taillePourLargeur('TON MATCH', 860, 900, 200), t2 = taillePourLargeur('À NE PAS', 700, 900, 200), t3 = taillePourLargeur('RATER ?', 760, 900, 220);
  const z = 1 + 0.05 * doux(f, 0, QUESTION + 10), sortie = doux(f, QUESTION - 4, QUESTION + 8);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${z})`, opacity: 1 - sortie }}><Mots p={SOMBRE} tailles={[t1, t2, t3]} lignes={[[{ t: 'TON', f: 0 }, { t: 'MATCH', f: 5 }], [{ t: 'À', f: 10 }, { t: 'NE', f: 13 }, { t: 'PAS', f: 16 }], [{ t: 'RATER', f: 20, souligne: 34 }, { t: '?', f: 24 }]]} /></AbsoluteFill>;
};
export const sonsAvantJourneeV3 = (d: any): Son[] => {
  const t = tempsAvantJournee(d), coups = ['sons/v3/pop-1.wav', 'sons/v3/clic-1.wav', 'sons/v3/pop-2.wav', 'sons/v3/clic-2.wav', 'sons/v3/pop-3.wav'];
  return [
    { f: 0, src: 'sons/fond-a.mp3', volume: 0.45, duree: t.F },
    { f: VIGNETTE_FIN, src: 'sons/sifflet-court.mp3', volume: 0.15, duree: 40 },
    { f: H0 + 26, src: 'sons/v3/impact-1.wav', volume: 0.15 },
    { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.2, duree: 30 },
    ...Array.from({ length: t.n }, (_, i) => ({ f: L0 + i * PAR + 4, src: coups[i % coups.length], volume: 0.13 })),
    { f: t.R2 - 4, src: 'sons/v3/souffle-1.wav', volume: 0.18 },
    { f: t.R2 + 34, src: 'sons/v3/impact-2.wav', volume: 0.15 },
    { f: t.F, src: 'sons/v3/reussite-1.wav', volume: 0.15, duree: 60 },
  ];
};
// Méthode sons du 24/11 (skill video-fluide) : chaque son démarre à l'image exacte du mouvement (contact du ressort, début du raccord),
// variantes sans répétition tirées par graine, ≤ 1 son marquant / 2 s (les autres ÷ 3), sons CC BY écartés (pas de crédit à ajouter), nappe Mixkit validée.
export const evenementsAvantJournee = (d: any): Evenement[] => {
  const t = tempsAvantJournee(d), dernier = L0 + (t.n - 1) * PAR;
  return [
    { f: VIGNETTE_FIN, action: 'sifflet' },                          // la vignette s'ouvre
    { f: H0, action: 'frappe' },                                     // « AVANT-JOURNÉE » mot par mot (frappes au début seulement)
    { f: H0 + 26, action: 'sparkle', secondaire: true },             // soulignement lumineux
    { f: R1, action: 'raccord' },                                    // le soulignement devient la carte
    ...Array.from({ length: t.n - 1 }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => ({ f: L0 + i * PAR, action: 'carte' as const, secondaire: true })), // une ligne sur deux glisse
    { f: dernier + CONTACT, action: 'impact' },                      // la dernière ligne se pose
    { f: t.R2 - 4, action: 'zoomAvant' },                            // le disque sombre devient le fond
    { f: t.R2, action: 'frappe' },                                   // « TON MATCH À NE PAS RATER ? »
    { f: t.R2 + 34, action: 'clic', secondaire: true },              // soulignement de RATER (clic : un seul sparkle à attaque nette)
    { f: t.F - 14 + CONTACT, action: 'ding' },                       // le logo Scorro se pose (FinV3)
  ];
};
export const sonsAvantJourneeFluide = (d: any): Son[] => sonsScorro(tempsAvantJournee(d).total, planBruitages(evenementsAvantJournee(d), { graine: graineDe(d), ...OPTIONS_SONS }), d.diagSons ?? {});
export const AvantJourneeV3: React.FC<any> = (d) => {
  const t = tempsAvantJournee(d);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      <Carte fin={t.R2 - 6} />
      <Accroche d={d} />
      <Sequence from={L0} durationInFrames={t.R2 - L0 + 14}><Liste d={d} t={t} /></Sequence>
      <Disque debut={t.R2} />
      <Sequence from={t.R2} durationInFrames={QUESTION + 10}><Question /></Sequence>
      <Sequence from={t.F - 8}><FinV3 p={SOMBRE} /></Sequence>
      <OuvertureVignette format="avant-journee" data={d} />
      {d.sons && <Sons liste={d.sonsAnciens ? sonsAvantJourneeV3(d) : sonsAvantJourneeFluide(d)} />}
      <Grain />
    </AbsoluteFill>
  );
};
