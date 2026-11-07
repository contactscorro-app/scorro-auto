// Positions au classement des équipes de chaque match (sert au score d'importance : haut de tableau, écart). Un appel par saison, mis en cache.
const PROXY = (process.env.SCORRO_PROXY ?? 'https://proxy-non-configure.invalid');
export async function attacherClassements(matchs, cache = {}, maintenant = Date.now()) {
  const saisons = [...new Set(matchs.map((m) => m.season).filter(Boolean))];
  for (const s of saisons) {
    if (cache[s] && maintenant - cache[s].lu < 12 * 3600000) continue;
    try {
      const r = await fetch(`${PROXY}/api/sportmonks/standings/seasons/${s}`);
      const lignes = r.ok ? ((await r.json()).data ?? []) : [];
      const ids = new Set(lignes.map((x) => x.participant_id));
      // Plusieurs lignes par équipe (groupes, phases) : on ne devine pas, pas de classement.
      cache[s] = { lu: maintenant, n: ids.size, pos: lignes.length === ids.size ? Object.fromEntries(lignes.map((x) => [x.participant_id, x.position])) : {} };
    } catch { cache[s] = { lu: maintenant, n: 0, pos: {} }; }
  }
  for (const m of matchs) { const c = cache[m.season]; if (c?.n) { m.posDom = c.pos[m.dom]; m.posExt = c.pos[m.ext]; m.nEq = c.n; } }
  return cache;
}
