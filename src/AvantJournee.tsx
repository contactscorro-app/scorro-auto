import React from 'react';
import { Img, Sequence, staticFile } from 'remotion';
import { C, Cadre, Monte, Photo } from './commun';

const LISTE_BASE = 60, PAR_LIGNE = 10, AFFICHES = 90, CIBLE = 900;
export const PAR_COMPO = 135;
const dureeListe = (n: number) => LISTE_BASE + n * PAR_LIGNE + 45;
// Le temps d'une compo dérive du nombre de compos : la vidéo reste à 30 s avec 2 ou 3 affiches.
const parCompo = (d: any) => Math.min(PAR_COMPO, Math.floor((CIBLE - dureeListe(d.matchs?.length ?? 0) - AFFICHES) / Math.max(1, d.compos?.length ?? 1)));
const dureeAffiches = (d: any) => (d.compos?.length ? AFFICHES : 0);
export const dureeAvantJournee = (d: any) => dureeListe(d.matchs?.length ?? 0) + dureeAffiches(d) + (d.compos?.length ?? 0) * parCompo(d);

const Ligne: React.FC<{ m: any; debut: number; h: number }> = ({ m, debut, h }) => (
  <Monte debut={debut} style={{ display: 'flex', alignItems: 'center', height: h, background: C.carte2, borderRadius: 16, padding: '0 14px', marginBottom: 7, gap: 10 }}>
    <div style={{ width: 118, color: C.bleu, fontWeight: 800, fontSize: 30, lineHeight: 1.05 }}>{m.jour}<br />{m.heure}</div>
    <Cote e={m.dom} sens="row" />
    <span style={{ color: C.gris, fontWeight: 800, fontSize: 29 }}>–</span>
    <Cote e={m.ext} sens="row-reverse" />
  </Monte>
);
const Cote: React.FC<{ e: any; sens: 'row' | 'row-reverse' }> = ({ e, sens }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: sens, alignItems: 'center', gap: 8 }}>
    <Img src={staticFile(e.logo)} style={{ width: 42, height: 42, objectFit: 'contain' }} />
    <div style={{ minWidth: 0, textAlign: sens === 'row' ? 'left' : 'right' }}>
      <div style={{ color: C.texte, fontWeight: 700, fontSize: e.nom.length > 15 ? 21 : e.nom.length > 12 ? 23 : 25, lineHeight: 1.05, whiteSpace: 'nowrap' }}>{e.nom}</div>
      {e.rang && <div style={{ color: C.gris, fontWeight: 700, fontSize: 26 }}>{e.rang} · {e.points} pts</div>}
    </div>
  </div>
);
export const Terrain: React.FC<{ c: any }> = ({ c }) => {
  const lignes: any[][] = c.lignes;
  return (
    <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(180deg,#123222,#0E281B)', borderRadius: 26, border: '3px solid rgba(255,255,255,0.14)', overflow: 'hidden', marginTop: 14 }}>
      <div style={{ position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '15%', border: '3px solid rgba(255,255,255,0.14)', borderBottom: 0 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'rgba(255,255,255,0.14)' }} />
      <div style={{ position: 'absolute', inset: '8px 2px', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-around' }}>
        {lignes.map((rang, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-around' }}>
            {rang.map((j, k) => (
              <Monte key={j.id} debut={6 + i * 4 + k} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Photo j={j} taille={lignes.length >= 5 ? 70 : rang.length >= 5 ? 80 : 92} />
                <div style={{ color: C.texte, fontWeight: 700, fontSize: rang.length >= 5 ? 21 : 26, textAlign: 'center', marginTop: 4, maxWidth: '100%', lineHeight: 1.05 }}>{j.nom}</div>
              </Monte>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
export const ScenesCompos: React.FC<{ ligueLogo: string; compos?: any[]; debut: number; par?: number }> = ({ ligueLogo, compos, debut, par = PAR_COMPO }) => (
  <>
    {(compos ?? []).map((c: any, i: number) => (
      <Sequence key={i} from={debut + i * par} durationInFrames={par}>
        <Cadre duree={par} ligueLogo={ligueLogo} ligueTexte={c.affiche} accroche={c.equipe} sousTitre={c.titre} piedDebut={par - 40}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Img src={staticFile(c.logo)} style={{ width: 62, height: 62, objectFit: 'contain' }} />
            <span style={{ color: C.gris, fontWeight: 800, fontSize: 37 }}>{c.detail}</span>
          </div>
          <Terrain c={c} />
        </Cadre>
      </Sequence>
    ))}
  </>
);
// Dit pourquoi seuls ces matchs ont leur compo.
const EcranAffiches: React.FC<{ d: any; duree: number }> = ({ d, duree }) => (
  <Cadre duree={duree} ligueLogo={d.ligue.logo} ligueTexte={d.ligue.texte} accroche="Les affiches de la journée" sousTitre={`Leurs compos, juste après`} piedDebut={duree - 40}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
      {d.affiches.map((m: any, i: number) => (
        <Monte key={m.id} debut={10 + i * 8} style={{ background: C.carte2, borderRadius: 22, padding: '20px 18px' }}>
          <div style={{ color: C.bleu, fontWeight: 800, fontSize: 32, textAlign: 'center', marginBottom: 12 }}>{m.jour} · {m.heure}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cote e={m.dom} sens="row" />
            <span style={{ color: C.gris, fontWeight: 800, fontSize: 29 }}>–</span>
            <Cote e={m.ext} sens="row-reverse" />
          </div>
        </Monte>
      ))}
      <Monte debut={34} style={{ color: C.gris, fontWeight: 700, fontSize: 34, textAlign: 'center' }}>Seules les affiches ont leur compo détaillée</Monte>
    </div>
  </Cadre>
);
export const AvantJournee: React.FC<any> = (d) => {
  const liste = dureeListe(d.matchs.length);
  const h = Math.min(74, Math.floor(730 / d.matchs.length) - 7);
  return (
    <>
      <Sequence durationInFrames={liste}>
        <Cadre duree={liste} ligueLogo={d.ligue.logo} ligueTexte={d.ligue.texte} accroche={d.accroche} sousTitre={d.sousTitre} piedDebut={liste - 60}>
          <div style={{ color: C.gris, fontWeight: 700, fontSize: 29, textAlign: 'center', marginTop: -14, marginBottom: 10 }}>Heure de Paris · classement actuel</div>
          {d.matchs.map((m: any, i: number) => <Ligne key={m.id} m={m} debut={44 + i * PAR_LIGNE} h={h} />)}
        </Cadre>
      </Sequence>
      {d.compos?.length > 0 && <Sequence from={liste} durationInFrames={AFFICHES}><EcranAffiches d={d} duree={AFFICHES} /></Sequence>}
      <ScenesCompos ligueLogo={d.ligue.logo} compos={d.compos} debut={liste + dureeAffiches(d)} par={parCompo(d)} />
    </>
  );
};
