import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Pal, type Son } from './kit';
import { OuvertureVignette, VIGNETTE_FIN } from './Vignettes';

// Récap de journée (Ligue 1) ou de soirée (Ligue des champions), style v3. Données : data/apres-journee-<round>.json (scores recoupés).
// Image 0 = vignette → accroche « RÉCAP / LIGUE 1 » (soulignement) → le soulignement devient la carte de verre → un match par carte (écussons qui tombent,
// score, buteurs) → tous les scores → un disque clair grandit et devient le fond : le classement sur fond clair (alternance) → fin Scorro.
const P = PALETTES.recap;
const CLAIR: Pal = { fond: '#F4F6FA', encre: '#0B0E14', accent: '#3E8BFF', clair: true };
const H0 = 14, R1 = 72, M0 = 84, PAR = 54, TOUS = 110, CLASS = 150, FIN_D = 66;
export const tempsRecap = (d: any) => {
  const n = d.matchs?.length ?? 0, T = M0 + n * PAR, C = T + TOUS, F = C + (d.classement?.length ? CLASS : 0);
  return { n, T, C, F, total: F + FIN_D };
};
const CARTE = { x: 70, y: 420, w: 940, h: 1040, r: 52 };

const Accroche: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 26) return null;
  const l2 = d.ligue.nom.toUpperCase();
  const t1 = taillePourLargeur('RÉCAP', 700, 900, 240), t2 = taillePourLargeur(l2, 860, 900, 220);
  const k = doux(f, R1, R1 + 20);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 560, opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}>
      <Mots p={P} tailles={[t1, t2]} lignes={[[{ t: 'RÉCAP', f: H0 }], [{ t: l2, f: H0 + 7, souligne: H0 + 26 }]]} />
      <div style={{ marginTop: 34, fontFamily: POLICE, fontWeight: 800, fontSize: 50, color: P.accent, opacity: doux(f, H0 + 16, H0 + 28) }}>{[d.ligue.texte?.split(' · ')[1], d.sousTitre].filter(Boolean).join(' · ')}</div>
    </AbsoluteFill>
  );
};
// Raccord 1 : le soulignement devient la carte de verre.
const Carte: React.FC<{ fin: number }> = ({ fin }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2 || f > fin + 30) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(240, CARTE.x), y: l(900, CARTE.y), w: l(600, CARTE.w), h: l(16, CARTE.h), r: l(8, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = doux(f, fin + 6, fin + 22);
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, opacity: 1 - sortie }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.accent, opacity: 1 - verre, boxShadow: `0 0 34px ${P.accent}` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const Ecusson: React.FC<{ src: string; debut: number; eteint: boolean }> = ({ src, debut, eteint }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 220;
  return <Img src={staticFile(src)} style={{ width: 240, height: 240, objectFit: 'contain', transform: `translateY(${(1 - q(f)) * -220}px)`, opacity: Math.min(1, q(f) * 3) * (eteint ? 0.6 : 1), filter: flouVitesse(v, 16) }} />;
};
const Match: React.FC<{ m: any; i: number; n: number }> = ({ m, i, n }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  // Le match suivant arrive pendant que celui-ci part (glissement avec flou) : jamais d'écran vide entre deux cartes.
  const entree = doux(f, 0, 7), sortie = doux(f, PAR, PAR + 10);
  const s = arrivee(f, fps, 12);
  const nb = Math.max(m.dom.buteurs.length, m.ext.buteurs.length), corps = nb <= 3 ? 38 : nb === 4 ? 32 : 26;
  const but = (e: any, droite: boolean) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: droite ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {e.buteurs.map((b: any, k: number) => <div key={b.nom} style={{ fontSize: corps, opacity: doux(f, 18 + k * 3, 26 + k * 3), lineHeight: 1.15 }}><span style={{ color: P.encre, fontWeight: 700 }}>{b.nom} </span><span style={{ color: P.accent, fontWeight: 800 }}>{b.minutes.join(', ')}</span></div>)}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 40, top: CARTE.y + 150, width: CARTE.w - 80, opacity: (1 - sortie) * Math.max(0.001, entree), transform: `translateX(${(1 - entree) * 120 - sortie * 120}px) scale(${1 + 0.035 * doux(f, 8, PAR + 10)})`, filter: flouVitesse((entree < 1 ? (1 - entree) * 18 : 0) + sortie * 24, 10), fontFamily: POLICE }}>
      <div style={{ textAlign: 'center', color: P.accent, fontWeight: 800, fontSize: 42, letterSpacing: 1 }}>TERMINÉ · {i + 1}/{n}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 30 }}>
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}><Ecusson src={m.dom.logo} debut={2} eteint={m.gagnant !== null && m.gagnant !== m.dom.id} /><div style={{ color: P.encre, fontWeight: 800, fontSize: m.dom.nom.length > 14 ? 30 : 38, textAlign: 'center' }}>{m.dom.nom}</div></div>
        <div style={{ color: P.encre, fontWeight: 900, fontSize: 150, letterSpacing: -3, transform: `scale(${s})`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{m.dom.buts}-{m.ext.buts}</div>
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}><Ecusson src={m.ext.logo} debut={5} eteint={m.gagnant !== null && m.gagnant !== m.ext.id} /><div style={{ color: P.encre, fontWeight: 800, fontSize: m.ext.nom.length > 14 ? 30 : 38, textAlign: 'center' }}>{m.ext.nom}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 28, marginTop: 56 }}>{but(m.dom, false)}{but(m.ext, true)}</div>
    </div>
  );
};
const Tous: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  const sortie = doux(f, TOUS - 8, TOUS + 6), z = 1 + 0.03 * doux(f, 0, TOUS);
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 30, top: CARTE.y + 40, width: CARTE.w - 60, height: CARTE.h - 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: 1 - sortie, transform: `scale(${z})`, fontFamily: POLICE }}>
      <div style={{ textAlign: 'center', color: P.encre, fontWeight: 900, fontSize: 44, opacity: doux(f, 0, 8) }}>TOUS LES SCORES</div>
      {d.matchs.map((m: any, i: number) => {
        const o = doux(f, 4 + i * 3, 12 + i * 3);
        const nom = (e: any, g: boolean) => <span style={{ flex: 1, minWidth: 0, color: P.encre, opacity: g ? 1 : 0.6, fontWeight: g ? 800 : 600, fontSize: e.nom.length > 13 ? 24 : 28, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nom}</span>;
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: o, transform: `translateY(${(1 - o) * 30}px)`, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '6px 14px' }}>
            <Img src={staticFile(m.dom.logo)} style={{ width: 42, height: 42, objectFit: 'contain' }} />{nom(m.dom, m.gagnant === null || m.gagnant === m.dom.id)}
            <span style={{ width: 100, textAlign: 'center', color: P.encre, fontWeight: 900, fontSize: 42, whiteSpace: 'nowrap' }}>{m.dom.buts}-{m.ext.buts}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>{nom({ ...m.ext }, m.gagnant === null || m.gagnant === m.ext.id)}</span><Img src={staticFile(m.ext.logo)} style={{ width: 42, height: 42, objectFit: 'contain' }} />
          </div>
        );
      })}
    </div>
  );
};
// Raccord 2 : un disque clair naît au centre et devient le fond (passage sombre → clair) ; le classement arrive dessus.
const Disque: React.FC<{ debut: number }> = ({ debut }) => {
  const f = useCurrentFrame();
  if (f < debut - 4) return null;
  const k = doux(f, debut - 4, debut + 22), r = 30 + k * 2300;
  return <div style={{ position: 'absolute', left: 540 - r, top: 940 - r, width: 2 * r, height: 2 * r, borderRadius: r, background: CLAIR.fond }} />;
};
const Classement: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const z = 1 + 0.08 * doux(f, 0, CLASS + 10);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300, fontFamily: POLICE, transform: `scale(${z})` }}>
      <div style={{ color: CLAIR.encre, fontWeight: 900, fontSize: 64, opacity: doux(f, 6, 16), letterSpacing: '-0.02em' }}>CLASSEMENT</div>
      <div style={{ color: CLAIR.accent, fontWeight: 800, fontSize: 40, opacity: doux(f, 10, 20), marginBottom: 26 }}>{d.ligue.nom}</div>
      {d.classement.map((l: any, i: number) => {
        const q = (x: number) => arrivee(x, fps, 14 + i * 6), v = vitesse(q, f) * 200;
        return (
          <div key={l.id} style={{ width: 900, display: 'flex', alignItems: 'center', gap: 20, padding: '12px 24px', marginBottom: 12, borderRadius: 22, background: i === 0 ? 'rgba(62,139,255,0.14)' : 'rgba(11,14,20,0.05)', transform: `translateX(${(1 - q(f)) * 200}px)`, opacity: Math.min(1, q(f) * 2), filter: flouVitesse(v, 14) }}>
            <span style={{ width: 50, color: CLAIR.encre, fontWeight: 900, fontSize: 44 }}>{l.rang}</span>
            <Img src={staticFile(l.logo)} style={{ width: 58, height: 58, objectFit: 'contain' }} />
            <span style={{ flex: 1, color: CLAIR.encre, fontWeight: 800, fontSize: 42, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</span>
            <span style={{ color: CLAIR.encre, fontWeight: 900, fontSize: 44 }}>{l.points}<span style={{ fontSize: 30, fontWeight: 700, opacity: 0.6 }}> pts</span></span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
export const sonsRecapV3 = (d: any): Son[] => {
  const t = tempsRecap(d);
  const coups = ['sons/v3/impact-1.wav', 'sons/v3/pop-2.wav', 'sons/v3/impact-2.wav', 'sons/v3/pop-1.wav'];
  return [
    // Foule continue assez présente (fond-a mesuré à −24 LUFS) : sans elle, les bruitages courts empêchent d'atteindre −16 LUFS sans saturer.
    { f: 0, src: 'sons/fond-a.mp3', volume: 0.45, duree: t.F },
    { f: VIGNETTE_FIN, src: 'sons/sifflet-court.mp3', volume: 0.15, duree: 40 },
    { f: H0 + 26, src: 'sons/v3/clic-1.wav', volume: 0.18 },
    { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.22, duree: 30 },
    ...Array.from({ length: t.n }, (_, i) => ({ f: M0 + i * PAR + 12, src: coups[i % coups.length], volume: 0.16 })),
    { f: t.T + 2, src: 'sons/v3/clic-2.wav', volume: 0.18 },
    ...(d.classement?.length ? [{ f: t.C - 4, src: 'sons/v3/souffle-1.wav', volume: 0.2 }, { f: t.C + 14, src: 'sons/v3/reussite-1.wav', volume: 0.17, duree: 60 }] : []),
    { f: t.F, src: 'sons/v3/pop-3.wav', volume: 0.2 },
  ];
};
export const RecapV3: React.FC<any> = (d) => {
  const t = tempsRecap(d);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      <Carte fin={t.C - 10} />
      <Accroche d={d} />
      {d.matchs.map((m: any, i: number) => <Sequence key={m.id} from={M0 + i * PAR} durationInFrames={PAR + 10}><Match m={m} i={i} n={t.n} /></Sequence>)}
      <Sequence from={t.T} durationInFrames={TOUS + 8}><Tous d={d} /></Sequence>
      {d.classement?.length > 0 && <><Disque debut={t.C} /><Sequence from={t.C} durationInFrames={CLASS + 10}><Classement d={d} /></Sequence></>}
      <Sequence from={t.F - 6}><FinV3 p={d.classement?.length ? CLAIR : P} /></Sequence>
      <OuvertureVignette format="recap" data={d} />
      {d.sons && <Sons liste={sonsRecapV3(d)} />}
      <Grain />
    </AbsoluteFill>
  );
};
