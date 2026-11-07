import React from 'react';
import { Sequence } from 'remotion';
import { Img, staticFile } from 'remotion';
import { C, Cadre, EquipeCol, Monte, Photo, useEntree } from './commun';
import { PAR_COMPO, ScenesCompos } from './AvantJournee';

type Res = 'V' | 'N' | 'D';
type Equipe = { id: number; nom: string; logo: string; forme: Res[]; classement: { rang: string; points: number } | null };
type Props = {
  ligue: { nom: string; logo: string; tour: string | null }; jour: string; heure: string; accroche: string;
  dom: Equipe; ext: Equipe; h2h: { n: number; dom: number; nuls: number; ext: number } | null;
};
const COUL: Record<Res, string> = { V: C.vert, N: '#5B6478', D: C.rouge };

// Une seule ligne : valeur, libellé au centre, valeur — la disposition de la barre de stat du score final.
const Ligne: React.FC<{ debut: number; label: string; sousLabel?: string; gauche: React.ReactNode; droite: React.ReactNode }> = ({ debut, label, sousLabel, gauche, droite }) => (
  <Monte debut={debut} style={{ background: C.carte2, borderRadius: 24, padding: '14px 26px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {gauche}
    <div style={{ textAlign: 'center', color: C.gris, fontWeight: 800, fontSize: 34, lineHeight: 1.15 }}>{label}{sousLabel && <div style={{ fontSize: 29, fontWeight: 700 }}>{sousLabel}</div>}</div>
    {droite}
  </Monte>
);
const Valeur: React.FC<{ t: string; sous?: string }> = ({ t, sous }) => (
  <span style={{ color: C.texte, fontWeight: 900, fontSize: 46, fontVariantNumeric: 'tabular-nums' }}>{t}{sous && <span style={{ color: C.gris, fontWeight: 700, fontSize: 37 }}> {sous}</span>}</span>
);
const Puce: React.FC<{ r: Res; debut: number }> = ({ r, debut }) => {
  const p = useEntree(debut, 12);
  return <div style={{ width: 54, height: 54, borderRadius: 14, background: COUL[r], color: '#fff', fontWeight: 900, fontSize: 37, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p})` }}>{r}</div>;
};
const Forme: React.FC<{ f: Res[]; debut: number }> = ({ f, debut }) => (
  <div style={{ display: 'flex', gap: 6 }}>{f.map((r, i) => <Puce key={i} r={r} debut={debut + i * 5} />)}</div>
);

const CARTE = 450, JOUEURS = 165;
const scene = (d: any) => (d.joueurs?.length ? JOUEURS : 0);
export const dureeAvantMatch = (d: any) => CARTE + scene(d) + (d.compos?.length ?? 0) * PAR_COMPO;
const LigneJoueur: React.FC<{ j: any; debut: number; taille: number }> = ({ j, debut, taille }) => (
  <Monte debut={debut} style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
    <Photo j={j} taille={taille} />
    <div style={{ minWidth: 0 }}>
      <div style={{ color: C.gris, fontWeight: 800, fontSize: 30 }}>{j.role}</div>
      <div style={{ color: C.texte, fontWeight: 900, fontSize: 40, lineHeight: 1.1 }}>{j.nom}</div>
      <div style={{ color: C.bleu, fontWeight: 800, fontSize: 34 }}>{j.stat}{j.absent && <span style={{ color: C.rouge }}> · Absent</span>}</div>
    </div>
  </Monte>
);
const SceneJoueurs: React.FC<{ d: any }> = ({ d }) => (
  <Cadre duree={JOUEURS} ligueLogo={d.ligue.logo} ligueTexte={d.accroche.replace(/\u00A0/g, ' ')} accroche={d.titreJoueurs} sousTitre={d.sousTitreJoueurs} piedDebut={JOUEURS - 50}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
      {d.joueurs.map((e: any, i: number) => (
        <div key={e.equipe}>
          <Monte debut={8 + i * 20} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Img src={staticFile(e.logo)} style={{ width: 52, height: 52, objectFit: 'contain' }} />
            <span style={{ color: C.texte, fontWeight: 800, fontSize: 39 }}>{e.equipe}</span>
            <span style={{ color: C.gris, fontWeight: 700, fontSize: 32 }}>· {e.ligue}</span>
          </Monte>
          {e.lignes.map((j: any, k: number) => <LigneJoueur key={j.id + j.role} j={j} debut={14 + i * 20 + k * 8} taille={d.joueurs.some((x: any) => x.lignes.length > 1) ? 118 : 170} />)}
        </div>
      ))}
    </div>
  </Cadre>
);
export const AvantMatch: React.FC<Props & { compos?: any[]; joueurs?: any[] }> = (d) => (
  <>
    <Sequence durationInFrames={CARTE}><CarteAvantMatch {...d} /></Sequence>
    {scene(d) > 0 && <Sequence from={CARTE} durationInFrames={JOUEURS}><SceneJoueurs d={d} /></Sequence>}
    <ScenesCompos ligueLogo={d.ligue.logo} compos={d.compos} debut={CARTE + scene(d)} />
  </>
);
const CarteAvantMatch: React.FC<Props> = (d) => {
  const heureP = useEntree(52, 11);
  const classement = d.dom.classement && d.ext.classement;
  const forme = d.dom.forme.length > 0 && d.ext.forme.length > 0;
  return (
    <Cadre duree={CARTE} ligueLogo={d.ligue.logo} ligueTexte={[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ')} accroche={d.accroche} sousTitre="Ton prono ?" piedDebut={CARTE - 90}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: C.bleu, fontWeight: 800, fontSize: 37, letterSpacing: 1, textTransform: 'uppercase' }}>{d.jour}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 22 }}>
        <EquipeCol e={d.dom} debut={44} />
        <div style={{ height: 170, display: 'flex', alignItems: 'center', transform: `scale(${heureP})`, color: C.texte, fontWeight: 900, fontSize: 72, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{d.heure}</div>
        <EquipeCol e={d.ext} debut={48} />
      </div>
      {classement && (
        <Ligne debut={90} label="Classement" gauche={<Valeur t={d.dom.classement!.rang} sous={`${d.dom.classement!.points} pts`} />} droite={<Valeur t={d.ext.classement!.rang} sous={`${d.ext.classement!.points} pts`} />} />
      )}
      {forme && (
        <Monte debut={150} style={{ background: C.carte2, borderRadius: 24, padding: '12px 26px 16px', marginTop: 14 }}>
          <div style={{ color: C.gris, fontWeight: 800, fontSize: 32, textAlign: 'center', marginBottom: 8 }}>Forme : du plus ancien au plus récent</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><Forme f={d.dom.forme} debut={160} /><Forme f={d.ext.forme} debut={180} /></div>
        </Monte>
      )}
      {d.h2h && (
        <Ligne debut={230} label="Face-à-face" sousLabel={`${d.h2h.n} ${d.h2h.n > 1 ? 'derniers' : 'dernier'}, ${d.h2h.nuls} ${d.h2h.nuls > 1 ? 'nuls' : 'nul'}`} gauche={<Valeur t={String(d.h2h.dom)} sous="vict." />} droite={<Valeur t={String(d.h2h.ext)} sous="vict." />} />
      )}
      <div style={{ flex: 1 }} />
      <Monte debut={290} style={{ textAlign: 'center', color: C.texte, fontWeight: 800, fontSize: 40, marginTop: 14 }}>
        Réponds en commentaire : <span style={{ color: C.bleu }}>1, N ou 2</span>
      </Monte>
    </Cadre>
  );
};
