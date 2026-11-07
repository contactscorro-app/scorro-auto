import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, Grain } from './commun';
// Couverture d'une vidéo (miniature de la grille) : gros texte, lisible en petit.
// Zone sûre : Instagram recadre la grille en 3:4 (centre), TikTok cache le bas et la droite → tout le texte reste dans x 90–900, y 430–1480.
const L = 90, LARGEUR = 810;
const ETIQUETTE: Record<string, string> = {
  'avant-journee': 'AVANT-JOURNÉE', 'apres-journee': 'RÉCAP', 'avant-match': 'AVANT-MATCH', 'apres-match': 'APRÈS-MATCH',
  'joueurs-journee': 'JOUEURS DE LA JOURNÉE', classement: 'TOP BUTEURS ET PASSEURS', fonctionnalite: 'FONCTIONNALITÉ', presentation: 'SCORRO',
};
const Logo: React.FC<{ src: string; taille: number; blanc?: boolean }> = ({ src, taille, blanc }) => (
  <div style={{ width: taille, height: taille, borderRadius: blanc ? taille * 0.22 : 0, background: blanc ? '#fff' : 'transparent', padding: blanc ? taille * 0.1 : 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  </div>
);
const Pastille: React.FC<{ texte: string }> = ({ texte }) => (
  <div style={{ alignSelf: 'center', background: C.bleu, color: '#fff', fontWeight: 900, fontSize: 58, letterSpacing: 1, padding: '14px 40px', borderRadius: 999, whiteSpace: 'nowrap' }}>{texte}</div>
);
const Pied: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 10 }}>
    <Img src={staticFile('scorro-icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
    <span style={{ color: C.texte, fontWeight: 900, fontSize: 64 }}>Scorro</span>
  </div>
);
// Texte d'une ligne ou deux, tailles dérivées de la longueur.
const taille = (t: string, max: number, min: number, len = 14) => Math.max(min, Math.min(max, Math.round((max * len) / Math.max(len, t.length))));
// Noms raccourcis (préfixes usuels retirés) et empilés sur deux lignes : lisibles en petit, jamais coupés.
const court = (n: string) => String(n).replace(/^(Borussia|FC|SC|AFC|Olympique|Real|Atlético de|Deportivo|Athletic) (?=\S{4,})/i, '').trim();
const NomsMatch: React.FC<{ dom: string; ext: string }> = ({ dom, ext }) => {
  const a = court(dom), b = court(ext), plus = Math.max(a.length, b.length);
  const st: React.CSSProperties = { color: C.texte, fontWeight: 900, fontSize: Math.max(58, Math.min(88, Math.round(88 * 12 / Math.max(12, plus)))), lineHeight: 1.04, textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1, whiteSpace: 'nowrap' };
  return <div><div style={st}>{a}</div><div style={{ ...st, color: C.gris, fontSize: 50, lineHeight: 1.1 }}>contre</div><div style={st}>{b}</div></div>;
};
const jourCourt = (j?: string) => { const m = String(j ?? '').split(' · ')[0].split(' ')[0]; return m ? m.charAt(0).toUpperCase() + m.slice(1, 3) + '.' : ''; };

export const Couverture: React.FC<any> = (d) => {
  const f: string = d.format;
  const etiquette = d.etiquette ?? ETIQUETTE[f] ?? 'SCORRO';
  const estMatch = f === 'avant-match' || f === 'apres-match';
  const [nomLigue, sousLigue] = String(d.ligue?.texte ?? [d.ligue?.nom, d.ligue?.tour].filter(Boolean).join(' · ')).split(' · ');
  return (
    <AbsoluteFill style={{ fontFamily: 'Inter, sans-serif', background: C.fond }}>
      <AbsoluteFill style={{ background: 'radial-gradient(900px 800px at 50% 45%, rgba(62,139,255,0.30), transparent 70%)' }} />
      <div style={{ position: 'absolute', left: L, width: LARGEUR, top: 420, bottom: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pastille texte={etiquette} />
        {estMatch ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 100 }}>
              <Logo src={d.dom.logo} taille={250} /><Logo src={d.ext.logo} taille={250} />
            </div>
            {f === 'apres-match' ? (
              <div style={{ color: C.texte, fontWeight: 900, fontSize: 200, letterSpacing: -5, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{d.dom.buts}<span style={{ color: C.gris, margin: '0 22px' }}>–</span>{d.ext.buts}</div>
            ) : (
              <div style={{ color: C.bleu, fontWeight: 900, fontSize: 120, lineHeight: 1, textAlign: 'center' }}>{[jourCourt(d.jour), d.heure].filter(Boolean).join(' ')}</div>
            )}
            <NomsMatch dom={d.dom.nom} ext={d.ext.nom} />
            <div style={{ color: C.gris, fontWeight: 800, fontSize: 52, textAlign: 'center' }}>{[d.ligue?.nom, d.ligue?.tour].filter(Boolean).join(' · ')}</div>
          </>
        ) : (
          <>
            <Logo src={d.ligue.logo} taille={330} blanc />
            <div style={{ color: C.texte, fontWeight: 900, fontSize: taille(nomLigue ?? '', 150, 96, 11), lineHeight: 1, textAlign: 'center', textTransform: 'uppercase', letterSpacing: -3 }}>{d.titre ?? nomLigue}</div>
            <div style={{ color: C.bleu, fontWeight: 900, fontSize: taille(d.sous ?? sousLigue ?? '', 128, 80, 12), lineHeight: 1, textAlign: 'center' }}>{d.sous ?? sousLigue}</div>
          </>
        )}
        <Pied />
      </div>
      <Grain />
    </AbsoluteFill>
  );
};
