import React from 'react';
import { AbsoluteFill, Composition, Sequence } from 'remotion';
import { ScoreFinal } from './ScoreFinal';
import { AvantMatch, dureeAvantMatch } from './AvantMatch';
import { JoueursJournee, dureeJoueursJournee } from './JoueursJournee';
import { ApresMatch, dureeApresMatch } from './ApresMatch';
import { ApresJournee, dureeApresJournee } from './ApresJournee';
import { AvantJournee, dureeAvantJournee } from './AvantJournee';
import { ClassementJoueurs, dureeClassement } from './ClassementJoueurs';
import { Fin, Fond, Presentation, dureePresentation } from './Presentation';
import { PresentationTikTok, dureeTikTok } from './PresentationTikTok';
import { Grain } from './commun';
import { Couverture } from './Couverture';
import { Fonctionnalite, dureeFonctionnalite } from './Fonctionnalite';
import { Createur, dureeCreateur } from './Createur';
import { Mixage, planSons, planSonsGen } from './Sons';
import { Top5, Duel, Serie, Trois, Carte, dureesTop5, dureesDuel, dureesSerie, dureesTrois, dureesCarte, somme } from './Formats';
import { Top5V3, DUREE_TOP5_V3 } from './v3/Top5V3';
import { VignetteFormat } from './v3/Vignettes';
import { CarrouselTop5, CarrouselFonc } from './v3/Carrousel';
import { RecapV3, tempsRecap } from './v3/RecapV3';
import { ApresMatchV3, tempsApres } from './v3/ApresMatchV3';
import { StoryAvantV3, DUREE_STORY_AVANT_V3 } from './v3/StoryAvantV3';
import { DuelV3, tempsDuel } from './v3/DuelV3';
import { AvantJourneeV3, tempsAvantJournee } from './v3/AvantJourneeV3';
import { FonctionnaliteV3, VignetteFonc, tempsFonc } from './v3/FonctionnaliteV3';
import { StoryAvantMatch, StoryApresMatch, DUREE_STORY_AVANT, DUREE_STORY_APRES, sonsStory } from './Story';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';

// Écran de fin des vidéos de données : la vidéo telle quelle, puis « Dispo sur l'App Store » + site.
const CARTE = 75;
const avecFin = (Comp: React.FC<any>, f: (p: any) => number, son?: (p: any, total: number) => any[], fmt?: string): React.FC<any> => (props) => (
  <>
    {props.sons && son && <Mixage cues={son(props, Math.max(30, f(props)))} />}
    <Sequence durationInFrames={Math.max(30, f(props))}><Comp {...props} /></Sequence>
    <Sequence from={Math.max(30, f(props))} durationInFrames={CARTE}><AbsoluteFill style={{ fontFamily: 'Inter, sans-serif' }}><Fond /><Fin texte="Dispo sur l'App Store" /></AbsoluteFill></Sequence>
    <Grain />
    {fmt && props.couverture && <Sequence durationInFrames={5}><Couverture format={fmt} {...props} /></Sequence>}
  </>
);
// Images où la carte change dans l'avant-match : carte → joueurs clés → chaque compo.
const coupesAvantMatch = (p: any, t: number) => {
  const n = p.compos?.length ?? 0, sc = p.joueurs?.length ? 165 : 0, par = n ? (t - 450 - sc) / n : 0;
  const coupes = [450, ...(sc && n ? [450 + sc] : []), ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => 450 + sc + (i + 1) * par)];
  return planSons('avant-match', p.fixtureId ?? 0, t, coupes.filter((c) => c < t), p.fond);
};
// Plans sonores des autres formats : coupes = images où l'écran change, moments = clameurs (début, fin sur une transition).
const sonAvantJournee = (p: any, t: number) => {
  const n = p.matchs?.length ?? 0, liste = 60 + n * 10 + 45, aff = p.compos?.length ? 90 : 0, nc = p.compos?.length ?? 0, par = nc ? (t - liste - aff) / nc : 0;
  const coupes = [liste, ...(aff && nc ? [liste + aff] : []), ...Array.from({ length: Math.max(0, nc - 1) }, (_, i) => liste + aff + (i + 1) * par)];
  return planSonsGen([...(p.ligue?.texte ?? '')].reduce((a: number, c: string) => a + c.charCodeAt(0), 0), t, coupes, aff ? [[liste + 10, liste + aff]] : []);
};
const sonApresJournee = (p: any, t: number) => {
  const n = p.matchs?.length ?? 0, INTRO = 40, PAR = 68, RECAP = 105;
  const coupes = [INTRO, ...Array.from({ length: n }, (_, i) => INTRO + (i + 1) * PAR), INTRO + n * PAR + RECAP];
  const moments: [number, number][] = Array.from({ length: n }, (_, i) => [INTRO + i * PAR + 14, INTRO + (i + 1) * PAR]);
  return planSonsGen(p.matchs?.[0]?.id ?? 0, t, coupes, moments);
};
const sonJoueursJournee = (p: any, t: number) => {
  const n = p.joueurs?.length ?? 0, INTRO = 40, PAR = 78;
  const coupes = [INTRO, ...Array.from({ length: n }, (_, i) => INTRO + (i + 1) * PAR)];
  const moments: [number, number][] = Array.from({ length: n }, (_, i) => [INTRO + i * PAR + 14, INTRO + (i + 1) * PAR]);
  return planSonsGen(p.joueurs?.[0]?.id ?? 0, t, coupes, moments);
};
const sonClassement = (p: any, t: number) => {
  let x = 0; const coupes: number[] = [];
  for (const s of p.sections ?? []) { const pas = Math.min(30, Math.floor(230 / Math.max(1, s.lignes.length))); x += 45 + s.lignes.length * pas + (s.suite ? 25 : 0) + 90; coupes.push(x); }
  return planSonsGen(301, t, coupes);
};
const FORMAT = { fps: 30, width: 1080, height: 1920, defaultProps: {} as any };
// La durée dérive du contenu (nombre de matchs, de lignes) : une seule règle, aucun cas particulier.
const selon = (f: (p: any) => number) => ({ calculateMetadata: async ({ props }: any) => ({ durationInFrames: Math.max(30, f(props)) }) });
const selonFin = (f: (p: any) => number) => ({ calculateMetadata: async ({ props }: any) => ({ durationInFrames: Math.max(30, f(props)) + CARTE }) });
export const Racine: React.FC = () => (
  <>
    <Composition id="ScoreFinal" component={avecFin(ScoreFinal as React.FC<any>, (() => 450))} durationInFrames={525} {...FORMAT} {...selonFin((() => 450))} />
    <Composition id="AvantMatch" component={avecFin(AvantMatch as React.FC<any>, dureeAvantMatch, (p, t) => coupesAvantMatch(p, t), 'avant-match')} durationInFrames={615} {...FORMAT} {...selonFin(dureeAvantMatch)} />
    <Composition id="JoueursJournee" component={avecFin(JoueursJournee as React.FC<any>, dureeJoueursJournee, sonJoueursJournee, 'joueurs-journee')} durationInFrames={675} {...FORMAT} {...selonFin(dureeJoueursJournee)} />
    <Composition id="ApresMatch" component={avecFin(ApresMatch as React.FC<any>, dureeApresMatch, (p, t) => planSons('apres-match', p.fixtureId ?? 0, t, [270], p.fond), 'apres-match')} durationInFrames={675} {...FORMAT} {...selonFin(dureeApresMatch)} />
    <Composition id="ApresJournee" component={avecFin(ApresJournee as React.FC<any>, dureeApresJournee, sonApresJournee, 'apres-journee')} durationInFrames={675} {...FORMAT} {...selonFin(dureeApresJournee)} />
    <Composition id="AvantJournee" component={avecFin(AvantJournee as React.FC<any>, dureeAvantJournee, sonAvantJournee, 'avant-journee')} durationInFrames={675} {...FORMAT} {...selonFin(dureeAvantJournee)} />
    <Composition id="Createur" component={Createur} durationInFrames={1080} {...FORMAT} {...selon(dureeCreateur)} />
    <Composition id="Presentation" component={Presentation} durationInFrames={825} {...FORMAT} {...selon(dureePresentation)} />
    <Composition id="Fonctionnalite" component={Fonctionnalite} durationInFrames={750} {...FORMAT} {...selon(dureeFonctionnalite)} />
    <Composition id="Couverture" component={Couverture} durationInFrames={1} {...FORMAT} />
    <Composition id="PresentationTikTok" component={PresentationTikTok} durationInFrames={1500} {...FORMAT} {...selon(dureeTikTok)} />
    {/* Les 5 formats automatiques du planning du 22/11 : durée = somme des scènes ; bruitages : sifflet, whoosh à chaque scène, clameur sur la révélation. */}
    {([['FormatTop5', Top5, dureesTop5], ['FormatDuel', Duel, dureesDuel], ['FormatSerie', Serie, dureesSerie], ['FormatTrois', Trois, dureesTrois], ['FormatCarte', Carte, dureesCarte]] as [string, React.FC<any>, (p: any) => number[]][]).map(([id, Comp, ds]) => (
      <Composition key={id} id={id} component={avecFin(Comp, (p) => somme(ds(p)), (p, t) => { const d = ds(p); const coupes = d.slice(0, -1).map((_, i) => somme(d.slice(0, i + 1))); return planSonsGen(id.length * 7, t, coupes, [[coupes[coupes.length - 1] - 60, coupes[coupes.length - 1]]]); }, id)} durationInFrames={600} {...FORMAT} {...selonFin((p) => somme(ds(p)))} />
    ))}
    {/* Stories (22/11) : 7 s, sans écran de fin ; même grain que les vidéos. */}
    <Composition id="StoryAvantMatch" component={(p: any) => (<>{p.sons && <Mixage cues={sonsStory('avant', p.fixtureId ?? 0, DUREE_STORY_AVANT)} />}<StoryAvantMatch {...p} /><Grain /></>)} durationInFrames={DUREE_STORY_AVANT} {...FORMAT} />
    <Composition id="StoryApresMatch" component={(p: any) => (<>{p.sons && <Mixage cues={sonsStory('apres', p.fixtureId ?? 0, DUREE_STORY_APRES)} />}<StoryApresMatch {...p} /><Grain /></>)} durationInFrames={DUREE_STORY_APRES} {...FORMAT} />
    {/* Style v3 (22/11) : vidéo test Top 5 + vignettes (image 0 de chaque vidéo, PNG à côté du MP4). */}
    <Composition id="V3Top5" component={Top5V3} durationInFrames={DUREE_TOP5_V3} {...FORMAT} />
    <Composition id="V3Recap" component={RecapV3} durationInFrames={900} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsRecap(props).total })} />
    <Composition id="V3ApresMatch" component={ApresMatchV3} durationInFrames={600} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsApres(props).total })} />
    <Composition id="V3StoryAvant" component={StoryAvantV3} durationInFrames={DUREE_STORY_AVANT_V3} {...FORMAT} />
    <Composition id="V3StoryApres" component={(p: any) => <ApresMatchV3 {...p} story />} durationInFrames={300} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsApres({ ...props, story: true }).total })} />
    <Composition id="V3Duel" component={DuelV3} durationInFrames={500} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsDuel(props).total })} />
    <Composition id="V3AvantJournee" component={AvantJourneeV3} durationInFrames={500} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsAvantJournee(props).total })} />
    <Composition id="V3Fonctionnalite" component={FonctionnaliteV3} durationInFrames={450} {...FORMAT} calculateMetadata={async ({ props }: any) => ({ durationInFrames: tempsFonc(props).total })} />
    <Composition id="V3FonctionnaliteVignette" component={(p: any) => <VignetteFonc d={p} />} durationInFrames={1} {...FORMAT} />
    {/* Carrousel (images) : Instagram 4:5 et TikTok mode photo 9:16. */}
    <Composition id="CarrouselIG" component={(p: any) => <CarrouselTop5 {...p} haut={1350} />} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{}} />
    <Composition id="CarrouselTT" component={(p: any) => <CarrouselTop5 {...p} haut={1920} />} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{}} />
    <Composition id="CarrouselFoncIG" component={(p: any) => <CarrouselFonc {...p} haut={1350} />} durationInFrames={1} fps={30} width={1080} height={1350} defaultProps={{}} />
    <Composition id="CarrouselFoncTT" component={(p: any) => <CarrouselFonc {...p} haut={1920} />} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{}} />
    <Composition id="VignetteFormat" component={VignetteFormat as React.FC<any>} durationInFrames={1} {...FORMAT} />
    <Composition id="ClassementJoueurs" component={avecFin(ClassementJoueurs as React.FC<any>, dureeClassement, sonClassement, 'classement')} durationInFrames={675} {...FORMAT} {...selonFin(dureeClassement)} />
  </>
);
