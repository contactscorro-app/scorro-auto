import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FinV3, FondV3, Grain, Mots, PALETTES, Sons, Verre, arrivee, doux, flouVitesse, taillePourLargeur, usePolice, vitesse, POLICE, type Pal, type Son, FOND_A, SRC_FOND_A } from './kit';
import { OuvertureVignette, VIGNETTE_FIN } from './Vignettes';
import { planBruitages, NAPPES, VOLUME_NAPPE } from './sons';

// Après-match (choc), style v3. Données : data/score-final-<id>.json (score recoupé). Sert aussi de base à la story après-match.
// Image 0 = vignette → « PSG / bat / NICE » mot par mot, soulignement sous le vainqueur → le soulignement devient la carte : écussons qui tombent,
// score, buteurs → les stats clés (barres) → un disque clair devient le fond : « Ton homme du match ? » → fin Scorro.
const P = PALETTES['apres-match'];
const CLAIR: Pal = { fond: '#F4F6FA', encre: '#0B0E14', accent: '#27C281', clair: true };
const H0 = 14, R1 = 74, S0 = 92, SCORE = 140, STATS = 150, QUESTION = 84, FIN_D = 66;
// story : sans stats ni question, fin plus courte (≈ 9 s).
export const tempsApres = (d: any) => { const T = S0 + SCORE, Q = T + (!d.story && d.statsCles?.length ? STATS : 0), F = Q + (d.story ? 0 : QUESTION); return { T, Q, F, total: F + (d.story ? 40 : FIN_D) }; };
const CARTE = { x: 70, y: 430, w: 940, h: 1020, r: 52 };

// Titre en lignes : vainqueur / « bat » / perdant, ou équipe / « et » / équipe / « se neutralisent ».
const lignesTitre = (d: any) => {
  if (d.gagnant === null) return [d.dom.nom, 'et', d.ext.nom, 'se neutralisent'];
  const g = d.gagnant === d.dom.id ? d.dom : d.ext, p = g === d.dom ? d.ext : d.dom;
  return [g.nom, 'bat', p.nom];
};
const Accroche: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const pret = usePolice();
  if (!pret || f > R1 + 26) return null;
  const L = lignesTitre(d).map((x) => x.toUpperCase());
  const tailles = L.map((x, i) => (x === 'BAT' || x === 'ET' ? 90 : i === 3 ? taillePourLargeur(x, 760, 900, 110) : taillePourLargeur(x, 860, 900, 230)));
  const k = doux(f, R1, R1 + 20);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - k, filter: k > 0.02 ? `blur(${k * 14}px)` : undefined, transform: `scale(${1 - 0.12 * k})` }}>
      <Mots p={P} tailles={tailles} lignes={L.map((x, i) => [{ t: x, f: H0 + i * 6, ...(i === 0 && d.gagnant !== null ? { souligne: H0 + 28 } : {}), ...(x === 'BAT' || x === 'ET' ? { couleur: P.accent } : {}) }])} />
    </AbsoluteFill>
  );
};
const Carte: React.FC<{ fin: number }> = ({ fin }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  if (f < R1 - 2 || f > fin + 30) return null;
  const k = arrivee(f, fps, R1, { damping: 16, stiffness: 110, mass: 0.9 });
  const l = (a: number, b: number) => a + (b - a) * Math.min(1, k);
  const g = { x: l(140, CARTE.x), y: l(780, CARTE.y), w: l(800, CARTE.w), h: l(16, CARTE.h), r: l(8, CARTE.r) };
  const verre = interpolate(k, [0.1, 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = doux(f, fin + 4, fin + 20);
  return (
    <div style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, opacity: 1 - sortie }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: g.r, background: P.accent, opacity: 1 - verre, boxShadow: `0 0 34px ${P.accent}` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: verre }}><Verre p={P} rayon={g.r} style={{ width: '100%', height: '100%' }} /></div>
    </div>
  );
};
const Ecusson: React.FC<{ src: string; debut: number; eteint: boolean }> = ({ src, debut, eteint }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const q = (x: number) => arrivee(x, fps, debut), v = vitesse(q, f) * 240;
  return <Img src={staticFile(src)} style={{ width: 250, height: 250, objectFit: 'contain', transform: `translateY(${(1 - q(f)) * -240}px)`, opacity: Math.min(1, q(f) * 3) * (eteint ? 0.6 : 1), filter: flouVitesse(v, 16) }} />;
};
const Score: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = arrivee(f, fps, 14), sortie = doux(f, SCORE - 6, SCORE + 6), z = 1 + 0.04 * doux(f, 0, SCORE);
  const nb = Math.max(d.dom.buteurs.length, d.ext.buteurs.length), corps = nb <= 3 ? 38 : nb === 4 ? 32 : 26;
  const but = (e: any, droite: boolean) => <div style={{ flex: 1, minWidth: 0, textAlign: droite ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>{e.buteurs.map((b: any, k: number) => <div key={b.nom} style={{ fontSize: corps, lineHeight: 1.15, opacity: doux(f, 26 + k * 4, 34 + k * 4) }}><span style={{ color: P.encre, fontWeight: 700 }}>{b.nom} </span><span style={{ color: P.accent, fontWeight: 800 }}>{b.minutes.join(', ')}</span></div>)}</div>;
  const eq = (e: any, debut: number) => <div style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}><Ecusson src={e.logo} debut={debut} eteint={d.gagnant !== null && d.gagnant !== e.id} /><div style={{ color: P.encre, fontWeight: 800, fontSize: e.nom.length > 14 ? 32 : 40, textAlign: 'center' }}>{e.nom}</div></div>;
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 40, top: CARTE.y + 110, width: CARTE.w - 80, opacity: 1 - sortie, transform: `scale(${z}) translateX(${-sortie * 120}px)`, filter: flouVitesse(sortie * 24, 12), fontFamily: POLICE }}>
      <div style={{ textAlign: 'center', color: P.accent, fontWeight: 800, fontSize: 42, letterSpacing: 1, opacity: doux(f, 0, 8) }}>{[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ').toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 34 }}>
        {eq(d.dom, 2)}
        <div style={{ color: P.encre, fontWeight: 900, fontSize: 160, letterSpacing: -4, transform: `scale(${s})`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{d.dom.buts}-{d.ext.buts}</div>
        {eq(d.ext, 6)}
      </div>
      <div style={{ display: 'flex', gap: 28, marginTop: 56 }}>{but(d.dom, false)}{but(d.ext, true)}</div>
    </div>
  );
};
const Stats: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  const z = 1 + 0.08 * doux(f, 0, STATS + 6), entree = doux(f, 0, 8);
  const lignes = (d.statsCles ?? []).slice(0, 4);
  return (
    <div style={{ position: 'absolute', left: CARTE.x + 50, top: CARTE.y + 80, width: CARTE.w - 100, opacity: entree, transform: `scale(${z}) translateX(${(1 - entree) * 120}px)`, fontFamily: POLICE }}>
      <div style={{ textAlign: 'center', color: P.encre, fontWeight: 900, fontSize: 56 }}>{d.dom.buts}-{d.ext.buts} : LES STATS</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}><Img src={staticFile(d.dom.logo)} style={{ width: 90, height: 90, objectFit: 'contain' }} /><Img src={staticFile(d.ext.logo)} style={{ width: 90, height: 90, objectFit: 'contain' }} /></div>
      {lignes.map((s: any, i: number) => {
        const p = doux(f, 12 + i * 12, 34 + i * 12), tot = Math.max(1, s.dom + s.ext);
        return (
          <div key={s.label} style={{ marginTop: 30, opacity: Math.min(1, p * 2) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: P.encre, fontWeight: 900, fontSize: 56 }}>{s.dom}{s.unite}</span>
              <span style={{ color: P.encre, opacity: 0.75, fontWeight: 800, fontSize: 36 }}>{s.label}</span>
              <span style={{ color: P.encre, fontWeight: 900, fontSize: 56 }}>{s.ext}{s.unite}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, height: 16, marginTop: 10 }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}><div style={{ width: `${(s.dom / tot) * 100 * p}%`, background: s.dom >= s.ext ? P.accent : 'rgba(244,246,250,0.55)', borderRadius: 8 }} /></div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}><div style={{ width: `${(s.ext / tot) * 100 * p}%`, height: '100%', background: s.ext >= s.dom ? P.accent : 'rgba(244,246,250,0.55)', borderRadius: 8 }} /></div>
            </div>
          </div>
        );
      })}
      {d.meilleureNote && (
        <div style={{ marginTop: 44, display: 'flex', alignItems: 'center', gap: 20, opacity: doux(f, 70, 84) }}>
          <Img src={staticFile(d.meilleureNote.logo)} style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <div style={{ flex: 1 }}><div style={{ color: P.encre, opacity: 0.75, fontWeight: 700, fontSize: 32 }}>Meilleure note du match</div><div style={{ color: P.encre, fontWeight: 900, fontSize: 44 }}>{d.meilleureNote.nom}</div></div>
          <div style={{ color: P.accent, fontWeight: 900, fontSize: 76 }}>{d.meilleureNote.note}</div>
        </div>
      )}
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
  const t1 = taillePourLargeur('TON HOMME', 860, 900, 210), t2 = taillePourLargeur('DU MATCH ?', 860, 900, 210);
  const z = 1 + 0.05 * doux(f, 0, QUESTION + 10), sortie = doux(f, QUESTION - 4, QUESTION + 8);
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${z})`, opacity: 1 - sortie }}><Mots p={CLAIR} tailles={[t1, t2]} lignes={[[{ t: 'TON', f: 8 }, { t: 'HOMME', f: 13 }], [{ t: 'DU', f: 19 }, { t: 'MATCH', f: 24, souligne: 38 }, { t: '?', f: 29 }]]} /></AbsoluteFill>;
};
// Story après-match : nouvelle banque (24/11). La vidéo après-match garde ses sons jusqu'à sa propre QA (plan d'amélioration).
export const sonsStoryApresFluide = (d: any): Son[] => {
  const t = tempsApres({ ...d, story: true });
  return [
    { f: 0, src: NAPPES.stade, volume: VOLUME_NAPPE * 1.6, duree: t.total },
    ...planBruitages([
      { f: VIGNETTE_FIN, action: 'carte' },
      { f: H0, action: 'frappe' },
      { f: R1, action: 'raccord' },
      { f: S0 + 8, action: 'impact', secondaire: true }, // écussons
      { f: S0 + 14, action: 'sifflet' },                  // le score apparaît : sifflet + foule
      { f: S0 + 20, action: 'fouleJoie' },
      { f: t.F, action: 'zoomArriere' },
    ], { graine: d.fixtureId ?? 7, gainGlobal: 0.9 }),
  ];
};
export const sonsApresV3 = (d: any): Son[] => {
  const t = tempsApres(d);
  return [
    // Fond léger fond-a 0,08 : story après-match seulement (Q60 = a) ; la vidéo après-match reste sans fond.
    ...(d.story ? [{ f: 0, src: SRC_FOND_A, volume: FOND_A, duree: t.F }] : []),
    { f: VIGNETTE_FIN, src: 'sons/sifflet-court.mp3', volume: 0.15, duree: 40 },
    { f: H0 + 28, src: 'sons/v3/clic-1.wav', volume: 0.16 },
    { f: R1, src: 'sons/whoosh-2.mp3', volume: 0.2, duree: 30 },
    { f: S0 + 8, src: 'sons/v3/impact-1.wav', volume: 0.16 },
    { f: S0 + 14, src: 'sons/v3/reussite-1.wav', volume: 0.16, duree: 60 },
    ...(!d.story && d.statsCles?.length ? [{ f: t.T, src: 'sons/whoosh-2.mp3', volume: 0.18, duree: 30 }, { f: t.T + 14, src: 'sons/v3/pop-2.wav', volume: 0.15 }] : []),
    ...(!d.story ? [{ f: t.Q - 4, src: 'sons/v3/souffle-1.wav', volume: 0.18 }, { f: t.Q + 38, src: 'sons/v3/clic-2.wav', volume: 0.15 }] : []),
    { f: t.F, src: 'sons/v3/impact-2.wav', volume: 0.16 },
  ];
};
export const ApresMatchV3: React.FC<any> = (d) => {
  const t = tempsApres(d);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={P} />
      <Carte fin={t.Q - 10} />
      <Accroche d={d} />
      <Sequence from={S0} durationInFrames={SCORE + 8}><Score d={d} /></Sequence>
      {!d.story && d.statsCles?.length > 0 && <Sequence from={t.T - 4} durationInFrames={STATS + 6}><Stats d={d} /></Sequence>}
      {!d.story && <><Disque debut={t.Q} /><Sequence from={t.Q} durationInFrames={QUESTION + 10}><Question /></Sequence></>}
      <Sequence from={t.F - 8}><FinV3 p={d.story ? P : CLAIR} /></Sequence>
      <OuvertureVignette format="apres-match" data={d} />
      {d.sons && <Sons liste={sonsApresV3(d)} />}
      <Grain />
    </AbsoluteFill>
  );
};
