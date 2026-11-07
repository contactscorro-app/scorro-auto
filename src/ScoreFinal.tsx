import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, Cadre, EquipeCol, Monte, useEntree } from './commun';

type Buteur = { nom: string; minutes: string[] };
type Equipe = { id: number; nom: string; logo: string; buts: number; buteurs: Buteur[] };
type Props = {
  ligue: { nom: string; logo: string; tour: string | null }; jour: string; accroche: string; sousTitre: string | null;
  dom: Equipe; ext: Equipe; gagnant: number | null;
  stat: { label: string; unite: string; dom: number; ext: number } | null;
};

// Une règle : le corps dérive du nombre de lignes du côté le plus chargé (1-2 buteurs : inchangé).
const corpsButeurs = (n: number) => (n <= 2 ? 32 : n === 3 ? 28 : 24);
const Buteurs: React.FC<{ e: Equipe; debut: number; align: 'left' | 'right'; corps: number }> = ({ e, debut, align, corps }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: corps >= 32 ? 20 : 10, textAlign: align, minWidth: 0 }}>
    {e.buteurs.map((b, i) => (
      <Monte key={b.nom} debut={debut + i * 12}>
        <span style={{ display: corps >= 32 ? 'block' : 'inline', color: C.texte, fontWeight: 700, fontSize: corps, lineHeight: 1.15 }}>{b.nom}{corps >= 32 ? '' : ' '}</span>
        <span style={{ display: corps >= 32 ? 'block' : 'inline', color: C.bleu, fontWeight: 800, fontSize: corps, fontVariantNumeric: 'tabular-nums' }}>{b.minutes.join(', ')}</span>
      </Monte>
    ))}
  </div>
);

export const StatBarre: React.FC<{ s: NonNullable<Props['stat']>; debut: number }> = ({ s, debut }) => {
  const frame = useCurrentFrame();
  const total = s.dom + s.ext;
  const p = interpolate(frame, [debut, debut + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <Monte debut={debut} style={{ background: C.carte2, borderRadius: 28, padding: '30px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: s.dom >= s.ext ? C.texte : C.gris, fontWeight: 900, fontSize: 64, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.dom * p)}{s.unite}</span>
        <span style={{ color: C.gris, fontWeight: 800, fontSize: 40 }}>{s.label}</span>
        <span style={{ color: s.ext >= s.dom ? C.texte : C.gris, fontWeight: 900, fontSize: 64, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.ext * p)}{s.unite}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18, height: 16 }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', background: C.fond, borderRadius: 8 }}>
          <div style={{ width: `${(s.dom / total) * 100 * p}%`, background: s.dom >= s.ext ? C.bleu : C.gris, borderRadius: 8 }} />
        </div>
        <div style={{ flex: 1, background: C.fond, borderRadius: 8 }}>
          <div style={{ height: '100%', width: `${(s.ext / total) * 100 * p}%`, background: s.ext >= s.dom ? C.bleu : C.gris, borderRadius: 8 }} />
        </div>
      </div>
    </Monte>
  );
};

export const ScoreFinal: React.FC<Props & { duree?: number; pied?: number }> = ({ duree = 450, pied = 320, ...d }) => {
  const aDesButeurs = d.dom.buteurs.length + d.ext.buteurs.length > 0;
  const corps = corpsButeurs(Math.max(d.dom.buteurs.length, d.ext.buteurs.length));
  const scoreP = useEntree(52, 11);
  const domEteint = d.gagnant !== null && d.gagnant !== d.dom.id;
  const extEteint = d.gagnant !== null && d.gagnant !== d.ext.id;
  return (
    <Cadre duree={duree} ligueLogo={d.ligue.logo} ligueTexte={[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ')} accroche={d.accroche} sousTitre={d.sousTitre} piedDebut={pied}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: C.vert, fontWeight: 800, fontSize: 37, letterSpacing: 1, textTransform: 'uppercase' }}>Terminé · {d.jour}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 30 }}>
        <EquipeCol e={d.dom} debut={44} eteint={domEteint} />
        <div style={{ height: 170, display: 'flex', alignItems: 'center', transform: `scale(${scoreP})`, color: C.texte, fontWeight: 900, fontSize: 104, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {d.dom.buts}<span style={{ color: C.gris, margin: '0 8px' }}>-</span>{d.ext.buts}
        </div>
        <EquipeCol e={d.ext} debut={48} eteint={extEteint} />
      </div>
      {aDesButeurs && (
        <div style={{ display: 'flex', gap: 28, marginTop: 34 }}>
          <Buteurs e={d.dom} debut={90} align="left" corps={corps} />
          <Buteurs e={d.ext} debut={110} align="right" corps={corps} />
        </div>
      )}
      <div style={{ flex: 1 }} />
      {d.stat && <StatBarre s={d.stat} debut={170} />}
    </Cadre>
  );
};
