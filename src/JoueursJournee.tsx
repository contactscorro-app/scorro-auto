import React from 'react';
import { Img, Sequence, staticFile } from 'remotion';
import { C, Cadre, Monte, Photo, useEntree } from './commun';

import { INTRO, PAR_JOUEUR, ABSENTS, dureeJoueursJournee } from './dureeJoueurs.mjs';
export { dureeJoueursJournee };

const CarteJoueur: React.FC<{ j: any; i: number; n: number }> = ({ j, i, n }) => {
  const p = useEntree(0, 18);
  const ph = useEntree(4, 12);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: p, transform: `translateX(${(1 - p) * 90}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color: C.gris, fontWeight: 800, fontSize: 34 }}>{i + 1}/{n}</div>
      <Photo j={j} taille={270} style={{ marginTop: 18, transform: `scale(${ph})` }} />
      <div style={{ color: C.texte, fontWeight: 900, fontSize: j.usage.length > 18 ? 46 : 58, textAlign: 'center', lineHeight: 1.05, marginTop: 20 }}>{j.usage}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <Img src={staticFile(j.logo)} style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <span style={{ color: C.gris, fontWeight: 700, fontSize: 34 }}>{j.match}</span>
      </div>
      {j.lignes.map((l: string, k: number) => (
        <div key={l} style={{ color: k === 0 ? C.bleu : C.texte, fontWeight: k === 0 ? 900 : 700, fontSize: k === 0 ? 50 : 32, textAlign: 'center', marginTop: k === 0 ? 22 : 8, lineHeight: 1.1 }}>{l}</div>
      ))}
    </div>
  );
};
const Absents: React.FC<{ d: any }> = ({ d }) => (
  <Cadre duree={ABSENTS} ligueLogo={d.ligue.logo} ligueTexte={d.ligue.texte} accroche="Les grands absents" sousTitre={d.sousTitreAbsents} piedDebut={ABSENTS - 50}>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
      {d.absents.map((j: any, i: number) => (
        <Monte key={j.id} debut={8 + i * 10} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Photo j={j} taille={130} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.texte, fontWeight: 900, fontSize: 40, lineHeight: 1.1 }}>{j.usage}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Img src={staticFile(j.logo)} style={{ width: 38, height: 38, objectFit: 'contain' }} />
              <span style={{ color: C.rouge, fontWeight: 800, fontSize: 34 }}>{j.motif}</span>
            </div>
            <div style={{ color: C.gris, fontWeight: 700, fontSize: 30, marginTop: 2 }}>{j.detail}</div>
          </div>
        </Monte>
      ))}
    </div>
  </Cadre>
);
export const JoueursJournee: React.FC<any> = (d) => {
  const corps = INTRO + d.joueurs.length * PAR_JOUEUR;
  return (
    <>
      <Sequence durationInFrames={corps}>
        <Cadre duree={corps} ligueLogo={d.ligue.logo} ligueTexte={d.ligue.texte} accroche="Les joueurs de la journée" sousTitre={null} piedDebut={corps - 60}>
          <div style={{ position: 'relative', flex: 1 }}>
            {d.joueurs.map((j: any, i: number) => (
              <Sequence key={j.id} from={INTRO + i * PAR_JOUEUR} durationInFrames={PAR_JOUEUR} layout="none"><CarteJoueur j={j} i={i} n={d.joueurs.length} /></Sequence>
            ))}
          </div>
        </Cadre>
      </Sequence>
      {d.absents?.length > 0 && <Sequence from={corps} durationInFrames={ABSENTS}><Absents d={d} /></Sequence>}
    </>
  );
};
