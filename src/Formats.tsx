import React from 'react';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Photo } from './commun';
import carte from '../public/cartes/maghreb.json';

// Les 5 formats automatiques du planning validé le 22/11 (Top 5, duel, série, « 3 changements », carte Maghreb). Le 6e, la capture de l'appli, se tourne à la main.
// Règles : accroche en très gros dans les 2 premières secondes, 15-70 s, texte à l'écran (sous-titres), AUCUNE musique (bruitages dans Racine), données du JSON contrôlé seulement.
const POLICE = 'Inter, sans-serif';
export const ACCROCHE = 60, QUESTION = 80;

const useRessort = (debut: number, amorti = 14) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return spring({ frame: f - debut, fps, config: { damping: amorti, mass: 0.75, stiffness: 140 } }); };
// Fond vivant : aura bleue qui dérive lentement (rien n'est jamais figé), vignettage.
const Fond: React.FC = () => {
  const f = useCurrentFrame();
  const x = 50 + 12 * Math.sin(f / 70), y = 38 + 10 * Math.cos(f / 90);
  return (<><AbsoluteFill style={{ background: C.fond }} /><AbsoluteFill style={{ background: `radial-gradient(900px 900px at ${x}% ${y}%, rgba(62,139,255,0.24), transparent 70%)` }} /><AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45))' }} /></>);
};
// Texte XXL mot par mot, centré, taille réglée sur le mot le plus long (jamais de débordement à 1080 px).
const Gros: React.FC<{ texte: string; debut?: number; couleur?: string; max?: number }> = ({ texte, debut = 0, couleur = C.texte, max = 150 }) => {
  const mots = texte.split(' ');
  const plusLong = Math.max(...mots.map((m) => m.length), 6);
  const taille = Math.min(max, Math.round(1500 / plusLong));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${taille * 0.28}px`, padding: '0 90px', textAlign: 'center' }}>
      {mots.map((m, i) => <Mot key={i} m={m} debut={debut + i * 5} taille={taille} couleur={couleur} />)}
    </div>
  );
};
const Mot: React.FC<{ m: string; debut: number; taille: number; couleur: string }> = ({ m, debut, taille, couleur }) => {
  const p = useRessort(debut, 11);
  return <span style={{ display: 'inline-block', color: couleur, fontFamily: POLICE, fontWeight: 900, fontSize: taille, lineHeight: 1.02, letterSpacing: '-0.03em', textTransform: 'uppercase', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})`, filter: `blur(${Math.max(0, (1 - p) * 8)}px)` }}>{m}</span>;
};
const Accroche: React.FC<{ texte: string; sous?: string }> = ({ texte, sous }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 30 }}>
    <Gros texte={texte} />
    {sous && <Monte debut={14}><div style={{ color: C.bleu, fontFamily: POLICE, fontWeight: 800, fontSize: 44, textAlign: 'center', padding: '0 110px' }}>{sous}</div></Monte>}
  </AbsoluteFill>
);
const Question: React.FC<{ texte: string }> = ({ texte }) => <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}><Gros texte={texte} couleur={C.bleu} /></AbsoluteFill>;
const Monte: React.FC<{ debut: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ debut, children, style }) => {
  const p = useRessort(debut);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 50}px)`, filter: `blur(${Math.max(0, (1 - p) * 6)}px)`, ...style }}>{children}</div>;
};
// Dérive douce de la caméra : la scène n'est jamais figée.
const Derive: React.FC<{ children: React.ReactNode; d: number }> = ({ children, d }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, d], [1, 1.04], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};
const Entete: React.FC<{ ligue?: { nom: string; logo: string }; texte: string }> = ({ ligue, texte }) => (
  <Monte debut={0} style={{ position: 'absolute', top: 200, left: 90, right: 130, display: 'flex', alignItems: 'center', gap: 16 }}>
    {ligue && <Img src={staticFile(ligue.logo)} style={{ width: 58, height: 58, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 6 }} />}
    <span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 700, fontSize: 36 }}>{texte}</span>
  </Monte>
);
const Scenes: React.FC<{ parts: [number, React.ReactNode][] }> = ({ parts }) => {
  let x = 0;
  return <>{parts.map(([d, n], i) => { const de = x; x += d; return <Sequence key={i} from={de} durationInFrames={d}><Derive d={d}>{n}</Derive></Sequence>; })}</>;
};
export const somme = (parts: number[]) => parts.reduce((a, b) => a + b, 0);

// ① Top 5 animé : du 5e au 1er, le n°1 en dernier.
const PAR_TOP = 72;
export const dureesTop5 = () => [ACCROCHE, 5 * PAR_TOP + 40, QUESTION];
export const Top5: React.FC<any> = (d) => {
  const ordre = [...d.top].reverse();
  return (<><Fond /><Scenes parts={[[ACCROCHE, <Accroche texte={d.accroche} sous={d.ligue.nom} />], [5 * PAR_TOP + 40, <>
    <Entete ligue={d.ligue} texte={d.sousTitre} />
    <div style={{ position: 'absolute', top: 320, left: 90, right: 130, display: 'flex', flexDirection: 'column-reverse', gap: 22 }}>
      {ordre.map((j: any, i: number) => <LigneTop key={j.id} j={j} debut={i * PAR_TOP} premier={i === 4} max={d.top[0].n} />)}
    </div></>], [QUESTION, <Question texte="Tu l'avais vu venir ?" />]]} /></>);
};
const LigneTop: React.FC<{ j: any; debut: number; premier: boolean; max: number }> = ({ j, debut, premier, max }) => {
  const p = useRessort(debut, 12), f = useCurrentFrame();
  const barre = interpolate(f, [debut + 8, debut + 40], [0, j.n / max], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ opacity: p, transform: `translateX(${(1 - p) * -120}px) scale(${premier ? 1 + 0.04 * p : 1})`, background: premier ? 'rgba(62,139,255,0.18)' : C.carte, border: `3px solid ${premier ? C.bleu : 'rgba(255,255,255,0.08)'}`, borderRadius: 32, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <span style={{ width: 70, color: premier ? C.bleu : C.gris, fontFamily: POLICE, fontWeight: 900, fontSize: 56 }}>{j.rang}</span>
      <Photo j={j} taille={premier ? 130 : 104} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: premier ? 50 : 42, lineHeight: 1.05 }}>{j.nom}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}><Img src={staticFile(j.logo)} style={{ width: 34, height: 34, objectFit: 'contain' }} /><span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 700, fontSize: 30 }}>{j.club}</span></div>
        <div style={{ height: 10, borderRadius: 5, background: C.carte2, marginTop: 10 }}><div style={{ width: `${barre * 100}%`, height: '100%', borderRadius: 5, background: C.bleu }} /></div>
      </div>
      <span style={{ color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: premier ? 76 : 60, fontVariantNumeric: 'tabular-nums' }}>{j.n}</span>
    </div>
  );
};

// ② Duel « X ou Y ? » : 2 joueurs face à face, 5 stats, question finale.
const PAR_STAT = 52;
export const dureesDuel = (d: any) => [ACCROCHE, 50 + (d.lignes?.length ?? 5) * PAR_STAT + 30, QUESTION];
export const Duel: React.FC<any> = (d) => (<><Fond /><Scenes parts={[[ACCROCHE, <Accroche texte={d.accroche} sous={d.sousTitre} />], [dureesDuel(d)[1], <>
  <div style={{ position: 'absolute', top: 210, left: 90, right: 130, display: 'flex', justifyContent: 'space-between' }}>
    <Joueur j={d.a} debut={0} /><Monte debut={10} style={{ alignSelf: 'center', color: C.gris, fontFamily: POLICE, fontWeight: 900, fontSize: 60 }}>VS</Monte><Joueur j={d.b} debut={6} />
  </div>
  <div style={{ position: 'absolute', top: 700, left: 90, right: 130, display: 'flex', flexDirection: 'column', gap: 18 }}>
    {d.lignes.map((l: any, i: number) => <LigneDuel key={l.label} l={l} debut={50 + i * PAR_STAT} />)}
  </div></>], [QUESTION, <Question texte={d.question} />]]} /></>);
const Joueur: React.FC<{ j: any; debut: number }> = ({ j, debut }) => (
  <Monte debut={debut} style={{ width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
    <Photo j={j} taille={250} />
    <div style={{ color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: 48, textAlign: 'center', lineHeight: 1.05 }}>{j.nom}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Img src={staticFile(j.logo)} style={{ width: 40, height: 40, objectFit: 'contain' }} /><span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 700, fontSize: 30 }}>{j.club}</span></div>
  </Monte>
);
const LigneDuel: React.FC<{ l: any; debut: number }> = ({ l, debut }) => {
  const p = useRessort(debut + 14, 10);
  const v = (x: number, g: boolean) => <span style={{ minWidth: 150, color: g ? C.bleu : C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: 58, fontVariantNumeric: 'tabular-nums', transform: `scale(${g ? 1 + 0.12 * p : 1})`, display: 'inline-block' }}>{String(x).replace('.', ',')}</span>;
  return (
    <Monte debut={debut} style={{ background: C.carte, borderRadius: 28, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {v(l.a, l.gagne === 1)}<span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 800, fontSize: 34, textAlign: 'center' }}>{l.label}</span><span style={{ textAlign: 'right' }}>{v(l.b, l.gagne === 2)}</span>
    </Monte>
  );
};

// ④ Série / record : grille de résultats animée, puis la stat choc.
const PAR_RES = 20;
export const dureesSerie = (d: any) => [ACCROCHE, 30 + (d.matchs?.length ?? 6) * PAR_RES + 100, QUESTION];
export const Serie: React.FC<any> = (d) => (<><Fond /><Scenes parts={[[ACCROCHE, <Accroche texte={d.accroche} sous={d.equipe.nom} />], [dureesSerie(d)[1], <>
  <Entete ligue={d.ligue} texte={d.sousTitre} />
  <Monte debut={0} style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><Img src={staticFile(d.equipe.logo)} style={{ width: 200, height: 200, objectFit: 'contain' }} /></Monte>
  <div style={{ position: 'absolute', top: 560, left: 90, right: 130, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
    {d.matchs.map((m: any, i: number) => <CaseRes key={i} m={m} debut={30 + i * PAR_RES} />)}
  </div>
  <Monte debut={30 + d.matchs.length * PAR_RES + 10} style={{ position: 'absolute', bottom: 430, left: 90, right: 130, textAlign: 'center', color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: 64 }}>
    <span style={{ color: C.bleu }}>{d.n}</span> {d.texte}
  </Monte></>], [QUESTION, <Question texte={d.question} />]]} /></>);
const COUL: Record<string, string> = { V: C.vert, N: '#5B6478', D: C.rouge };
const CaseRes: React.FC<{ m: any; debut: number }> = ({ m, debut }) => {
  const p = useRessort(debut, 11);
  return (
    <div style={{ opacity: p, transform: `scale(${0.7 + 0.3 * p})`, background: C.carte, borderRadius: 24, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 62, height: 62, borderRadius: 16, background: COUL[m.res], color: '#fff', fontFamily: POLICE, fontWeight: 900, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.res}</div>
      <div style={{ minWidth: 0 }}><div style={{ color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: 40 }}>{m.score}</div><div style={{ color: C.gris, fontFamily: POLICE, fontWeight: 700, fontSize: 26, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.adv}</div></div>
    </div>
  );
};

// ⑤ « 3 changements » version données : 3 chiffres avant / après.
const PAR_POINT = 110;
export const dureesTrois = () => [ACCROCHE, 40 + 3 * PAR_POINT, QUESTION];
export const Trois: React.FC<any> = (d) => (<><Fond /><Scenes parts={[[ACCROCHE, <Accroche texte={d.accroche} sous="3 chiffres qui ont tout changé" />], [dureesTrois()[1], <>
  <Entete ligue={d.ligue} texte={d.sousTitre} />
  <Monte debut={0} style={{ position: 'absolute', top: 290, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><Img src={staticFile(d.equipe.logo)} style={{ width: 170, height: 170, objectFit: 'contain' }} /></Monte>
  <div style={{ position: 'absolute', top: 520, left: 90, right: 130, display: 'flex', flexDirection: 'column', gap: 26 }}>
    {d.points.map((x: any, i: number) => <Point key={x.label} x={x} i={i} debut={40 + i * PAR_POINT} />)}
  </div></>], [QUESTION, <Question texte={d.question} />]]} /></>);
const Point: React.FC<{ x: any; i: number; debut: number }> = ({ x, i, debut }) => {
  const p = useRessort(debut + 30, 10);
  const n = (v: number) => String(v).replace('.', ',');
  return (
    <Monte debut={debut} style={{ background: C.carte, borderRadius: 32, padding: '22px 28px' }}>
      <div style={{ color: C.gris, fontFamily: POLICE, fontWeight: 800, fontSize: 34 }}>{i + 1}. {x.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 8 }}>
        <span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 900, fontSize: 64, textDecoration: 'line-through', textDecorationThickness: 5 }}>{n(x.avant)}</span>
        <span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 900, fontSize: 52 }}>→</span>
        <span style={{ color: x.mieux ? C.vert : C.rouge, fontFamily: POLICE, fontWeight: 900, fontSize: 84, display: 'inline-block', transform: `scale(${0.6 + 0.4 * p})`, opacity: p }}>{n(x.apres)}</span>
      </div>
    </Monte>
  );
};

// ③ Carte par pays, angle Maghreb : silhouette d'ensemble (sans frontières internes), une bulle par pays.
const PAR_PAYS = 90;
export const dureesCarte = (d: any) => [ACCROCHE, 60 + (d.pays?.length ?? 3) * PAR_PAYS + 40, QUESTION];
export const Carte: React.FC<any> = (d) => (<><Fond /><Scenes parts={[[ACCROCHE, <Accroche texte={d.accroche} sous={d.sousTitre} />], [dureesCarte(d)[1], <SceneCarte d={d} />], [QUESTION, <Question texte={d.question} />]]} /></>);
const SceneCarte: React.FC<{ d: any }> = ({ d }) => {
  const f = useCurrentFrame();
  const trace = interpolate(f, [0, 50], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const ech = 1000 / carte.largeur;
  return (
    <>
      <div style={{ position: 'absolute', top: 260, left: 40, width: 1000, height: carte.hauteur * ech }}>
        <svg width={1000} height={carte.hauteur * ech} viewBox={`0 0 ${carte.largeur} ${carte.hauteur}`} style={{ opacity: trace }}>
          {carte.chemins.map((c: string, i: number) => <path key={i} d={c} fill="rgba(62,139,255,0.22)" />)}
        </svg>
        {d.pays.map((p: any, i: number) => { const [x, y] = (carte.points as any)[p.code]; return <Bulle key={p.code} p={p} x={x * ech} y={y * ech} debut={60 + i * PAR_PAYS} />; })}
      </div>
      <div style={{ position: 'absolute', top: 1060, left: 90, right: 130, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {d.pays.map((p: any, i: number) => (
          <Monte key={p.code} debut={75 + i * PAR_PAYS} style={{ background: C.carte, borderRadius: 26, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.texte, fontFamily: POLICE, fontWeight: 900, fontSize: 44 }}>{p.nom}</span>
            <span style={{ color: C.gris, fontFamily: POLICE, fontWeight: 700, fontSize: 32 }}>{p.joueurs} joueurs · <span style={{ color: C.bleu, fontWeight: 900 }}>{p.buts} buts</span> · {p.passes} passes</span>
          </Monte>
        ))}
      </div>
    </>
  );
};
const Bulle: React.FC<{ p: any; x: number; y: number; debut: number }> = ({ p, x, y, debut }) => {
  const s = useRessort(debut, 10), t = 90 + Math.min(80, p.joueurs * 4);
  return <div style={{ position: 'absolute', left: x - t / 2, top: y - t / 2, width: t, height: t, borderRadius: t / 2, background: C.bleu, transform: `scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: POLICE, fontWeight: 900, fontSize: t * 0.38, boxShadow: '0 0 60px rgba(62,139,255,0.6)' }}>{p.joueurs}</div>;
};
