import React from 'react';
import { Img, Sequence, staticFile } from 'remotion';
import { C, Cadre, EquipeCol, Monte, useEntree } from './commun';

export const INTRO = 40, PAR_MATCH = 68, RECAP = 105, CLASSEMENT = 150;
export const dureeApresJournee = (d: any) => INTRO + (d.matchs?.length ?? 0) * PAR_MATCH + RECAP + (d.classement?.length ? CLASSEMENT : 0);

const Buteurs: React.FC<{ e: any; align: 'left' | 'right'; corps: number }> = ({ e, align, corps }) => (
  <div style={{ flex: 1, minWidth: 0, textAlign: align, display: 'flex', flexDirection: 'column', gap: 6 }}>
    {e.buteurs.map((b: any) => (
      <div key={b.nom} style={{ fontSize: corps, lineHeight: 1.15 }}>
        <span style={{ color: C.texte, fontWeight: 700 }}>{b.nom} </span>
        <span style={{ color: C.bleu, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{b.minutes.join(', ')}</span>
      </div>
    ))}
  </div>
);
const CarteMatch: React.FC<{ m: any; i: number; n: number }> = ({ m, i, n }) => {
  const p = useEntree(0, 18);
  const score = useEntree(6, 11);
  const nb = Math.max(m.dom.buteurs.length, m.ext.buteurs.length);
  const corps = nb <= 3 ? 30 : nb === 4 ? 26 : 22;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: p, transform: `translateX(${(1 - p) * 90}px)`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ color: C.vert, fontWeight: 800, fontSize: 37, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>Terminé · {i + 1}/{n}</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 26 }}>
        <EquipeCol e={m.dom} debut={0} eteint={m.gagnant !== null && m.gagnant !== m.dom.id} />
        <div style={{ height: 170, display: 'flex', alignItems: 'center', transform: `scale(${score})`, color: C.texte, fontWeight: 900, fontSize: 104, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {m.dom.buts}<span style={{ color: C.gris, margin: '0 8px' }}>-</span>{m.ext.buts}
        </div>
        <EquipeCol e={m.ext} debut={0} eteint={m.gagnant !== null && m.gagnant !== m.ext.id} />
      </div>
      <div style={{ display: 'flex', gap: 28, marginTop: 30 }}>
        <Buteurs e={m.dom} align="left" corps={corps} />
        <Buteurs e={m.ext} align="right" corps={corps} />
      </div>
    </div>
  );
};
// Tous les scores d'un coup d'œil, en colonne.
const NomRecap: React.FC<{ e: any; gagne: boolean; sens: 'row' | 'row-reverse' }> = ({ e, gagne, sens }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: sens === 'row' ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
    <Img src={staticFile(e.logo)} style={{ width: 40, height: 40, objectFit: 'contain' }} />
    <span style={{ flex: 1, minWidth: 0, textAlign: sens === 'row' ? 'right' : 'left', color: gagne ? C.texte : C.gris, fontWeight: gagne ? 800 : 600, fontSize: e.nom.length > 13 ? 23 : 27, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nom}</span>
  </div>
);
const Recap: React.FC<{ matchs: any[] }> = ({ matchs }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
    <Monte debut={0} style={{ color: C.gris, fontWeight: 800, fontSize: 39, textAlign: 'center', marginBottom: 12 }}>Le récap</Monte>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {matchs.map((m, i) => (
        <Monte key={m.id} debut={4 + i * 3} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.carte2, borderRadius: 14, padding: '7px 12px' }}>
          <NomRecap e={m.dom} gagne={m.gagnant === m.dom.id || m.gagnant === null} sens="row" />
          <span style={{ width: 92, textAlign: 'center', color: C.texte, fontWeight: 900, fontSize: 40, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{m.dom.buts}-{m.ext.buts}</span>
          <NomRecap e={m.ext} gagne={m.gagnant === m.ext.id || m.gagnant === null} sens="row-reverse" />
        </Monte>
      ))}
    </div>
  </div>
);
const Classement: React.FC<{ lignes: any[]; ligue: string }> = ({ lignes, ligue }) => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
    <Monte debut={0} style={{ color: C.gris, fontWeight: 800, fontSize: 39, textAlign: 'center', marginBottom: 16 }}>Classement de {ligue}</Monte>
    {lignes.map((l, i) => (
      <Monte key={l.id} debut={8 + i * 7} style={{ display: 'flex', alignItems: 'center', gap: 18, background: C.carte2, borderRadius: 18, padding: '11px 20px', marginBottom: 9 }}>
        <span style={{ color: C.texte, fontWeight: 900, fontSize: 40, width: 46, fontVariantNumeric: 'tabular-nums' }}>{l.rang}</span>
        <Img src={staticFile(l.logo)} style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <span style={{ flex: 1, minWidth: 0, color: C.texte, fontWeight: 700, fontSize: 39, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</span>
        <span style={{ color: C.texte, fontWeight: 900, fontSize: 40, fontVariantNumeric: 'tabular-nums' }}>{l.points}<span style={{ color: C.gris, fontSize: 29, fontWeight: 700 }}> pts</span></span>
      </Monte>
    ))}
  </div>
);
export const ApresJournee: React.FC<any> = (d) => {
  const duree = dureeApresJournee(d);
  return (
    <Cadre duree={duree} ligueLogo={d.ligue.logo} ligueTexte={d.ligue.texte} accroche={d.accroche} sousTitre={d.sousTitre} piedDebut={duree - 90}>
      <div style={{ position: 'relative', flex: 1 }}>
        {d.matchs.map((m: any, i: number) => (
          <Sequence key={m.id} from={INTRO + i * PAR_MATCH} durationInFrames={PAR_MATCH} layout="none"><CarteMatch m={m} i={i} n={d.matchs.length} /></Sequence>
        ))}
        <Sequence from={INTRO + d.matchs.length * PAR_MATCH} durationInFrames={RECAP} layout="none"><Recap matchs={d.matchs} /></Sequence>
        {d.classement?.length > 0 && (
          <Sequence from={INTRO + d.matchs.length * PAR_MATCH + RECAP} layout="none"><Classement lignes={d.classement} ligue={d.ligue.nom} /></Sequence>
        )}
      </div>
    </Cadre>
  );
};
