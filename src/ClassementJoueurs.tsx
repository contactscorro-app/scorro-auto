import React from 'react';
import { Img, Sequence, staticFile } from 'remotion';
import { C, Cadre, Monte, useEntree } from './commun';

// Une seule vidéo : buteurs puis passeurs. Le rythme dérive du nombre de lignes, pour rester sous 30 s même à 10 lignes par section.
const DEBUT = 45, FIN = 90, SUITE = 25, BUDGET = 230;
const parLigne = (s: any) => Math.min(30, Math.floor(BUDGET / Math.max(1, s.lignes.length)));
const dureeSection = (s: any) => DEBUT + s.lignes.length * parLigne(s) + (s.suite ? SUITE : 0) + FIN;
export const dureeClassement = (d: any) => (d.sections ?? []).reduce((n: number, s: any) => n + dureeSection(s), 0);

const Ligne: React.FC<{ l: any; debut: number; h: number }> = ({ l, debut, h }) => {
  const p = useEntree(debut, 13);
  const premier = l.rang === 1;
  return (
    <div style={{ opacity: p, transform: `translateX(${(1 - p) * 80}px)`, display: 'flex', alignItems: 'center', gap: 16, height: h, background: premier ? 'rgba(62,139,255,0.18)' : C.carte2, border: premier ? `2px solid ${C.bleu}` : '2px solid transparent', borderRadius: 18, padding: '0 18px', marginBottom: 8 }}>
      <span style={{ color: premier ? C.bleu : C.gris, fontWeight: 900, fontSize: 40, width: 44, fontVariantNumeric: 'tabular-nums' }}>{l.rang}</span>
      <Img src={staticFile(l.logo)} style={{ width: 46, height: 46, objectFit: 'contain' }} />
      <span style={{ flex: 1, minWidth: 0, color: C.texte, fontWeight: 700, fontSize: 37, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nom}</span>
      <span style={{ color: C.texte, fontWeight: 900, fontSize: 42, fontVariantNumeric: 'tabular-nums' }}>{l.n}</span>
    </div>
  );
};
const Section: React.FC<{ s: any; ligue: any; sousTitre: string }> = ({ s, ligue, sousTitre }) => {
  const duree = dureeSection(s), n = s.lignes.length, pas = parLigne(s);
  const h = Math.min(86, Math.floor((s.suite ? 600 : 650) / n) - 8);
  return (
    <Cadre duree={duree} ligueLogo={ligue.logo} ligueTexte={ligue.texte} accroche={s.titre} sousTitre={sousTitre} piedDebut={duree - 70}>
      <div style={{ color: C.gris, fontWeight: 700, fontSize: 29, textAlign: 'center', marginTop: -14, marginBottom: 10 }}>{s.source}</div>
      {s.lignes.map((l: any, i: number) => <Ligne key={l.id} l={l} debut={DEBUT + (n - 1 - i) * pas} h={h} />)}
      {s.suite && (
        <Monte debut={DEBUT - 20} style={{ color: C.gris, fontWeight: 700, fontSize: 32, textAlign: 'center', marginTop: 4, order: 99 }}>
          Puis {s.suite.joueurs} joueurs à {s.suite.n} {s.suite.n > 1 ? s.unite : s.unite.replace(/s$/, '')}
        </Monte>
      )}
    </Cadre>
  );
};
export const ClassementJoueurs: React.FC<any> = (d) => {
  let t = 0;
  return (
    <>
      {d.sections.map((s: any) => {
        const from = t, duree = dureeSection(s);
        t += duree;
        return <Sequence key={s.titre} from={from} durationInFrames={duree}><Section s={s} ligue={d.ligue} sousTitre={d.sousTitre} /></Sequence>;
      })}
    </>
  );
};
