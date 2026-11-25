import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import '@fontsource/anton/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';

// Carrousel Scorro (images, Instagram 1080×1350 et TikTok mode photo 1080×1920). Inspiré du principe « carte éditoriale » :
// fond crème à grille fine, barre de progression en 5 segments + « 01/05 » en mono, titre géant condensé (Anton, OFL), carte encadrée à ombre dure décalée,
// texte court, icônes LIKE / SAVE / FOLLOW (dessinées ici, aucune marque). Couleurs Scorro : nuit #0B0E14, bleu #3E8BFF, crème #F2EFE7.
// Données : le JSON contrôlé du projet (data/format-top5-301.json), aucune valeur tapée.
const CREME = '#F2EFE7', NUIT = '#0B0E14', BLEU = '#3E8BFF', MONO = "'JetBrains Mono', monospace", TITRE = "'Anton', sans-serif", TEXTE = 'Inter, sans-serif';
export type Slide = { titre: string; surtitre?: string; texte: string; joueurs?: any[]; mystere?: boolean; cta?: boolean; swipe?: boolean; chiffre?: string; capture?: string; captures?: string[]; ctaTexte?: string };

const Grille: React.FC = () => <AbsoluteFill style={{ backgroundColor: CREME, backgroundImage: `linear-gradient(rgba(11,14,20,0.07) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(11,14,20,0.07) 1.5px, transparent 1.5px)`, backgroundSize: '54px 54px' }} />;
const Progression: React.FC<{ i: number; n: number }> = ({ i, n }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
    <div style={{ flex: 1, display: 'flex', gap: 8 }}>{Array.from({ length: n }, (_, k) => <div key={k} style={{ flex: 1, height: 12, background: k <= i ? NUIT : 'rgba(11,14,20,0.14)', border: `2px solid ${NUIT}` }} />)}</div>
    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, color: NUIT }}>{String(i + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}</span>
  </div>
);
const Icone: React.FC<{ type: 'like' | 'save' | 'follow' }> = ({ type }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={NUIT} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      {type === 'like' && <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 5.6 3.4C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20z" />}
      {type === 'save' && <path d="M6 3h12v18l-6-4.5L6 21z" />}
      {type === 'follow' && <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6" /></>}
    </svg>
    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 28, color: NUIT, letterSpacing: 1 }}>{type.toUpperCase()}</span>
  </div>
);
const Joueur: React.FC<{ j: any; grand: boolean; n: number }> = ({ j, grand, n }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
    <div style={{ width: grand ? 230 : n > 2 ? 112 : 150, height: grand ? 230 : n > 2 ? 112 : 150, borderRadius: '50%', overflow: 'hidden', border: `4px solid ${NUIT}`, background: '#E3E7EF', flexShrink: 0 }}>{j.photo && <Img src={staticFile(j.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: TITRE, fontSize: grand ? 96 : n > 2 ? 54 : 64, color: NUIT, lineHeight: 1, textTransform: 'uppercase' }}>{j.usage}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}><Img src={staticFile(j.logo)} style={{ width: 44, height: 44, objectFit: 'contain' }} /><span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: NUIT }}>{j.club}</span></div>
    </div>
  </div>
);
// Petit téléphone : la capture remplit exactement l'écran (proportions 1320×2868), coins concentriques.
const Tel: React.FC<{ src: string; w: number; flou?: boolean }> = ({ src, w, flou }) => { const h = Math.round((w * 2868) / 1320); return <div style={{ padding: 8, background: NUIT, borderRadius: w * 0.14 + 8, flexShrink: 0 }}><div style={{ width: w, height: h, borderRadius: w * 0.14, overflow: 'hidden' }}><Img src={staticFile(src)} style={{ width: w, height: h, filter: flou ? 'blur(5px) grayscale(0.4)' : undefined }} /></div></div>; };
export const SlideCarrousel: React.FC<{ s: Slide; i: number; n: number; haut: number; source: string; etiquette?: string }> = ({ s, i, n, haut, source, etiquette = 'LIGUE 1 · BUTEURS' }) => {
  const tiktok = haut > 1500;
  // Zones sûres : TikTok (bas ~420 px et droite ~130 px masqués par l'interface), Instagram (marges 70 px).
  const pad = tiktok ? { top: 170, bottom: 430, left: 70, right: 140 } : { top: 70, bottom: 64, left: 70, right: 70 };
  return (
    <AbsoluteFill>
      <Grille />
      <div style={{ position: 'absolute', top: pad.top, bottom: pad.bottom, left: pad.left, right: pad.right, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Img src={staticFile('scorro-icon.png')} style={{ width: 54, height: 54, borderRadius: 13 }} /><span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: NUIT }}>SCORRO</span></div>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: NUIT, opacity: 0.7 }}>{etiquette}</span>
        </div>
        <Progression i={i} n={n} />
        {s.surtitre && <div style={{ marginTop: 40, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: BLEU, letterSpacing: 1 }}>{s.surtitre}</div>}
        <div style={{ marginTop: s.surtitre ? 10 : 46, fontFamily: TITRE, fontSize: s.titre.length > 30 ? 104 : s.titre.length > 22 ? 120 : (s.joueurs ?? []).length > 2 ? 118 : 150, lineHeight: 0.95, color: NUIT, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{s.titre}</div>
        <div style={{ marginTop: 40, background: '#FFFFFF', border: `5px solid ${NUIT}`, boxShadow: `16px 16px 0 ${NUIT}`, padding: '34px 36px', display: 'flex', flexDirection: 'column', gap: 26 }}>
          {s.capture ? (
            <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
              <Tel src={s.capture} w={haut > 1500 ? 300 : 230} />
              <div style={{ fontFamily: TEXTE, fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: NUIT }}>{s.texte}</div>
            </div>
          ) : s.captures ? (
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>{s.captures.map((c) => <Tel key={c} src={c} w={haut > 1500 ? 140 : 118} flou />)}</div>
          ) : s.mystere ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {(s.joueurs ?? []).map((j: any) => <div key={j.id} style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: `4px solid ${NUIT}`, background: '#E3E7EF' }}>{j.photo && <Img src={staticFile(j.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) blur(6px)' }} />}</div>)}
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: BLEU, border: `4px solid ${NUIT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TITRE, fontSize: 80, color: '#fff' }}>?</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: (s.joueurs ?? []).length > 2 ? 16 : 26 }}>{(s.joueurs ?? []).map((j: any) => <Joueur key={j.id} j={j} grand={(s.joueurs ?? []).length === 1} n={(s.joueurs ?? []).length} />)}</div>
              {s.chiffre && <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontFamily: TITRE, fontSize: 200, lineHeight: 0.9, color: BLEU }}>{s.chiffre}</div><div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: NUIT }}>BUTS</div></div>}
            </div>
          )}
          {!s.capture && <div style={{ fontFamily: TEXTE, fontWeight: 600, fontSize: 36, lineHeight: 1.3, color: NUIT }}>{s.texte}</div>}
        </div>
        <div style={{ flex: 1 }} />
        {s.swipe && <div style={{ alignSelf: 'flex-end', marginTop: 34, fontFamily: MONO, fontWeight: 800, fontSize: 48, color: '#fff', background: NUIT, padding: '14px 26px', boxShadow: `8px 8px 0 ${BLEU}`, marginBottom: 30 }}>SWIPE →</div>}
        {s.cta && <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: '#fff', background: BLEU, border: `4px solid ${NUIT}`, boxShadow: `10px 10px 0 ${NUIT}`, padding: '20px 26px', marginBottom: 30, lineHeight: 1.25 }}>{s.ctaTexte ?? 'TOUS LES BUTEURS EN DIRECT :'}<br />SCORRO, GRATUIT SUR L'APP STORE</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `3px solid ${NUIT}`, paddingTop: 22 }}>
          <Icone type="like" /><Icone type="save" /><Icone type="follow" />
        </div>
        <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 22, color: NUIT, opacity: 0.6 }}>{source}</div>
      </div>
    </AbsoluteFill>
  );
};
// Exemple : Top 5 buteurs de Ligue 1 en 5 slides (du 4e au 1er, ex æquo groupés).
export const slidesTop5 = (d: any): Slide[] => {
  const par = (r: number) => d.top.filter((j: any) => j.rang === r);
  const rangs = [...new Set(d.top.map((j: any) => j.rang))].sort((a: any, b: any) => b - a) as number[]; // 4, 3, 2, 1
  const lib = (r: number) => { const g = par(r); return `${r === 1 ? 'N°1' : `N°${r}`} · ${g[0].n} BUTS${g.length > 1 ? ` · ${g.length} EX ÆQUO` : ''}`; };
  return [
    { titre: 'Qui marque le plus en Ligue 1 ?', texte: `Le top 5 des buteurs après ${d.sousTitre.match(/(\d+) matchs/)?.[1] ?? ''} matchs. Le n°1 va te surprendre.`, joueurs: d.top.slice(1, 5), mystere: true, swipe: true },
    ...rangs.map((r) => {
      const g = par(r), n = g[0].n, au = rangs.filter((x) => x < r).map((x) => par(x)[0].n), dessus = au.length ? Math.min(...au) : null, apres = rangs.filter((x) => x > r), dessous = apres.length ? par(Math.min(...apres))[0].n : undefined; // le rang juste derrière
      const ecart = (k: number) => `${k} but${k > 1 ? 's' : ''}`;
      const texte = r === 1 ? `Seul en tête, ${ecart(n - (dessous ?? n))} d'avance sur le n°2.` : g.length > 1 ? `${g.length} joueurs à ${n} buts, à ${ecart((dessus ?? n) - n)} du podium.` : `${ecart((dessus ?? n) - n)} de retard sur le n°${r - 1}${dessous !== undefined ? `, ${ecart(n - dessous)} d'avance sur le suivant` : ''}.`;
      return { surtitre: lib(r), titre: r === 1 ? 'Le patron' : g.length > 1 ? 'Au coude à coude' : r === 2 ? 'Si près du trône' : 'Sur le podium', texte, joueurs: g, chiffre: String(n), cta: r === 1 };
    }),
  ].slice(0, 5);
};
export const CarrouselTop5: React.FC<any> = ({ data, i, haut }) => {
  const s = slidesTop5(data);
  return <SlideCarrousel s={s[i]} i={i} n={s.length} haut={haut} source={`Données Sportmonks · ${data.sousTitre.split(' · ')[1] ?? ''}`} />;
};

// Thème « 4 trucs de Scorro que tu ne connais pas » : vraies captures de la version App Store (v1.1.0 build 15), fonctions citées dans ses notes de version.
export const SLIDES_FONC: Slide[] = [
  { titre: '4 trucs de Scorro que tu ne connais pas', texte: 'Tu utilises Scorro pour les scores ? Il fait bien plus que ça.', captures: ['fonctionnalites-v3/recherche.png', 'fonctionnalites-v3/club-infos-2.png', 'fonctionnalites-v3/comparateur-joueurs.png'], swipe: true },
  { surtitre: 'TRUC N°1', titre: 'Cherche par surnom', texte: 'Tape « PSG », « OM » ou « Barça » : le club sort tout de suite.', capture: 'fonctionnalites-v3/recherche.png' },
  { surtitre: 'TRUC N°2', titre: 'Le palmarès daté', texte: 'Chaque titre de ton club, avec les années.', capture: 'fonctionnalites-v3/club-infos-2.png' },
  { surtitre: 'TRUC N°3', titre: 'Joueur contre joueur', texte: 'Compare deux joueurs, stat par stat, saison par saison.', capture: 'fonctionnalites-v3/comparateur-joueurs.png' },
  { surtitre: 'TRUC N°4', titre: 'La Fan Zone', texte: 'Commente chaque match en direct avec les autres fans.', capture: 'fonctionnalites-v3/commentaires.png', cta: true, ctaTexte: 'TOUT ÇA DANS UNE SEULE APPLI :' },
];
export const CarrouselFonc: React.FC<any> = ({ i, haut }) => <SlideCarrousel s={SLIDES_FONC[i]} i={i} n={SLIDES_FONC.length} haut={haut} source="Captures de l'appli Scorro (version App Store)" etiquette="SCORRO · L'APPLI" />;
