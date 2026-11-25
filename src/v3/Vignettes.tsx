import React from 'react';
import { Img, staticFile } from 'remotion';
import { POLICE, PALETTES, Vignette } from './kit';
import { Photo } from '../commun';
import carte from '../../public/cartes/maghreb.json';

// Vignette de chaque format, tirée du JSON contrôlé de la vidéo (aucune valeur tapée). Sert d'image 0 de la vidéo et de PNG à côté du MP4.
const Ecusson: React.FC<{ src: string; t?: number }> = ({ src, t = 230 }) => <Img src={staticFile(src)} style={{ width: t, height: t, objectFit: 'contain', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.35))' }} />;
const Gros: React.FC<{ t: string; c: string; taille?: number }> = ({ t, c, taille = 200 }) => <span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: taille, color: c, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>{t}</span>;
const Ligne: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 40 }) => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap }}>{children}</div>;
const Col: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 30 }) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>{children}</div>;

export function vignetteDe(format: string, d: any): { titre: string; sous?: string; visuel: React.ReactNode } {
  const p = PALETTES[format] ?? PALETTES.recap, e = p.encre, a = p.clair ? p.encre : p.accent;
  switch (format) {
    case 'recap': {
      const ms = (d.matchs ?? []).slice(0, 3);
      return { titre: `Récap\n${d.ligue.nom}`, sous: d.sousTitre, visuel: <Col gap={26}>{ms.map((m: any) => <Ligne key={m.id} gap={28}><Ecusson src={m.dom.logo} t={120} /><Gros t={`${m.dom.buts}-${m.ext.buts}`} c={e} taille={120} /><Ecusson src={m.ext.logo} t={120} /></Ligne>)}</Col> };
    }
    case 'apres-match': return { titre: 'Score final', sous: d.accroche, visuel: <Ligne><Ecusson src={d.dom.logo} /><Gros t={`${d.dom.buts}-${d.ext.buts}`} c={e} /><Ecusson src={d.ext.logo} /></Ligne> };
    case 'avant-match': return { titre: 'Ton prono ?', sous: d.accroche, visuel: <Col><Ligne><Ecusson src={d.dom.logo} /><Gros t="VS" c={a} taille={120} /><Ecusson src={d.ext.logo} /></Ligne><Gros t={d.heure} c={e} taille={110} /></Col> };
    case 'avant-journee': {
      const ms = (d.matchs ?? []).slice(0, 3);
      return { titre: `Avant-journée\n${d.ligue.nom}`, sous: d.ligue.texte?.split(' · ')[1], visuel: <Col gap={26}>{ms.map((m: any) => <Ligne key={m.id} gap={28}><Ecusson src={m.dom.logo} t={120} /><Gros t={m.heure} c={e} taille={84} /><Ecusson src={m.ext.logo} t={120} /></Ligne>)}</Col> };
    }
    case 'classement': {
      const j = d.sections[0].lignes[0];
      return { titre: `Top buteurs\n${d.ligue.nom}`, sous: d.sousTitre, visuel: <Col>{j.photo ? <Photo j={j} taille={330} /> : <Ecusson src={j.logo} t={300} />}<span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 70, color: e }}>{j.nom}</span><Gros t={`${j.n} buts`} c={p.accent} taille={130} /></Col> };
    }
    case 'classement-equipes': {
      const at = d.sections[0].lignes[0], de = d.sections[1]?.lignes[0];
      return { titre: 'Attaques\ndéfenses', sous: d.ligue.nom, visuel: <Ligne gap={70}><Col gap={14}><Ecusson src={at.logo} t={200} /><Gros t={String(at.n)} c={e} taille={110} /><span style={{ fontFamily: POLICE, fontWeight: 800, fontSize: 40, color: e }}>buts marqués</span></Col>{de && <Col gap={14}><Ecusson src={de.logo} t={200} /><Gros t={String(de.n)} c={e} taille={110} /><span style={{ fontFamily: POLICE, fontWeight: 800, fontSize: 40, color: e }}>encaissés</span></Col>}</Ligne> };
    }
    case 'top5': return { titre: 'Top 5\nbuteurs', sous: d.ligue.nom, visuel: <Col gap={34}><Ligne gap={18}>{d.top.slice(1, 5).reverse().map((j: any) => <Photo key={j.id} j={j} taille={150} />)}</Ligne><div style={{ width: 230, height: 230, borderRadius: 115, background: p.encre, color: p.fond, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: POLICE, fontWeight: 900, fontSize: 150 }}>?</div></Col> };
    case 'duel': return { titre: 'Tu prends qui ?', sous: d.ligue.nom, visuel: <Ligne gap={24}><Col gap={16}><Photo j={d.a} taille={300} /><span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 58, color: e }}>{d.a.nom}</span></Col><Gros t="VS" c={a} taille={110} /><Col gap={16}><Photo j={d.b} taille={300} /><span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 58, color: e }}>{d.b.nom}</span></Col></Ligne> };
    case 'serie': return { titre: 'Série en cours', sous: d.equipe.nom, visuel: <Col gap={10}><Ligne gap={30}><Ecusson src={d.equipe.logo} t={260} /><Gros t={String(d.n)} c={e} taille={300} /></Ligne><span style={{ fontFamily: POLICE, fontWeight: 900, fontSize: 64, color: e, textTransform: 'uppercase' }}>{d.texte}</span></Col> };
    case 'trois': {
      const x = d.points[0];
      return { titre: `${d.equipe.nom}\na changé`, sous: x.label, visuel: <Col gap={20}><Ecusson src={d.equipe.logo} t={230} /><Ligne gap={26}><Gros t={String(x.avant).replace('.', ',')} c={e} taille={140} /><Gros t="→" c={e} taille={110} /><Gros t={String(x.apres).replace('.', ',')} c={p.accent} taille={170} /></Ligne></Col> };
    }
    case 'carte': {
      const n = d.pays.reduce((s: number, x: any) => s + x.joueurs, 0);
      return { titre: 'Le Maghreb\nen Europe', sous: d.pays.map((x: any) => x.nom).join(' · '), visuel: <Col gap={10}><svg width={820} height={(carte.hauteur * 820) / carte.largeur} viewBox={`0 0 ${carte.largeur} ${carte.hauteur}`}>{carte.chemins.map((c: string, i: number) => <path key={i} d={c} fill={p.accent} />)}</svg><Gros t={`${n} joueurs`} c={e} taille={120} /></Col> };
    }
    case 'capture': return { titre: 'Vu sur Scorro', sous: 'Le score qui surprend', visuel: <div style={{ width: 380, height: 760, borderRadius: 64, border: `14px solid ${p.encre}`, background: '#0B0E14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Img src={staticFile('scorro-icon.png')} style={{ width: 170, height: 170, borderRadius: 40 }} /></div> };
    default: return { titre: 'Scorro', visuel: <Img src={staticFile('scorro-icon.png')} style={{ width: 300, height: 300, borderRadius: 70 }} /> };
  }
}
export const VignetteFormat: React.FC<{ format: string; data: any }> = ({ format, data }) => { const v = vignetteDe(format, data); return <Vignette format={format} {...v} />; };

// Ouverture commune : image 0 à 11 = la vignette, nette ; elle part ensuite en zoom flou pendant que l'accroche arrive (aucune image vide).
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { doux } from './kit';
export const VIGNETTE_FIN = 12;
export const OuvertureVignette: React.FC<{ format: string; data: any }> = ({ format, data }) => {
  const f = useCurrentFrame();
  if (f > VIGNETTE_FIN + 16) return null;
  const k = doux(f, VIGNETTE_FIN, VIGNETTE_FIN + 14);
  return <AbsoluteFill style={{ opacity: 1 - k, transform: `scale(${1 + 0.18 * k})`, filter: k > 0.02 ? `blur(${k * 18}px)` : undefined }}><VignetteFormat format={format} data={data} /></AbsoluteFill>;
};
