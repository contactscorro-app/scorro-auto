import React from 'react';
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Monte, Grain } from './commun';
import { Fin, Fond } from './Presentation';
import { Mixage, planSonsGen } from './Sons';
// Vidéo de présentation pour un créateur : plans courts, texte énorme, uniquement l'app (aucun texte personnel).
const LARGEUR = 640, HAUTEUR = Math.round((LARGEUR * 2622) / 1206);
const FIN_F = 90;
const f30 = (s: number) => Math.round(s * 30);
const dureePlan = (p: any) => (p.parts ? p.parts.reduce((s: number, x: any) => s + (x.a - x.de) / (x.vitesse ?? 1) + (x.tenir ?? 0) + (x.avant ?? 0), 0) : p.duree);
export const dureeCreateur = (d: any) => d.plans.reduce((s: number, p: any) => s + f30(dureePlan(p)), 0) + FIN_F;
const taille = (t: string) => (t.length <= 16 ? 110 : t.length <= 24 ? 92 : 74);
const Source: React.FC<{ p: any }> = ({ p }) => {
  const style = { width: '100%', height: '100%', objectFit: 'cover' as const };
  const parts = p.parts ?? [{ de: p.de ?? 0, a: (p.de ?? 0) + p.duree }];
  let debut = 0;
  return <>{parts.map((g: any, i: number) => {
    const src = staticFile(`${p.dossier}/${g.clip ?? p.clip}.mp4`);
    const avant = f30(g.avant ?? 0), lire = f30((g.a - g.de) / (g.vitesse ?? 1)), tenir = f30(g.tenir ?? 0), from = debut + avant; debut += avant + lire + tenir;
    return (
      <React.Fragment key={i}>
        {avant > 0 && <Sequence from={from - avant} durationInFrames={avant}><Freeze frame={0}><OffthreadVideo src={src} muted startFrom={f30(g.de)} style={style} /></Freeze></Sequence>}
        {lire > 0 && <Sequence from={from} durationInFrames={lire}><OffthreadVideo src={src} muted startFrom={f30(g.de)} playbackRate={g.vitesse ?? 1} style={style} /></Sequence>}
        {tenir > 0 && <Sequence from={from + lire} durationInFrames={tenir}><Freeze frame={0}><OffthreadVideo src={src} muted startFrom={Math.max(0, f30(g.a) - 1)} style={style} /></Freeze></Sequence>}
      </React.Fragment>
    );
  })}</>;
};
const Langues: React.FC<{ liste: string[] }> = ({ liste }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 250 }}>
      {liste.map((l, i) => { const o = interpolate(frame, [i * 3, i * 3 + 8], [0, 1], { extrapolateRight: 'clamp' }); return <div key={l} style={{ color: i % 2 ? C.bleu : C.texte, fontWeight: 900, fontSize: 96, lineHeight: 1.12, letterSpacing: -2, opacity: o, transform: `translateX(${(1 - o) * 60}px)` }}>{l}</div>; })}
    </AbsoluteFill>
  );
};
const PlanC: React.FC<{ p: any; frames: number }> = ({ p, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 20, mass: 0.6 } });
  const fondu = interpolate(frame, [frames - 5, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: fondu }}>
      <Monte debut={0} style={{ position: 'absolute', left: 80, right: 80, top: p.titreSeul ? 700 : 130, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 270, ...(p.titreSeul ? { alignItems: 'center', textAlign: 'center' as const } : {}) }}>
        <div style={{ color: C.texte, fontWeight: 900, fontSize: taille(p.texte), lineHeight: 1.02, letterSpacing: -2, textTransform: 'uppercase' }}>{p.texte}</div>
        {p.sous && <div style={{ color: C.bleu, fontWeight: 800, fontSize: 48, marginTop: 14 }}>{p.sous}</div>}
      </Monte>
      {p.titreSeul ? null : p.langues ? <Langues liste={p.langues} /> : p.aFilmer ? (
        // Plan pas encore filmé : cadre gris avec la description de la prise (aperçu de montage uniquement, jamais publié).
        <div style={{ position: 'absolute', left: (1080 - LARGEUR) / 2, top: 440, width: LARGEUR, height: HAUTEUR, borderRadius: 70, border: '6px dashed #3A4256', background: '#141924', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 50, textAlign: 'center', color: C.gris, fontWeight: 700, fontSize: 40, lineHeight: 1.3 }}>PRISE À FAIRE<br />{p.aFilmer}</div>
      ) : (
        <div style={{ position: 'absolute', left: (1080 - LARGEUR) / 2, top: 440, width: LARGEUR, height: HAUTEUR, borderRadius: 70, overflow: 'hidden', border: '6px solid #2A3040', background: '#000', transform: `translateY(${(1 - e) * 90}px) scale(${0.96 + 0.04 * e})`, boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}>
          <Source p={p} />
        </div>
      )}
    </AbsoluteFill>
  );
};
export const Createur: React.FC<any> = (d) => {
  let debut = 0;
  const frames = d.plans.map((p: any) => f30(dureePlan(p)));
  const total = frames.reduce((a: number, b: number) => a + b, 0);
  const coupes = frames.slice(0, -1).reduce((a: number[], n: number) => [...a, (a.at(-1) ?? 0) + n], [] as number[]);
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, sans-serif' }}>
      <Fond />
      {d.sons && <Mixage cues={planSonsGen(21, total, coupes, [], undefined, false)} />}
      {d.plans.map((p: any, i: number) => { const from = debut; debut += frames[i]; return <Sequence key={i} from={from} durationInFrames={frames[i]}><PlanC p={p} frames={frames[i]} /></Sequence>; })}
      <Sequence from={debut}><Fin texte={d.fin ?? "Disponible sur l'App Store"} /></Sequence>
      <Grain />
    </AbsoluteFill>
  );
};
