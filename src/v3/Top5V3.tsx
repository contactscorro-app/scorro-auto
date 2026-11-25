import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Photo } from '../commun';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Pal, type Son } from './kit';
import { VignetteFormat } from './Vignettes';
import { planBruitages, type Evenement } from './sonsFluide';
import { CONTACT, OPTIONS_SONS, graineDe, sonsScorro } from './sonsScorro';

// ① Top 5 buteurs, style v3 (vidéo test du 22/11). Données : data/format-top5-<ligue>.json (recoupé avec /topscorers).
// Image 0 = vignette. Puis : accroche mot par mot (« QUI EST / LE N°1 ? », soulignement lumineux sur N°1) → le soulignement devient la carte de verre
// → les 5 lignes arrivent du 5e au 1er (dépassement + flou de vitesse) → un disque sombre part du n°1 et devient le fond (passage clair → sombre) → question → fin.
const P = PALETTES.top5;
// Mêmes 3 teintes inversées (nuit, jaune, bleu) : pas de lueur jaune sur fond sombre (elle vire au brun).
const SOMBRE: Pal = { fond: '#0B0E14', encre: '#FFD23F', accent: '#3E8BFF', clair: false };
// Rythme : une ligne par seconde, un temps de suspense avant le n°1, 2 s pour le lire (la caméra dérive : jamais figé).
export const V = 12, H0 = 14, R1 = 78, L0 = 92, PAR = 30, SUSPENSE = 18, R2 = L0 + 4 * PAR + SUSPENSE + 62, Q = R2 + 8, FIN = Q + 84, DUREE_TOP5_V3 = FIN + 66;
// 5 ou 6 lignes (ex æquo) dans la même durée : l'écart entre deux lignes s'adapte, le suspense précède toujours le n°1 (dernière ligne).
const debutLigne = (i: number, n = 5) => L0 + Math.round(i * (4 * PAR) / (n - 1)) + (i === n - 1 ? SUSPENSE : 0);
const CARTE = { x: 70, y: 400, w: 940, h: 1060, r: 52 };

const Accroche: React.FC = () => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 30) return null;
  const t1 = taillePourLargeur('QUI EST', 820, 900, 230), t2 = taillePourLargeur('LE N°1 ?', 860, 900, 260);
  const k = doux(f, R1, R1 + 22);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 640, opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}>
      <Mots p={P} tailles={[t1, t2]} lignes={[[{ t: 'QUI', f: H0 }, { t: 'EST', f: H0 + 5 }], [{ t: 'LE', f: H0 + 11 }, { t: 'N°1', f: H0 + 16, souligne: H0 + 30 }, { t: '?', f: H0 + 21, couleur: P.encre }]]} />
    </AbsoluteFill>
  );
};
// Raccord 1 : le soulignement de « N°1 » s'étire et s'épaissit jusqu'à devenir la carte de verre qui porte le classement.
const Carte: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2 || f > R2 + 30) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(380, CARTE.x), y: l(1000, CARTE.y), w: l(330, CARTE.w), h: l(18, CARTE.h), r: l(9, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = doux(f, R2 + 8, R2 + 24);
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, opacity: 1 - sortie }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.accent, opacity: 1 - verre, boxShadow: `0 0 34px ${P.accent}` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const Ligne: React.FC<{ j: any; i: number; max: number; n: number }> = ({ j, i, max, n }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const debut = debutLigne(i, n), premier = j.rang === 1 && i === n - 1, petit = n > 5;
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 320;
  const barre = doux(f, debut + 10, debut + 34) * (j.n / max);
  const lueur = premier ? interpolate(f, [debut + 6, debut + 14, debut + 50], [0, 1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const sortie = doux(f, R2 + 4, R2 + 20);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: petit ? '9px 26px' : '16px 26px', borderRadius: 32, background: premier ? `rgba(255,255,255,${0.55 * lueur})` : 'transparent', transform: `translateX(${(1 - q(f)) * -320}px)`, opacity: Math.min(1, q(f) * 2) * (1 - sortie), filter: flouVitesse(v, 16), boxShadow: premier ? `0 0 ${60 * lueur}px ${P.accent}88` : undefined }}>
      <span style={{ width: 74, fontFamily: POLICE, fontWeight: 900, fontSize: 64, color: P.encre }}>{j.rang}</span>
      <Photo j={j} taille={premier ? (petit ? 128 : 150) : petit ? 96 : 118} style={{ border: `4px solid ${premier ? P.accent : 'rgba(11,14,20,0.18)'}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: POLICE, fontWeight: 900, fontSize: premier ? 54 : 44, color: P.encre, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.nom}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}><Img src={staticFile(j.logo)} style={{ width: 36, height: 36, objectFit: 'contain' }} /><span style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 30, color: P.encre, opacity: 0.7 }}>{j.club}</span></div>
        <div style={{ height: 12, borderRadius: 6, background: 'rgba(11,14,20,0.12)', marginTop: 10 }}><div style={{ width: `${barre * 100}%`, height: '100%', borderRadius: 6, background: P.encre }} /></div>
      </div>
      <span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: premier ? 92 : 68, color: P.encre, fontVariantNumeric: 'tabular-nums', transform: `scale(${premier ? 1 + 0.08 * lueur : 1})` }}>{j.n}</span>
    </div>
  );
};
const Liste: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  if (f < L0 - 4 || f > R2 + 24) return null;
  const ordre = [...d.top].reverse(); // 5e → 1er ; le 1er s'affiche en haut
  const z = 1 + 0.05 * doux(f, L0, R2); // dérive lente de la caméra
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 20, top: CARTE.y + 170, width: CARTE.w - 40, display: 'flex', flexDirection: 'column-reverse', gap: ordre.length > 5 ? 12 : 26, transform: `scale(${z})`, transformOrigin: '50% 30%' }}>
      {ordre.map((j: any, i: number) => <Ligne key={j.id} j={j} i={i} n={ordre.length} max={d.top[0].n} />)}
    </div>
  );
};
const Entete: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  const o = doux(f, L0 - 10, L0 + 6) * (1 - doux(f, R2 + 2, R2 + 16));
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 40, top: CARTE.y + 44, right: 130, display: 'flex', alignItems: 'center', gap: 16, opacity: o, transform: `translateY(${(1 - o) * 20}px)` }}>
      <Img src={staticFile(d.ligue.logo)} style={{ width: 62, height: 62, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 6 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 46, color: P.encre, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>TOP 5 BUTEURS · {d.ligue.nom.toUpperCase()}</div>
        <div style={{ fontFamily: POLICE, fontWeight: 700, fontSize: 30, color: P.encre, opacity: 0.7, whiteSpace: 'nowrap' }}>{d.sousTitre.split(' · ')[1]}</div>
      </div>
    </div>
  );
};
// Raccord 2 : un disque sombre naît sur le n°1 et grandit jusqu'à devenir le fond (passage clair → sombre), la question arrive dessus.
const Disque: React.FC = () => {
  const f = useCurrentFrame();
  if (f < R2) return null;
  const k = doux(f, R2, R2 + 26), r = 40 + k * 2300;
  return <div style={{ position: 'absolute', left: 540 - r, top: CARTE.y + 230 - r, width: 2 * r, height: 2 * r, borderRadius: r, background: SOMBRE.fond }} />;
};
const Question: React.FC = () => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f < Q || f >= FIN + 12) return null;
  const t1 = taillePourLargeur("TU L'AVAIS", 860, 900, 220), t2 = taillePourLargeur('VU VENIR ?', 860, 900, 220);
  const z = 1 + 0.03 * doux(f, Q, FIN), sortie = doux(f, FIN - 4, FIN + 8);
  return <AbsoluteFill style={{ alignItems: 'center', paddingTop: 700, transform: `scale(${z + 0.15 * sortie})`, opacity: 1 - sortie, filter: sortie > 0.02 ? `blur(${sortie * 14}px)` : undefined }}><Mots p={SOMBRE} tailles={[t1, t2]} lignes={[[{ t: 'TU', f: Q }, { t: "L'AVAIS", f: Q + 5 }], [{ t: 'VU', f: Q + 11 }, { t: 'VENIR', f: Q + 16, souligne: Q + 30 }, { t: '?', f: Q + 21 }]]} /></AbsoluteFill>;
};
// Image 0 à V : la vignette, nette ; elle part en zoom flou pendant que l'accroche arrive.
const Ouverture: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  if (f > H0 + 14) return null;
  const k = doux(f, V, H0 + 12);
  return <AbsoluteFill style={{ opacity: 1 - k, transform: `scale(${1 + 0.18 * k})`, filter: k > 0.02 ? `blur(${k * 18}px)` : undefined }}><VignetteFormat format="top5" data={d} /></AbsoluteFill>;
};
export const sonsTop5V3 = (n = 5): Son[] => [
  { f: 0, src: 'sons/fond-a.mp3', volume: 0.08, duree: FIN },
  { f: V, src: 'sons/whoosh-2.mp3', volume: 0.22, duree: 30 },
  { f: H0, src: 'sons/v3/pop-1.wav', volume: 0.2 },
  { f: H0 + 30, src: 'sons/v3/clic-1.wav', volume: 0.18 },
  { f: R1, src: 'sons/v3/souffle-1.wav', volume: 0.2 },
  ...Array.from({ length: n - 1 }, (_, i) => ({ f: debutLigne(i, n) + 6, src: i % 2 ? 'sons/v3/pop-2.wav' : 'sons/v3/impact-1.wav', volume: 0.2 })),
  { f: debutLigne(n - 1, n) + 6, src: 'sons/v3/reussite-1.wav', volume: 0.26, duree: 60 },
  { f: R2, src: 'sons/whoosh-2.mp3', volume: 0.22, duree: 30 },
  { f: Q, src: 'sons/v3/pop-3.wav', volume: 0.2 },
  { f: Q + 30, src: 'sons/v3/clic-2.wav', volume: 0.18 },
  { f: FIN, src: 'sons/v3/impact-2.wav', volume: 0.2 },
];
// Méthode sons du 24/11 (étendue au top 5 le 25/11) : voir AvantJourneeV3. Une ligne par seconde : contact discret (secondaire), le n°1 marquant.
export const evenementsTop5 = (n = 5): Evenement[] => [
  { f: V, action: 'sifflet' },                                          // la vignette s'ouvre
  { f: H0, action: 'frappe' },                                          // « QUI EST LE N°1 ? »
  { f: H0 + 30, action: 'clic', secondaire: true },                     // soulignement de N°1
  { f: R1, action: 'raccord' },                                         // le soulignement devient la carte
  ...Array.from({ length: n - 1 }, (_, i) => ({ f: debutLigne(i, n) + CONTACT, action: 'impact' as const, secondaire: true })), // lignes 5e → 2e
  { f: debutLigne(n - 1, n) + CONTACT, action: 'impact' },               // le n°1 se pose
  { f: R2, action: 'zoomAvant' },                                       // le disque sombre devient le fond
  { f: Q, action: 'frappe' },                                           // « TU L'AVAIS VU VENIR ? »
  { f: Q + 30, action: 'clic', secondaire: true },                      // soulignement de VENIR
  { f: FIN - 16, action: 'ding' },                                      // le logo Scorro se pose (FinV3 à FIN-16, ressort à −6)
];
export const sonsTop5Fluide = (d: any): Son[] => sonsScorro(DUREE_TOP5_V3, planBruitages(evenementsTop5(d.top.length), { graine: graineDe({ matchs: d.top }), ...OPTIONS_SONS }), d.diagSons ?? {});
export const Top5V3: React.FC<any> = (d) => (
  <AbsoluteFill style={{ fontFamily: POLICE }}>
    <FondV3 p={P} />
    <Carte /><Entete d={d} /><Liste d={d} /><Accroche />
    <Disque /><Question />
    <Sequence from={FIN - 16}><FinV3 p={SOMBRE} /></Sequence>
    <Ouverture d={d} />
    {d.sons && <Sons liste={d.sonsAnciens ? sonsTop5V3(d.top.length) : sonsTop5Fluide(d)} />}
    <Grain />
  </AbsoluteFill>
);
