import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Monte, Grain } from './commun';
import { Fin, Fond } from './Presentation';
import { Mixage, planSonsGen } from './Sons';
// Série « Les fonctionnalités de Scorro » : texte d'accroche + enregistrement du simulateur (compte démo), même style que la présentation.
const taille = (t: string) => (t.length <= 22 ? 92 : t.length <= 34 ? 78 : 64);
const LARGEUR = 600, HAUTEUR = Math.round((LARGEUR * 2622) / 1206);
const FIN_F = 90;
const frames = (p: any) => Math.round(p.duree * 30);
export const dureeFonctionnalite = (d: any) => (d.plans ?? []).reduce((s: number, p: any) => s + frames(p), 0) + FIN_F;
const PlanLong: React.FC<{ p: any; frames: number }> = ({ p, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const fondu = interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: fondu }}>
      <Monte debut={0} style={{ position: 'absolute', left: 90, right: 130, top: 170, display: 'flex', alignItems: 'center', minHeight: 240 }}>
        <div style={{ color: C.texte, fontWeight: 900, fontSize: taille(p.texte), lineHeight: 1.03, letterSpacing: -2, textTransform: 'uppercase' }}>{p.texte}</div>
      </Monte>
      <div style={{ position: 'absolute', left: (1080 - LARGEUR) / 2 - 10, top: 430, width: LARGEUR, height: HAUTEUR, borderRadius: 70, overflow: 'hidden', border: '6px solid #2A3040', background: '#000', opacity: e, transform: `translateY(${(1 - e) * 120}px)`, boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}>
        <OffthreadVideo src={staticFile(`fonctionnalites/${p.clip}.mp4`)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </AbsoluteFill>
  );
};

export const Fonctionnalite: React.FC<any> = (d) => {
  let debut = 0;
  const total = d.plans.reduce((s: number, p: any) => s + frames(p), 0);
  const coupes = d.plans.slice(0, -1).reduce((a: number[], p: any) => [...a, (a.at(-1) ?? 0) + frames(p)], []);
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, sans-serif' }}>
      <Fond />
      {d.sons && <Mixage cues={planSonsGen(d.plans.length * 7 + 3, total, coupes, [], undefined, !d.sansSifflet)} />}
      {d.plans.map((p: any) => { const f = frames(p), from = debut; debut += f; return <Sequence key={p.clip} from={from} durationInFrames={f}><PlanLong p={p} frames={f} /></Sequence>; })}
      <Sequence from={debut}><Fin texte={d.fin ?? "Dispo sur l'App Store"} /></Sequence>
      <Grain />
    </AbsoluteFill>
  );
};
