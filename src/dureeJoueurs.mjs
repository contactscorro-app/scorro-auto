// Sans absent, l'écran n'existe pas : la durée le suit. Séparé pour être testable hors de Remotion.
export const INTRO = 40, PAR_JOUEUR = 78, ABSENTS = 165;
export const dureeJoueursJournee = (d) => INTRO + (d.joueurs?.length ?? 0) * PAR_JOUEUR + (d.absents?.length ? ABSENTS : 0);
