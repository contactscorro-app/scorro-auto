import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
// Le pseudo vient d'un fichier : aucun compte écrit en dur.
import marque from '../data/marque.json';

// Jetons repris de l'app (src/theme/colors.ts), recopiés : ce dépôt n'importe rien de l'app.
// Grain très léger, animé : dithering qui évite bandes et blocs sur les fonds sombres après la recompression des réseaux.
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile('grain.png')})`, backgroundPosition: `${(f * 211) % 1080}px ${(f * 347) % 1920}px`, opacity: 0.9 }} />;
};
export const C = { fond: '#0B0E14', carte: '#161B26', carte2: '#1C2230', bleu: '#3E8BFF', texte: '#F4F6FA', gris: '#9AA3B5', vert: '#27C281', rouge: '#FF4D5E' };
const POLICE = 'Inter, sans-serif';
// Zones sûres TikTok/Reels/Shorts : rien d'utile sous y=1500, ni à droite de x=950.
const MARGE_G = 90, MARGE_D = 130;

export type EquipeBase = { id: number; nom: string; logo: string };

export const useEntree = (debut: number, amorti = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - debut, fps, config: { damping: amorti, mass: 0.7 } });
};
export const Monte: React.FC<{ debut: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ debut, children, style }) => {
  const p = useEntree(debut);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 50}px)`, ...style }}>{children}</div>;
};
// Photo Sportmonks dans un rond ; sans photo, les initiales. Une seule règle pour tous les formats.
export const Photo: React.FC<{ j: { photo?: string | null; ini?: string }; taille: number; style?: React.CSSProperties }> = ({ j, taille, style }) => (
  <div style={{ width: taille, height: taille, borderRadius: taille / 2, flexShrink: 0, overflow: 'hidden', background: C.carte2, border: '3px solid rgba(255,255,255,0.28)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.texte, fontWeight: 900, fontSize: taille * 0.34, ...style }}>
    {j.photo ? <Img src={staticFile(j.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : j.ini}
  </div>
);
// La taille dérive de la longueur du texte : une seule règle pour « PSG » comme pour « Mönchengladbach ».
const tailleAccroche = (t: string) => Math.max(76, Math.min(128, Math.round(2300 / Math.max(t.length, 16))));

export const EquipeCol: React.FC<{ e: EquipeBase; debut: number; eteint?: boolean }> = ({ e, debut, eteint }) => {
  const p = useEntree(debut, 12);
  const n = e.nom.length;
  return (
    <div style={{ width: 270, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: eteint ? 0.72 : 1 }}>
      <Img src={staticFile(e.logo)} style={{ width: 170, height: 170, objectFit: 'contain', transform: `scale(${p})` }} />
      <div style={{ color: C.texte, fontWeight: 800, fontSize: n > 16 ? 30 : n > 11 ? 36 : 42, textAlign: 'center', lineHeight: 1.1 }}>{e.nom}</div>
    </div>
  );
};

// Le gabarit commun aux trois formats : en-tête, accroche, sous-titre, carte, marque.
export const Cadre: React.FC<{
  duree: number; ligueLogo: string; ligueTexte: string; accroche: string; sousTitre: string | null; piedDebut: number; children: React.ReactNode;
}> = ({ duree, ligueLogo, ligueTexte, accroche, sousTitre, piedDebut, children }) => {
  const frame = useCurrentFrame();
  const fin = interpolate(frame, [duree - 12, duree], [1, 0.96], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const aura = interpolate(frame, [0, duree], [30, 46]);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE, background: C.fond, opacity: fin }}>
      <AbsoluteFill style={{ background: `radial-gradient(1000px 900px at 50% ${aura}%, rgba(62,139,255,0.20), transparent 70%)` }} />
      <div style={{ position: 'absolute', left: MARGE_G, right: MARGE_D, top: 170, bottom: 420, display: 'flex', flexDirection: 'column' }}>
        <Monte debut={0} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Img src={staticFile(ligueLogo)} style={{ width: 60, height: 60, objectFit: 'contain', background: '#fff', borderRadius: 14, padding: 6 }} />
          <span style={{ color: C.gris, fontWeight: 700, fontSize: 40 }}>{ligueTexte}</span>
        </Monte>
        <Monte debut={6} style={{ marginTop: 26 }}>
          <div style={{ color: C.texte, fontWeight: 900, fontSize: tailleAccroche(accroche), lineHeight: 1.03, letterSpacing: -2, textTransform: 'uppercase' }}>{accroche}</div>
        </Monte>
        {sousTitre && (
          <Monte debut={20} style={{ marginTop: 20 }}>
            <div style={{ color: C.bleu, fontWeight: 800, fontSize: 46, lineHeight: 1.1 }}>{sousTitre}</div>
          </Monte>
        )}
        <Monte debut={38} style={{ marginTop: 40, flex: 1, background: C.carte, borderRadius: 44, padding: '38px 36px', display: 'flex', flexDirection: 'column', border: '3px solid rgba(255,255,255,0.10)' }}>
          {children}
        </Monte>
        <Monte debut={piedDebut} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 28 }}>
          <Img src={staticFile('scorro-icon.png')} style={{ width: 68, height: 68, borderRadius: 16 }} />
          <span style={{ color: C.texte, fontWeight: 800, fontSize: 40 }}>Scorro</span>
          {marque.pseudo && <span style={{ color: C.gris, fontWeight: 500, fontSize: 39 }}>{marque.pseudo}</span>}
        </Monte>
      </div>
    </AbsoluteFill>
  );
};
