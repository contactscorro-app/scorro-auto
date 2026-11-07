import React from 'react';
import { AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Monte, useEntree, Grain } from './commun';
import { Mixage, planSonsPresentation } from './Sons';

export const PAR_PLAN = 105, FIN = 90;
const LARGEUR = 600, HAUTEUR = Math.round((LARGEUR * 2622) / 1206);
export const dureePresentation = (d: any) => (d.plans?.length ?? 0) * PAR_PLAN + FIN;
// La taille dérive de la longueur : même règle pour tous les textes.
const taille = (t: string) => (t.length <= 22 ? 92 : t.length <= 34 ? 78 : 64);
export const Fond: React.FC = () => <AbsoluteFill style={{ background: `radial-gradient(1000px 900px at 50% 40%, rgba(62,139,255,0.22), transparent 70%), ${C.fond}` }} />;

export const Plan: React.FC<{ p: any }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const fondu = interpolate(frame, [PAR_PLAN - 8, PAR_PLAN], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dernier = Math.max(0, Math.floor(p.duree * fps) - 3);
  return (
    <AbsoluteFill style={{ opacity: fondu }}>
      <Monte debut={0} style={{ position: 'absolute', left: 90, right: 130, top: 170, display: 'flex', alignItems: 'center', minHeight: 240 }}>
        <div style={{ color: C.texte, fontWeight: 900, fontSize: taille(p.texte), lineHeight: 1.03, letterSpacing: -2, textTransform: 'uppercase' }}>{p.texte}</div>
      </Monte>
      <div style={{ position: 'absolute', left: (1080 - LARGEUR) / 2 - 10, top: 430, width: LARGEUR, height: HAUTEUR, borderRadius: 70, overflow: 'hidden', border: '6px solid #2A3040', background: '#000', opacity: e, transform: `translateY(${(1 - e) * 120}px)`, boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}>
        <Freeze frame={dernier} active={(f) => f >= dernier}>
          <OffthreadVideo src={staticFile(`${p.dossier ?? 'presentation'}/${p.clip}.mp4`)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Freeze>
      </div>
    </AbsoluteFill>
  );
};
export const Fin: React.FC<{ texte: string; site?: string }> = ({ texte, site = 'scorroapp.com' }) => {
  const p = useEntree(0, 12);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 40, paddingBottom: 200 }}>
      <Img src={staticFile('scorro-icon.png')} style={{ width: 260, height: 260, borderRadius: 60, transform: `scale(${p})` }} />
      <Monte debut={10} style={{ color: C.texte, fontWeight: 900, fontSize: 112, letterSpacing: -3, marginTop: 40 }}>Scorro</Monte>
      <Monte debut={20} style={{ color: C.bleu, fontWeight: 800, fontSize: 56, marginTop: 12 }}>{texte}</Monte>
      <Monte debut={30} style={{ color: C.gris, fontWeight: 700, fontSize: 46, marginTop: 14 }}>{site}</Monte>
    </AbsoluteFill>
  );
};
export const Presentation: React.FC<any> = (d) => (
  <AbsoluteFill style={{ fontFamily: 'Inter, sans-serif' }}>
    <Fond />
    {d.sons && d.fond && <Mixage cues={planSonsPresentation(d.plans.length, PAR_PLAN, FIN, d.fond, d.volume)} />}
    {d.plans.map((p: any, i: number) => <Sequence key={p.clip} from={i * PAR_PLAN} durationInFrames={PAR_PLAN}><Plan p={p} /></Sequence>)}
    <Sequence from={d.plans.length * PAR_PLAN}><Fin texte={d.fin} /></Sequence>
    <Grain />
  </AbsoluteFill>
);
