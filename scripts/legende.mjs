// Légende et hashtags, par gabarit. Aucune IA. Pas d'appel à télécharger l'app tant qu'elle n'est pas en ligne.
const TAGS_LIGUE = { 301: '#Ligue1', 8: '#PremierLeague', 564: '#LaLiga', 384: '#SerieA', 82: '#Bundesliga', 2: '#LigueDesChampions' };
const tag = (n) => `#${n.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '')}`;
const ligueId = (d) => { const m = /ligue-(\d+)/.exec(d.ligue?.logo ?? ''); return m ? Number(m[1]) : null; };
export function legende(format, d, pub) {
  const eq = [d.dom?.nom, d.ext?.nom].filter(Boolean);
  const tags = [TAGS_LIGUE[ligueId(d)], ...eq.map(tag), '#foot', '#football', '#Scorro'].filter(Boolean);
  const t = {
    'apres-match': () => `${d.accroche} ${d.dom.buts}-${d.ext.buts}.${d.sousTitre ? ` ${d.sousTitre}.` : ''} Ton homme du match ?`,
    'apres-journee': () => `${d.ligue.texte} : ${d.sousTitre}. Tous les scores et le classement.`,
    'joueurs-journee': () => `Les joueurs de la journée, ${d.ligue.texte}. Qui as-tu préféré ?`,
    'avant-journee': () => `${d.ligue.texte} : tous les matchs et les compos des affiches. Ton match à ne pas rater ?`,
    'avant-match': () => `${(d.accroche ?? '').replace(/ /g, ' ')}, ${d.jour.split(' · ')[0]} à ${d.heure}. Ton prono : 1, N ou 2 ?`,
    classement: () => `Top buteurs et passeurs, ${d.ligue.nom}. ${d.sousTitre}.`,
  }[format]();
  const appel = pub?.appEnLigne ? "\n\nScorro, dispo sur l'App Store. Lien dans la bio 👆" : '';
  return `${t}${appel}\n\n${tags.join(' ')}\n`;
}
