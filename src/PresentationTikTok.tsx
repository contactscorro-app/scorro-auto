import React from 'react';
import { AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Monte, useEntree } from './commun';
import { Fin, FIN, PAR_PLAN, Plan } from './Presentation';
// Une seule source pour la démo : les textes et les durées de la version App Store.
import demo from '../data/presentation-b.json';

const FPS = 30, RALENTI = 0.6;
const nu = (t: string) => t.replace(/\*/g, '');
// Temps de lecture et taille dérivent de la longueur : même règle pour toutes les phrases.
const duree = (t: string) => Math.round((1.6 + nu(t).length / 36) * FPS);
const taille = (t: string) => { const n = nu(t).length; return n <= 24 ? 132 : n <= 50 ? 104 : n <= 100 ? 88 : 80; };
export const dureeTikTok = (d: any) => [...d.intro, ...d.sortie].reduce((s: number, p: any) => s + duree(p.texte), demo.plans.length * PAR_PLAN + FIN);

const Fond: React.FC = () => {
  const aura = interpolate(useCurrentFrame(), [0, 1800], [28, 72]);
  return <AbsoluteFill style={{ background: `radial-gradient(1100px 1000px at 50% ${aura}%, rgba(62,139,255,0.24), transparent 70%), ${C.fond}` }} />;
};
// Un mot à trait d'union ne se coupe jamais (« donne-moi », « télécharge-la ») : même règle pour toutes les phrases.
const Insecable: React.FC<{ t: string }> = ({ t }) => <>{t.split(/(\S+-\S+)/).map((m, i) => (i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{m}</span> : m))}</>;
// Le mot entre astérisques passe en bleu.
const Texte: React.FC<{ t: string }> = ({ t }) => <>{t.split('*').map((m, i) => (i % 2 ? <span key={i} style={{ color: C.bleu }}><Insecable t={m} /></span> : <Insecable key={i} t={m} />))}</>;

const Phrase: React.FC<{ p: any }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = duree(p.texte);
  const fondu = interpolate(frame, [n - 7, n], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zoom = interpolate(frame, [0, n], [1.14, 1.2]);
  const icone = useEntree(4, 12);
  const dernier = Math.max(0, Math.floor(((p.clipDuree ?? 2) / RALENTI) * fps) - 3);
  return (
    <AbsoluteFill style={{ opacity: fondu }}>
      {p.clip && (
        <AbsoluteFill style={{ opacity: 0.36, filter: 'blur(30px)', transform: `scale(${zoom})` }}>
          <Freeze frame={dernier} active={(f) => f >= dernier}>
            <OffthreadVideo src={staticFile(`presentation/${p.clip}.mp4`)} muted playbackRate={RALENTI} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Freeze>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', left: 90, right: 130, top: 170, bottom: 420, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {p.icone && <Img src={staticFile('scorro-icon.png')} style={{ width: 190, height: 190, borderRadius: 44, marginBottom: 44, transform: `scale(${icone})` }} />}
        <Monte debut={0}>
          <div style={{ color: C.texte, fontWeight: 900, fontSize: taille(p.texte), lineHeight: 1.1, letterSpacing: -2 }}><Texte t={p.texte} /></div>
        </Monte>
      </div>
    </AbsoluteFill>
  );
};
const Serie: React.FC<{ liste: any[]; depart: number }> = ({ liste, depart }) => {
  let t = depart;
  return <>{liste.map((p, i) => { const de = t; t += duree(p.texte); return <Sequence key={i} from={de} durationInFrames={duree(p.texte)}><Phrase p={p} /></Sequence>; })}</>;
};
export const PresentationTikTok: React.FC<any> = (d) => {
  const debutDemo = d.intro.reduce((s: number, p: any) => s + duree(p.texte), 0);
  const debutFin = debutDemo + demo.plans.length * PAR_PLAN;
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, sans-serif' }}>
      <Fond />
      <Serie liste={d.intro.map((p: any) => ({ ...p, clipDuree: demo.plans.find((x: any) => x.clip === p.clip)?.duree }))} depart={0} />
      {demo.plans.map((p: any, i: number) => <Sequence key={p.clip} from={debutDemo + i * PAR_PLAN} durationInFrames={PAR_PLAN}><Plan p={p} /></Sequence>)}
      <Sequence from={debutFin} durationInFrames={FIN}><Fin texte={demo.fin} /></Sequence>
      <Serie liste={d.sortie} depart={debutFin + FIN} />
    </AbsoluteFill>
  );
};
