// Style v3 (skill video-fluide, 22/11) adapté à Scorro Posts, compatible remotion 4.0.380.
// Courbes jamais linéaires (ressort avec léger dépassement, ease-in-out), flou de vitesse, verre dépoli, texte mot par mot + soulignement lumineux,
// fond vivant, palettes de 3 teintes par format (identité Scorro : Inter, logo, bleu #3E8BFF), bruitages variés calés sur les mouvements. AUCUNE musique.
import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { measureText } from '@remotion/layout-utils';

export const POLICE = 'Inter, sans-serif';
export const RESSORT_ARRIVEE = { damping: 12, stiffness: 140, mass: 0.8 };
export const EASE_IO = Easing.bezier(0.65, 0, 0.35, 1);
export const arrivee = (frame: number, fps: number, debut: number, config = RESSORT_ARRIVEE) => spring({ frame: frame - debut, fps, config });
export const doux = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IO });
export const vitesse = (f: (x: number) => number, frame: number) => Math.abs(f(frame) - f(frame - 1));
export const flouVitesse = (px: number, max = 18) => { const b = Math.min(max, Math.abs(px) * 0.35); return b > 0.4 ? `blur(${b.toFixed(2)}px)` : undefined; };

// Palettes : 3 teintes (fond, encre, accent) ; une par format pour varier la grille du profil.
export type Pal = { fond: string; encre: string; accent: string; clair: boolean };
const NUIT = '#0B0E14', BLANC = '#F4F6FA';
export const PALETTES: Record<string, Pal> = {
  recap: { fond: NUIT, encre: BLANC, accent: '#3E8BFF', clair: false },
  'apres-match': { fond: NUIT, encre: BLANC, accent: '#27C281', clair: false },
  'avant-match': { fond: NUIT, encre: BLANC, accent: '#FF8A3D', clair: false },
  'avant-journee': { fond: '#FF8A3D', encre: NUIT, accent: BLANC, clair: true },
  classement: { fond: BLANC, encre: NUIT, accent: '#3E8BFF', clair: true },
  'classement-equipes': { fond: '#3E8BFF', encre: BLANC, accent: NUIT, clair: false },
  top5: { fond: '#FFD23F', encre: NUIT, accent: '#3E8BFF', clair: true },
  duel: { fond: NUIT, encre: BLANC, accent: '#FF4D5E', clair: false },
  serie: { fond: '#27C281', encre: NUIT, accent: BLANC, clair: true },
  trois: { fond: BLANC, encre: NUIT, accent: '#27C281', clair: true },
  carte: { fond: '#12214A', encre: BLANC, accent: '#E8C15A', clair: false },
  capture: { fond: '#9B7BFF', encre: NUIT, accent: BLANC, clair: true },
  // Série « Fonctionnalités de l'app » (23/11) : bleu très clair, encre nuit, accent bleu Scorro.
  fonctionnalite: { fond: '#DCE7FF', encre: NUIT, accent: '#3E8BFF', clair: true },
};

// Police chargée avant toute mesure (sinon les tailles sont fausses).
export const usePolice = () => {
  const [pret, setPret] = React.useState(false);
  const [h] = React.useState(() => delayRender('police Inter'));
  React.useEffect(() => { document.fonts.load('900 100px Inter').then(() => document.fonts.ready).then(() => { setPret(true); continueRender(h); }); }, [h]);
  return pret;
};
export const largeurTexte = (t: string, taille: number, graisse = 900) => measureText({ text: t, fontFamily: POLICE, fontSize: taille, fontWeight: String(graisse), letterSpacing: '-0.03em' }).width;
export const taillePourLargeur = (t: string, largeur: number, graisse = 900, max = 260) => Math.min(max, (largeur / Math.max(1, largeurTexte(t, 100, graisse))) * 100);

// Fond vivant : dégradé subtil de la teinte de fond, lumière douce qui se déplace, vignettage.
export const FondV3: React.FC<{ p: Pal }> = ({ p }) => {
  const f = useCurrentFrame();
  const x = 50 + 18 * Math.sin(f / 80), y = 35 + 12 * Math.cos(f / 95);
  return (
    <AbsoluteFill style={{ background: p.fond }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 900px at ${x}% ${y}%, ${p.clair ? 'rgba(255,255,255,0.55)' : `${p.accent}38`}, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, ${p.clair ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.45)'})` }} />
    </AbsoluteFill>
  );
};
export const Verre: React.FC<{ p: Pal; rayon?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ p, rayon = 40, style, children }) => (
  <div style={{ position: 'relative', borderRadius: rayon, background: p.clair ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px) saturate(150%)', border: `1.5px solid rgba(255,255,255,${p.clair ? 0.7 : 0.16})`, boxShadow: p.clair ? '0 30px 80px -24px rgba(20,24,40,0.28)' : '0 30px 80px -20px rgba(0,0,0,0.6)', overflow: 'hidden', ...style }}>
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(125deg, rgba(255,255,255,${p.clair ? 0.45 : 0.1}) 0%, rgba(255,255,255,0) 38%)` }} />
    <div style={{ position: 'relative', height: '100%' }}>{children}</div>
  </div>
);
// Mot par mot : ressort avec dépassement, flou de vitesse, soulignement lumineux tracé en ease-in-out sur le mot-clé.
export type Mot = { t: string; f: number; souligne?: number; couleur?: string };
export const Mots: React.FC<{ lignes: Mot[][]; tailles: number[]; p: Pal; style?: React.CSSProperties }> = ({ lignes, tailles, p, style }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: POLICE, fontWeight: 900, lineHeight: 1.02, color: p.encre, display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {lignes.map((mots, li) => (
        <div key={li} style={{ display: 'flex', gap: '0 0.26em', whiteSpace: 'nowrap', fontSize: tailles[li], letterSpacing: '-0.03em' }}>
          {mots.map((m, i) => {
            const q = (x: number) => arrivee(x, fps, m.f), v = vitesse(q, frame), t = tailles[li];
            const s = m.souligne !== undefined ? doux(frame, m.souligne, m.souligne + 9) : 0;
            const lueur = m.souligne !== undefined ? interpolate(frame, [m.souligne, m.souligne + 6, m.souligne + 30], [0, 1, 0.65], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', transform: `translateY(${(1 - q(frame)) * 0.5 * t}px)`, opacity: interpolate(q(frame), [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }), filter: flouVitesse(v * 0.5 * t, 14), color: m.couleur ?? p.encre, textShadow: lueur > 0 ? `0 0 ${t * 0.3 * lueur}px ${p.accent}` : undefined }}>
                {m.t}
                {m.souligne !== undefined && <span style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.04em', height: '0.1em', borderRadius: 99, background: p.accent, transform: `scaleX(${s})`, transformOrigin: 'left', boxShadow: `0 0 ${t * 0.3}px ${p.accent}` }} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
// Nappe (25/11) : `nappe` = segments d'une même ambiance enchaînés (pas de contrôle de répétition) ; `debutFichier` saute le fondu du fichier ; `fondu` = entrée en fondu (images).
// Bruitages (aucune musique) : variés, jamais le même fichier deux fois de suite, niveaux 0,15-0,3, ambiance ~0,08.
export type Son = { f: number; src: string; volume: number; duree?: number; vitesse?: number; nappe?: boolean; debutFichier?: number; fondu?: number };
export const Sons: React.FC<{ liste: Son[] }> = ({ liste }) => {
  const tri = [...liste].sort((a, b) => a.f - b.f);
  for (let i = 1; i < tri.length; i++) if (tri[i].src === tri[i - 1].src && !tri[i].nappe && !tri[i].src.startsWith('sons/fond') && !/\/(texte|chiffres)\/(frappe|tic)/.test(tri[i].src)) throw new Error(`bruitage répété deux fois de suite : ${tri[i].src} (${tri[i - 1].f}, ${tri[i].f})`);
  return <>{tri.map((b, i) => <Sequence key={i} from={Math.max(0, b.f)} durationInFrames={b.duree ?? 45}><Audio src={staticFile(b.src)} volume={b.fondu ? (i: number) => b.volume * Math.min(1, (i + 1) / b.fondu!) : b.volume} playbackRate={b.vitesse ?? 1} trimBefore={b.debutFichier} /></Sequence>)}</>;
};
export const Grain: React.FC = () => { const f = useCurrentFrame(); return <AbsoluteFill style={{ pointerEvents: 'none', backgroundImage: `url(${staticFile('grain.png')})`, backgroundPosition: `${(f * 211) % 1080}px ${(f * 347) % 1920}px`, opacity: 0.7 }} />; };

// ───────── Vignette = image 0 de chaque vidéo (décision du 22/11) ─────────
// Titre gros et lisible, visuel principal, logo Scorro ; tout l'important dans le centre 3:4 (y de 240 à 1680) : rien dans les ~12 % du haut et du bas.
export const ZONE = { haut: 300, bas: 1640 };
export const Vignette: React.FC<{ format: string; titre: string; sous?: string; visuel: React.ReactNode }> = ({ format, titre, sous, visuel }) => {
  const p = PALETTES[format] ?? PALETTES.recap;
  const pret = usePolice();
  const lignes = titre.toUpperCase().split('\n');
  const tailles = pret ? lignes.map((l) => taillePourLargeur(l, 860, 900, 190)) : lignes.map(() => 120);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <FondV3 p={p} />
      <div style={{ position: 'absolute', top: ZONE.haut, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {lignes.map((l, i) => <div key={i} style={{ fontWeight: 900, fontSize: tailles[i], lineHeight: 1.0, letterSpacing: '-0.03em', color: p.encre, whiteSpace: 'nowrap' }}>{l}</div>)}
        {sous && <div style={{ marginTop: 22, fontWeight: 800, fontSize: 52, color: p.clair ? p.encre : p.accent, opacity: p.clair ? 0.75 : 1 }}>{sous}</div>}
      </div>
      <div style={{ position: 'absolute', top: 760, bottom: 420, left: 90, right: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{visuel}</div>
      <div style={{ position: 'absolute', bottom: 1920 - ZONE.bas, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <Img src={staticFile('scorro-icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
        <span style={{ fontWeight: 900, fontSize: 54, color: p.encre }}>Scorro</span>
      </div>
    </AbsoluteFill>
  );
};
// Écran de fin v3 : logo + « Dispo sur l'App Store », arrivée en ressort.
export const FinV3: React.FC<{ p: Pal }> = ({ p }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const a = arrivee(f, fps, -6), b = arrivee(f, fps, -2), z = 1 + 0.10 * doux(f, 6, 80);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 34, fontFamily: POLICE }}>
      <FondV3 p={p} />
      <Img src={staticFile('scorro-icon.png')} style={{ width: 220, height: 220, borderRadius: 52, transform: `scale(${(0.5 + 0.5 * a) * z})`, filter: flouVitesse((1 - a) * 40) }} />
      <div style={{ fontWeight: 900, fontSize: 92, color: p.encre, transform: `translateY(${(1 - b) * 60}px)`, opacity: Math.min(1, b * 2) }}>Scorro</div>
      <div style={{ fontWeight: 800, fontSize: 56, color: p.encre, opacity: doux(f, 2, 12), transform: `scale(${z})` }}>Dispo sur l'App Store</div>
    </AbsoluteFill>
  );
};
