import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, Cadre, EquipeCol, Monte, useEntree } from './commun';
import { ScoreFinal } from './ScoreFinal';
import type { Cue } from './Sons';

// Stories (décision de l'éditeur du 22/11 : avant-match et après-match en story, plus en vidéo).
// Mêmes données contrôlées que les vidéos (data/avant-match-<id>.json, data/score-final-<id>.json), même gabarit Scorro, plus court :
// 7 s, pas d'écran de fin, pas de « commentaire » (une story n'a pas de commentaires). Aucune musique : ambiance de foule, sifflet, clameur.
export const DUREE_STORY_AVANT = 210;
export const DUREE_STORY_APRES = 210;

export const StoryAvantMatch: React.FC<any> = (d) => {
  const f = useCurrentFrame();
  const heureP = useEntree(40, 11);
  // L'heure respire doucement : jamais d'image figée plus d'1 s.
  const souffle = 1 + 0.015 * Math.sin((f / 30) * Math.PI);
  const classement = d.dom.classement && d.ext.classement;
  return (
    <Cadre duree={DUREE_STORY_AVANT} ligueLogo={d.ligue.logo} ligueTexte={[d.ligue.nom, d.ligue.tour].filter(Boolean).join(' · ')} accroche={d.accroche} sousTitre={d.jour} piedDebut={60}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <EquipeCol e={d.dom} debut={30} />
          <div style={{ height: 170, display: 'flex', alignItems: 'center', transform: `scale(${heureP * souffle})`, color: C.texte, fontWeight: 900, fontSize: 76, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{d.heure}</div>
          <EquipeCol e={d.ext} debut={34} />
        </div>
        {classement && (
          <Monte debut={70} style={{ background: C.carte2, borderRadius: 24, padding: '14px 26px', marginTop: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.texte, fontWeight: 900, fontSize: 46 }}>{d.dom.classement.rang}</span>
            <span style={{ color: C.gris, fontWeight: 800, fontSize: 34 }}>Classement</span>
            <span style={{ color: C.texte, fontWeight: 900, fontSize: 46 }}>{d.ext.classement.rang}</span>
          </Monte>
        )}
        <Monte debut={110} style={{ textAlign: 'center', marginTop: 44 }}>
          <span style={{ color: C.texte, fontWeight: 900, fontSize: 64, letterSpacing: -1 }}>Ton prono : </span>
          <span style={{ color: C.bleu, fontWeight: 900, fontSize: 64 }}>1, N ou 2 ?</span>
        </Monte>
      </div>
    </Cadre>
  );
};

// Après-match : la carte du score final telle quelle (score, buteurs), sans la scène des stats.
export const StoryApresMatch: React.FC<any> = (d) => {
  const f = useCurrentFrame();
  const fondu = interpolate(f, [DUREE_STORY_APRES - 10, DUREE_STORY_APRES], [1, 0.97], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  return <div style={{ position: 'absolute', inset: 0, opacity: fondu }}><ScoreFinal {...d} stat={null} duree={DUREE_STORY_APRES} pied={120} /></div>;
};

// Sons des stories : foule en fond tout du long, sifflet au début ; pour l'après-match, une clameur quand le score apparaît (image 50).
export const sonsStory = (format: 'avant' | 'apres', id: number, total: number): Cue[] => [
  { frame: 0, fichier: 'fond-a', volume: 0.09, duree: total, depart: (id % 40) * 30, entree: 15, sortie: 9 },
  { frame: 8, fichier: id % 2 ? 'sifflet-court' : 'sifflet', volume: 0.26, duree: 45 },
  ...(format === 'apres' ? [{ frame: 50, fichier: id % 2 ? 'stade-joie' : 'clameur-victoire', volume: 0.18, duree: total - 50, entree: 6, sortie: 12 }] : []),
];
