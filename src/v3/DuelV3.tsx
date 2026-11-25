import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Photo } from '../commun';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Pal, type Son } from './kit';
import { OuvertureVignette, VIGNETTE_FIN } from './Vignettes';
import { planBruitages, type Evenement } from './sonsFluide';
import { CONTACT, OPTIONS_SONS, graineDe, sonsScorro } from './sonsScorro';

// ② Duel « X ou Y ? », style v3. Données : data/format-duel-<ligue>.json (buts recoupés avec les événements, stats Sportmonks de la saison).
// Image 0 = vignette → « SINAYOKO / OU / GOUIRI ? » → le soulignement devient la carte : les deux joueurs arrivent de chaque côté, puis 5 stats,
// la meilleure valeur s'allume → un disque clair devient le fond : « TU PRENDS QUI ? » → fin.
const P = PALETTES.duel;
const CLAIR: Pal = { fond: '#F4F6FA', encre: '#0B0E14', accent: '#FF4D5E', clair: true };
const H0 = 14, R1 = 72, C0 = 88, S0 = C0 + 30, PAR = 32, R2_APRES = 18, QUESTION = 84, FIN_D = 66;
export const tempsDuel = (d: any) => { const n = d.lignes?.length ?? 5, R2 = S0 + n * PAR + R2_APRES, F = R2 + QUESTION; return { n, R2, F, total: F + FIN_D }; };
const CARTE = { x: 60, y: 330, w: 960, h: 1260, r: 52 };

const Accroche: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 24) return null;
  const a = d.a.nom.toUpperCase(), b = `${d.b.nom.toUpperCase()} ?`;
  const ta = taillePourLargeur(a, 860, 900, 230), tb = taillePourLargeur(b, 860, 900, 230), k = doux(f, R1, R1 + 18);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}>
    <Mots p={P} tailles={[ta, 96, tb]} lignes={[[{ t: a, f: H0 }], [{ t: 'OU', f: H0 + 7, couleur: P.accent }], [{ t: d.b.nom.toUpperCase(), f: H0 + 12, souligne: H0 + 30 }, { t: '?', f: H0 + 16 }]]} />
  </AbsoluteFill>;
};
const Carte: React.FC<{ fin: number }> = ({ fin }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2 || f > fin + 30) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(240, CARTE.x), y: l(1080, CARTE.y), w: l(600, CARTE.w), h: l(16, CARTE.h), r: l(8, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = doux(f, fin + 4, fin + 20);
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, opacity: 1 - sortie }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.accent, opacity: 1 - verre, boxShadow: `0 0 34px ${P.accent}` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const Joueur: React.FC<{ j: any; debut: number; cote: number }> = ({ j, debut, cote }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 300;
  return (
    <div style={{ width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transform: `translateX(${(1 - q(f)) * 300 * cote}px)`, opacity: Math.min(1, q(f) * 2), filter: flouVitesse(v, 16) }}>
      <Photo j={j} taille={250} style={{ border: `5px solid ${P.accent}` }} />
      <div style={{ color: P.encre, fontWeight: 900, fontSize: 52, textAlign: 'center', lineHeight: 1.05 }}>{j.nom}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Img src={staticFile(j.logo)} style={{ width: 40, height: 40, objectFit: 'contain' }} /><span style={{ color: P.encre, opacity: 0.75, fontWeight: 700, fontSize: 30 }}>{j.club}</span></div>
    </div>
  );
};
const LigneStat: React.FC<{ l: any; debut: number }> = ({ l, debut }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), g = arrivee(f, fps, debut + 12);
  const val = (x: number, gagne: boolean) => <span style={{ minWidth: 170, display: 'inline-block', color: gagne ? P.accent : P.encre, fontWeight: 900, fontSize: 70, fontVariantNumeric: 'tabular-nums', transform: `scale(${gagne ? 1 + 0.12 * g + 0.04 * g * Math.sin(f / 5) : 1})`, textShadow: gagne ? `0 0 ${(16 + 14 * Math.sin(f / 6 + 1)) * g}px ${P.accent}` : undefined }}>{String(x).replace('.', ',')}</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 30px', borderRadius: 26, background: 'rgba(255,255,255,0.06)', transform: `translateY(${(1 - q(f)) * 60}px)`, opacity: Math.min(1, q(f) * 2), filter: flouVitesse(vitesse(q, f) * 60, 10) }}>
      {val(l.a, l.gagne === 1)}<span style={{ color: P.encre, opacity: 0.8, fontWeight: 800, fontSize: 36, textAlign: 'center' }}>{l.label}</span><span style={{ textAlign: 'right', minWidth: 170 }}>{val(l.b, l.gagne === 2)}</span>
    </div>
  );
};
const Contenu: React.FC<{ d: any; t: any }> = ({ d, t }) => {
  const f = useCurrentFrame();
  const z = 1 + 0.06 * doux(f, 0, t.R2 - C0), sortie = doux(f, t.R2 - C0 - 2, t.R2 - C0 + 12);
  const pouls = 0.5 + 0.5 * Math.sin(f / 6); // la valeur gagnante respire : jamais figé
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 50, top: CARTE.y + 110, width: CARTE.w - 100, transform: `scale(${z})`, transformOrigin: '50% 40%', ['--pouls' as any]: pouls, opacity: 1 - sortie, fontFamily: POLICE }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Joueur j={d.a} debut={0} cote={-1} /><div style={{ color: P.accent, fontWeight: 900, fontSize: 80, transform: `scale(${doux(f, 10, 20)})` }}>VS</div><Joueur j={d.b} debut={4} cote={1} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 70 }}>{d.lignes.map((l: any, i: number) => <LigneStat key={l.label} l={l} debut={S0 - C0 + i * PAR} />)}</div>
    </div>
  );
};
const Disque: React.FC<{ debut: number }> = ({ debut }) => {
  const f = useCurrentFrame();
  if (f < debut - 4) return null;
  const k = doux(f, debut - 4, debut + 20), r = 30 + k * 2300;
  return <div style={{ position: 'absolute', left: 540 - r, top: 940 - r, width: 2 * r, height: 2 * r, borderRadius: r, background: CLAIR.fond }} />;
};
const Question: React.FC = () => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret) return null;
  const t1 = taillePourLargeur('TU PRENDS', 860, 900, 220), t2 = taillePourLargeur('QUI ?', 600, 900, 260);
  const z = 1 + 0.05 * doux(f, 0, QUESTION + 10), sortie = doux(f, QUESTION - 4, QUESTION + 8);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${z})`, opacity: 1 - sortie }}><Mots p={CLAIR} tailles={[t1, t2]} lignes={[[{ t: 'TU', f: 0 }, { t: 'PRENDS', f: 5 }], [{ t: 'QUI', f: 11, souligne: 26 }, { t: '?', f: 16 }]]} /></AbsoluteFill>;
};
export const sonsDuelV3 = (d: any): Son[] => {
  const t = tempsDuel(d), coups = ['sons/v3/pop-1.wav', 'sons/v3/impact-1.wav', 'sons/v3/pop-2.wav', 'sons/v3/impact-2.wav', 'sons/v3/pop-3.wav'];
  return [
    { f: 0, src: 'sons/fond-a.mp3', volume: 0.45, duree: t.F },
    { f: H0 + 30, src: 'sons/v3/clic-1.wav', volume: 0.16 },
    { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.2, duree: 30 },
    { f: C0 + 8, src: 'sons/v3/impact-2.wav', volume: 0.16 },
    ...Array.from({ length: t.n }, (_, i) => ({ f: S0 + i * PAR + 12, src: coups[i % coups.length], volume: 0.15 })),
    { f: t.R2 - 4, src: 'sons/v3/souffle-1.wav', volume: 0.18 },
    { f: t.R2 + 26, src: 'sons/v3/clic-2.wav', volume: 0.15 },
    { f: t.F, src: 'sons/v3/reussite-1.wav', volume: 0.15, duree: 60 },
  ];
};
// Méthode sons du 24/11 (étendue au duel le 25/11) : voir AvantJourneeV3. Les stats arrivent toutes les 1,1 s : clics discrets (secondaires).
export const evenementsDuel = (d: any): Evenement[] => {
  const t = tempsDuel(d);
  return [
    { f: VIGNETTE_FIN, action: 'sifflet' },                              // la vignette s'ouvre
    { f: H0, action: 'frappe' },                                         // « A / OU / B ? »
    { f: H0 + 30, action: 'clic', secondaire: true },                    // soulignement du 2e nom
    { f: R1, action: 'raccord' },                                        // le soulignement devient la carte
    { f: C0 + 4 + CONTACT, action: 'impact', secondaire: true },         // les deux joueurs se posent
    ...Array.from({ length: t.n }, (_, i) => ({ f: S0 + i * PAR + CONTACT, action: 'clic' as const, secondaire: true })), // chaque ligne de stats se pose
    { f: t.R2 - 4, action: 'zoomAvant' },                                // le disque clair devient le fond
    { f: t.R2, action: 'frappe' },                                       // « TU PRENDS QUI ? »
    { f: t.F - 14 + CONTACT, action: 'ding' },                           // le logo Scorro se pose (FinV3)
  ];
};
export const sonsDuelFluide = (d: any): Son[] => sonsScorro(tempsDuel(d).total, planBruitages(evenementsDuel(d), { graine: graineDe({ matchs: [d.a, d.b] }), ...OPTIONS_SONS }), d.diagSons ?? {});
export const DuelV3: React.FC<any> = (d) => {
  const t = tempsDuel(d);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      <Carte fin={t.R2 - 6} />
      <Accroche d={d} />
      <Sequence from={C0} durationInFrames={t.R2 - C0 + 14}><Contenu d={d} t={t} /></Sequence>
      <Disque debut={t.R2} />
      <Sequence from={t.R2} durationInFrames={QUESTION + 10}><Question /></Sequence>
      <Sequence from={t.F - 8}><FinV3 p={CLAIR} /></Sequence>
      <OuvertureVignette format="duel" data={d} />
      {d.sons && <Sons liste={d.sonsAnciens ? sonsDuelV3(d) : sonsDuelFluide(d)} />}
      <Grain />
    </AbsoluteFill>
  );
};
