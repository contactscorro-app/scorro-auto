// 🔴 Le contrôle avant chaque vidéo. Une valeur absente n'est pas une valeur bonne : ce qui n'a pas été vérifié refuse la vidéo.
const GENERIQUES = new Set(['junior', 'jr', 'sr', 'senior', 'filho', 'neto', 'sobrinho', 'inconnu', 'unknown', 'null', 'undefined', 'n/a', 'na', 'joueur', 'player', 'tba', 'tbd']);
const norme = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[.\s]+$/g, '').trim();
export function nomInvalide(n) {
  if (typeof n !== 'string' || !n.trim()) return 'nom vide';
  const v = norme(n);
  if (GENERIQUES.has(v)) return `nom générique « ${n} »`;
  if (!/\p{L}/u.test(v) || /^\p{L}$/u.test(v)) return `nom illisible « ${n} »`;
  return null;
}
// Tous les champs de nom du fichier, où qu'ils soient : un nouveau format est couvert le jour où il est écrit.
function noms(o, chemin, sortie) {
  if (Array.isArray(o)) { o.forEach((x, i) => noms(x, `${chemin}[${i}]`, sortie)); return; }
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (k === 'controle') continue;
    if (k === 'nom' || k === 'usage') { const p = nomInvalide(v); if (p) sortie.push(`${chemin}.${k} : ${p}`); }
    noms(v, `${chemin}.${k}`, sortie);
  }
}
const absentsAffiches = (d) => [...(d.absents ?? []), ...(d.joueurs ?? []).flatMap((e) => e.lignes ?? []).filter((j) => j.absent)];
const AVEC_SCORE = new Set(['apres-match', 'apres-journee', 'joueurs-journee']);
export function controler(format, d) {
  const p = [];
  noms(d, format, p);
  if (AVEC_SCORE.has(format)) {
    const s = d.controle?.scores;
    if (!Array.isArray(s) || !s.length) p.push('score non recoupé (aucun relevé)');
    else for (const x of s) if (!x.ok) p.push(`score non recoupé, ${x.match} : ${x.raisons.join(', ')}`);
  }
  const relevés = new Map((d.controle?.absents ?? []).map((x) => [x.id, x]));
  for (const a of absentsAffiches(d)) {
    const r = relevés.get(a.id);
    if (!r) p.push(`blessure sans date de contrôle : ${a.usage ?? a.nom}`);
    else if (!r.fraiche) p.push(`blessure non confirmée depuis plus de 7 jours : ${a.usage ?? a.nom}`);
  }
  return p;
}
