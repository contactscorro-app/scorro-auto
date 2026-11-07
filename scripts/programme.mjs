// Usage : node scripts/programme.mjs [AAAA-MM-JJ ...]   Liste des PAIRES (avant + après) par jour, et celles coupées. Simulation : rien n'est envoyé.
import fs from 'node:fs';
import { planifier, jourParis, hhmmParis, importance, capDuJour, HEURE, MIN } from './decider.mjs';
import { attacherClassements } from './classements.mjs';
const cfg = JSON.parse(fs.readFileSync('data/auto-config.json', 'utf8'));
const jours = process.argv.slice(2).length ? process.argv.slice(2) : [jourParis(Date.now())];
const PROXY = (process.env.SCORRO_PROXY ?? 'https://proxy-non-configure.invalid');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const debut = Date.parse(`${jours[0]}T00:00:00Z`) - 2 * HEURE;
const fin = Date.parse(`${jours.at(-1)}T00:00:00Z`) + 4 * 24 * HEURE;
const lignes = [];
for (let page = 1; page <= 14; page++) {
  const r = await fetch(`${PROXY}/api/sportmonks/fixtures/between/${iso(debut - 7 * 24 * HEURE)}/${iso(fin)}?filters=fixtureLeagues:${[...cfg.championnats, ...(cfg.coupesEurope ?? [cfg.c1]), ...(cfg.liguesNiveau2 ?? []), ...(cfg.liguesGrosSeulement ?? [])].join(',')}&include=participants;state;league&per_page=50&page=${page}`);
  const j = await r.json();
  lignes.push(...(j.data ?? []));
  if (!j.pagination?.has_more) break;
}
const matchs = lignes.map((f) => ({ id: f.id, ligue: f.league_id, round: f.round_id, season: f.season_id, debut: Date.parse(`${f.starting_at.replace(' ', 'T')}Z`), etat: f.state?.state, dom: f.participants.find((p) => p.meta?.location === 'home')?.id, ext: f.participants.find((p) => p.meta?.location === 'away')?.id, nom: f.participants.map((p) => p.name).join(' – '), ligueNom: f.league?.name ?? String(f.league_id) }));
const parId = new Map(matchs.map((m) => [m.id, m]));
const ligueNom = new Map(matchs.map((m) => [m.ligue, m.ligueNom]));
await attacherClassements(matchs);
const plan = planifier(matchs, cfg);
const jolie = (p) => {
  if (p.type === 'match') return `${hhmmParis(p.m.debut)}  ${p.m.nom}  [score ${p.score}]`;
  const nom = ligueNom.get(p.ligue) ?? p.ligue;
  return p.type === 'soiree'
    ? `Soirée ${nom} du ${p.jour}  : avant-soirée ${p.jours[0]} ${hhmmParis(p.avantDe)} → après-soirée ${p.jours[1]} ${hhmmParis(p.apresDe)}`
    : `Journée ${nom}  : ${p.avecAvant ? `avant-journée ${p.jours[0]} ${hhmmParis(p.avantDe)} → ` : '(avant-journée seulement à partir du 07/11) '}récap ${p.jours.at(-1)} ${hhmmParis(p.apresDe)}`;
};
const tous = [...plan.pm.filter((p) => plan.retenus.has(p.m.id)), ...plan.pj.filter((p) => plan.pairesRetenues.has(p.cle))];
for (const j of jours) {
  console.log(`\n══ ${j} ══  (${plan.usage.get(j) ?? 0} vidéos par réseau sur ${capDuJour(cfg, j)})`);
  const pairesDuJour = tous.filter((p) => p.jours.includes(j)).sort((a, b) => (a.m?.debut ?? a.avantDe) - (b.m?.debut ?? b.avantDe));
  for (const p of pairesDuJour) {
    const moitie = p.type === 'match' ? (p.jours[0] === j && p.jours[1] === j ? 'avant + après' : p.jours[0] === j ? 'avant seul ce jour' : 'après seul ce jour') : p.jours.length === 1 ? 'récap' : p.jours[0] === j && p.jours[1] === j ? 'avant + après' : p.jours[0] === j ? 'avant seul ce jour' : 'après seul ce jour';
    console.log(` ✔ [${p.type}] ${jolie(p)}  — ${moitie}`);
  }
  const coupes = plan.pm.filter((p) => !plan.retenus.has(p.m.id) && p.jourMatch === j).concat(plan.pj.filter((p) => !plan.pairesRetenues.has(p.cle) && (p.jours.includes(j))));
  for (const p of coupes) console.log(` ✂ coupée entière (paire) : ${jolie(p).split('  (')[0]}`);
}
