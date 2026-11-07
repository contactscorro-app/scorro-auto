import React from 'react';
import { Img, Sequence, staticFile } from 'remotion';
import { C, Cadre, Monte } from './commun';
import { ScoreFinal, StatBarre } from './ScoreFinal';

const SCENE1 = 270;
export const dureeApresMatch = () => SCENE1 + 330;

export const ApresMatch: React.FC<any> = (d) => (
  <>
    <Sequence durationInFrames={SCENE1}><ScoreFinal {...d} stat={null} duree={SCENE1} pied={200} /></Sequence>
    <Sequence from={SCENE1}>
      <Cadre duree={330} ligueLogo={d.ligue.logo} ligueTexte={[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ')} accroche={`${d.dom.buts}-${d.ext.buts} : les stats`} sousTitre={`${d.dom.nom} – ${d.ext.nom}`} piedDebut={230}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {d.statsCles.slice(0, d.meilleureNote ? 3 : 4).map((s: any, i: number) => <StatBarre key={s.label} s={s} debut={20 + i * 28} />)}
        </div>
        <div style={{ flex: 1 }} />
        {d.meilleureNote && (
          <Monte debut={130} style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16 }}>
            <Img src={staticFile(d.meilleureNote.logo)} style={{ width: 84, height: 84, objectFit: 'contain' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.gris, fontWeight: 700, fontSize: 34 }}>Meilleure note du match</div>
              <div style={{ color: C.texte, fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{d.meilleureNote.nom}</div>
            </div>
            <div style={{ color: C.vert, fontWeight: 900, fontSize: 72, fontVariantNumeric: 'tabular-nums' }}>{d.meilleureNote.note}</div>
          </Monte>
        )}
      </Cadre>
    </Sequence>
  </>
);
