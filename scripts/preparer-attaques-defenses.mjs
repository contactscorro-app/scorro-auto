// Usage : node scripts/preparer-attaques-defenses.mjs <leagueId>
// Une vidéo : meilleures attaques (buts marqués) puis meilleures défenses (buts encaissés), depuis le classement officiel. Même composition que les top buteurs.
// 🔴 Recoupé : la somme des buts marqués doit égaler la somme des buts encaissés, toutes les équipes à la même journée ; sinon AUCUN fichier.
import fs from 'node:fs';
import { get, noms, telecharger } from './commun.mjs';
const ligueId = process.argv[2];
if (!/^\d+$/.test(ligueId ?? '')) throw new Error('leagueId manquant');
const l = (await get(`sportmonks/leagues/${ligueId}?include=currentSeason`)).data;
const saison = l.currentseason ?? l.currentSeason;
const st = (await get(`sportmonks/standings/seasons/${saison.id}?include=participant;details`)).data ?? [];
const val = (x, t) => Number((x.details ?? []).find((d) => d.type_id === t)?.value);
const eq = st.map((x) => ({ id: x.participant_id, nom: noms[x.participant_id] ?? x.participant.name, logo: x.participant.image_path, marques: val(x, 133), encaisses: val(x, 134), joues: val(x, 129), round: x.round_id }));
if (eq.length < 10 || new Set(eq.map((e) => e.id)).size !== eq.length) throw new Error('classement incomplet ou en plusieurs groupes : pas de vidéo');
if (eq.some((e) => [e.marques, e.encaisses, e.joues].some(Number.isNaN))) throw new Error('détails du classement manquants : pas de vidéo');
if (new Set(eq.map((e) => e.round)).size !== 1) throw new Error('équipes à des journées différentes : pas de vidéo');
const somme = (k) => eq.reduce((s, e) => s + e[k], 0);
if (somme('marques') !== somme('encaisses')) throw new Error(`ÉCART : ${somme('marques')} buts marqués ≠ ${somme('encaisses')} encaissés, pas de vidéo`);
const section = async (titre, cle, sens) => {
  const tri = [...eq].sort((a, b) => sens * (a[cle] - b[cle]) || a.nom.localeCompare(b.nom));
  let rang = 0, prec = null;
  const lignes = tri.map((e, i) => { if (e[cle] !== prec) { rang = i + 1; prec = e[cle]; } return { e, rang }; }).filter((x) => x.rang <= 5).map(({ e, rang }) => ({ id: e.id, rang, nom: e.nom, n: e[cle], logo: `logos/${e.id}.png` }));
  for (const x of lignes) await telecharger(eq.find((e) => e.id === x.id).logo, x.logo);
  console.log(titre, lignes.map((x) => `${x.rang}. ${x.nom} ${x.n}`).join(' | '));
  return { titre, unite: 'buts', source: cle === 'marques' ? 'Buts marqués, classement officiel' : 'Buts encaissés, classement officiel', suite: null, lignes };
};
const sections = [await section('Meilleures attaques', 'marques', -1), await section('Meilleures défenses', 'encaisses', 1)];
const ligue = { nom: l.name, logo: `logos/ligue-${l.id}.png`, texte: `${l.name} · Saison ${saison.name}` };
await telecharger(l.image_path, ligue.logo);
const auJour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date()).replace(/^1 /, '1er ');
fs.writeFileSync(`data/classement-equipes-${ligueId}.json`, JSON.stringify({ ligue, sousTitre: `Après ${eq[0].joues} matchs, au ${auJour}`, sections }, null, 2));
console.log(`écrit data/classement-equipes-${ligueId}.json`);
