// Usage : node scripts/preparer-classement.mjs <leagueId>
// Une seule vidéo : top buteurs puis top passeurs, depuis les événements (buts : 14 et 16, jamais le csc ; passes : related_player des buts).
// 🔴 Recoupé avec /topscorers. Un écart sur ce qui s'affiche, ou trop de buts sans buteur : AUCUN fichier écrit.
import fs from 'node:fs';
import { ecarts, get, lireClassements, nomUsage, telecharger, topEntier, trier } from './commun.mjs';
const ligueId = process.argv[2];
if (!/^\d+$/.test(ligueId ?? '')) throw new Error('leagueId manquant');
const l = (await get(`sportmonks/leagues/${ligueId}?include=currentSeason`)).data;
const c = await lireClassements(l.currentseason?.id ?? l.currentSeason?.id);
if (c.sans >= 5 && c.sans > c.comptes * 0.01) throw new Error(`${c.sans} buts sans buteur sur ${c.comptes} : classement retiré`);
console.log(`${l.name} ${c.nomSaison} : ${c.matchs} matchs, ${c.comptes} buts, ${c.sans} sans buteur`);
const auJour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date()).replace(/^1 /, '1er ');
const section = async (table, agg, unite, titre, source) => {
  const { lignes, suite } = topEntier(trier(table));
  const faux = ecarts(lignes, agg, suite);
  if (faux.length) throw new Error(`${titre} : ÉCART, pas de vidéo :\n  ${faux.join('\n  ')}`);
  for (const x of lignes) await telecharger(c.clubs.get(x.equipe).image_path, `logos/${x.equipe}.png`);
  console.log(titre, lignes.map((x) => `${x.rang}. ${x.nom.trim()} ${x.n}`).join(' | '), suite ? `| puis ${suite.joueurs} à ${suite.n}` : '');
  return { titre, unite, source, suite, lignes: lignes.map((x) => ({ id: x.id, rang: x.rang, nom: c.fiches.has(x.id) ? nomUsage(c.fiches.get(x.id)) : x.nom.trim(), n: x.n, logo: `logos/${x.equipe}.png` })) };
};
const sections = [
  await section(c.buts, c.aggButs, 'buts', 'Top buteurs', 'Penaltys inclus, contre-son-camp exclus'),
  await section(c.passes, c.aggPasses, 'passes', 'Top passeurs', 'Passes décisives sur les buts des matchs terminés'),
];
const ligue = { nom: l.name, logo: `logos/ligue-${l.id}.png`, texte: `${l.name} · Saison ${c.nomSaison}` };
await telecharger(l.image_path, ligue.logo);
fs.writeFileSync(`data/classement-${ligueId}.json`, JSON.stringify({ ligue, sousTitre: `Après ${c.matchs} matchs, au ${auJour}`, sections }, null, 2));
