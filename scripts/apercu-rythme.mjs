// Usage : node scripts/apercu-rythme.mjs [jours=3] [--config=data/auto-config.json]
// SIMULATION PURE : ce qui partirait, et quand, sur les prochains jours, d'après le calendrier en cache (etat/auto.json) et les publications déjà faites ou programmées.
// Aucun appel réseau, aucun rendu, aucune écriture. Hypothèses : chaque match finit 1 h 55 après le coup d'envoi, chaque vidéo est rendue et acceptée.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { taches, permis, creneau, joursDeMatch, jourParis, hhmmParis, parisA, HEURE, MIN } from './decider.mjs';
const FINIS = new Set(['FT', 'AET', 'FT_PEN']);
const RESEAUX = ['instagram', 'youtube', 'tiktok'];

export function apercu({ matchs: tous, cfg, pubs, faites = {}, finis = {}, de, a, pas = 10, formatsV3 = null }) {
  const matchs = tous.filter((m) => m.debut > de - 3 * 24 * HEURE && m.debut < a + 2 * 24 * HEURE);
  const conf = { ...cfg, rythme: cfg.rythme ? { ...cfg.rythme, joursMatch: joursDeMatch(matchs, cfg) } : undefined };
  const P = pubs.map((p) => ({ ...p })), fait = new Set(Object.keys(faites)), sortie = [];
  const vus = { ...finis };
  for (let t = Math.ceil(de / (5 * MIN)) * 5 * MIN; t <= a; t += pas * MIN) {
    const ms = matchs.map((m) => (FINIS.has(m.etat) || m.etat === 'POSTPONED' || m.etat === 'CANCELLED' ? m : t >= m.debut + 115 * MIN ? { ...m, etat: 'FT' } : m));
    for (const m of ms) if (FINIS.has(m.etat) && !vus[m.id]) vus[m.id] = Math.max(t, m.debut + 115 * MIN);
    const dues = taches(ms, conf, t, { vusFinis: vus, engages: new Set(), avantOk: () => true, pubs: P }).filter((x) => !fait.has(x.cle)).sort((x, y) => y.poids - x.poids || x.de - y.de);
    for (let x of dues) {
      if (t > x.jusqu) { fait.add(x.cle); sortie.push({ cle: x.cle, format: x.format, quand: null, note: 'trop tard' }); continue; }
      if (x.depot) { fait.add(x.cle); sortie.push({ cle: x.cle, format: x.format, quand: t, reseaux: [`rendu de nuit, déposé (à publier à la main le ${x.datePub}, ${x.creneau})`] }); continue; }
      // Formats du planning et fonctionnalités : comme auto.mjs, rien si le format n'est pas en v3, sinon programmés dans le créneau de leur jour.
      if (x.datePub && formatsV3 && !formatsV3.has(x.format)) { fait.add(x.cle); sortie.push({ cle: x.cle, format: x.format, quand: null, note: `pas en v3 : rien (créneau ${x.datePub} ${x.creneau} réservé, vide)` }); continue; }
      if (x.datePub) { const sl = cfg.rythme?.[x.creneau] ?? (x.creneau === 'matin' ? ['12:00', '14:00'] : ['19:00', '24:00']); x = { ...x, de: parisA(x.datePub, Number(sl[0].split(':')[0])), jusqu: parisA(x.datePub, Math.min(23, Number(sl[1].split(':')[0]))) + (sl[1] === '24:00' ? 59 * MIN : 0) }; }
      const rs = x.reseaux ?? RESEAUX, avant = /^avant-/.test(x.format) || !!x.datePub;
      const ok = rs.map((r) => [r, avant ? creneau(x, r, P, t, conf) : permis(x, r, P, t, conf).ok ? t : null, permis(x, r, P, t, conf).raison]);
      if (ok.some(([, q]) => q !== null)) {
        for (const [r, q] of ok) if (q !== null) P.push({ t: q, reseau: r, cle: x.cle, format: x.format, poids: x.poids, ...(avant ? { programme: true } : {}) });
        fait.add(x.cle);
        sortie.push({ cle: x.cle, format: x.format, quand: Math.min(...ok.filter(([, q]) => q !== null).map(([, q]) => q)), reseaux: ok.filter(([, q]) => q !== null).map(([r]) => r) });
      } else if (!avant && ok.every(([, , raison]) => raison === 'plafond')) { fait.add(x.cle); sortie.push({ cle: x.cle, format: x.format, quand: null, note: 'écartée (plafond du jour)' }); }
    }
  }
  return { sortie, pubs: P };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = Number(process.argv[2] ?? 3);
  const cfgF = process.argv.find((x) => x.startsWith('--config='))?.split('=')[1] ?? 'data/auto-config.json';
  const cfg = JSON.parse(fs.readFileSync(cfgF, 'utf8'));
  const etat = JSON.parse(fs.readFileSync('etat/auto.json', 'utf8'));
  const now = Date.now();
  const { sortie, pubs } = apercu({ matchs: etat.calendrier?.matchs ?? [], cfg, pubs: etat.pubs ?? [], faites: etat.faites, finis: etat.finis, de: now, a: now + n * 24 * HEURE });
  const nom = (c) => { const m = /(\d{6,})/.exec(c); const x = m && (etat.calendrier?.matchs ?? []).find((y) => y.id === Number(m[1])); return x ? ` (${x.nom})` : ''; };
  console.log(`Aperçu ${n} jours à partir de ${jourParis(now)} ${hhmmParis(now)} (Paris) — config ${cfgF} — simulation, rien n'est envoyé`);
  console.log('\nPublications déjà programmées dans Buffer (futures) :');
  for (const p of (etat.pubs ?? []).filter((p) => p.t > now).sort((x, y) => x.t - y.t)) console.log(`  ${jourParis(p.t)} ${hhmmParis(p.t)} | ${p.reseau} | ${p.cle}${nom(p.cle)}`);
  console.log('\nNouvelles vidéos prévues :');
  for (const s of sortie) console.log(`  ${s.quand ? `${jourParis(s.quand)} ${hhmmParis(s.quand)}` : '      —          '} | ${s.cle}${nom(s.cle)} | ${s.quand ? s.reseaux.join('+') : s.note}`);
  const parJour = new Map();
  for (const p of pubs.filter((p) => p.t > now)) { const k = `${jourParis(p.t)} ${p.reseau}`; parJour.set(k, (parJour.get(k) ?? 0) + 1); }
  console.log('\nTotal par jour et par réseau (programmées + prévues) :');
  for (const [k, v] of [...parJour].sort()) console.log(`  ${k} : ${v}`);
}
