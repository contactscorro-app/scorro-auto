// Déclencheur externe : réveille le workflow GitHub « auto » toutes les 5 min (le cron de GitHub prend des heures de retard).
// Secrets à poser dans Cloudflare (jamais dans le code) : GITHUB_TOKEN (jeton limité à ce dépôt, droit Actions en écriture), GITHUB_REPO (« compte/dépôt »).
// Le groupe de concurrence du workflow empêche deux passes en même temps : un réveil de trop est sans effet.
export default {
  async scheduled(_evenement, env) {
    const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/auto.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'scorro-reveil', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (r.status !== 204) console.log(`réveil refusé : ${r.status}`);
  },
};
