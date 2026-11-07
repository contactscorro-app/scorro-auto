# scorro-posts

Génère et publie automatiquement des vidéos courtes de football (1080×1920) pour TikTok, Instagram et YouTube : avant-match, après-match, avant/après-journée, joueurs de la journée, classements. Rendu avec [Remotion](https://www.remotion.dev), envoi via Buffer. Sans IA.

Ce dépôt est volontairement **sans secret, sans donnée de match et sans média tiers** :
- les clés (Buffer, adresse du service de données) sont des *secrets GitHub* ;
- l'état (ce qui est publié, la file d'attente) vit dans un dépôt **privé** séparé ;
- les effets sonores (Mixkit, licence « Sound Effects Free License ») et le grain sont téléchargés / générés au moment du rendu (`scripts/preparer-assets.mjs`) et ne sont jamais versionnés ;
- les logos et photos sont récupérés au moment du rendu.

## Fonctionnement
`.github/workflows/auto.yml` lance `scripts/auto.mjs` toutes les 5 minutes : calendrier → décision (paires avant/après, priorités, plafonds, nuit 0 h–8 h, 30 min d'écart) → contrôles → rendu → publication. `node --test scripts/controler.test.mjs` lance les tests.

## Réglages
`data/auto-config.json` (championnats, clubs, plafonds), `data/clubs-prioritaires.json`, `data/noms.json`, `data/marque.json`, `data/publication.json`.

## Configuration du dépôt (Settings → Secrets and variables → Actions)
Secrets : `SCORRO_PROXY`, `BUFFER_API_KEY`, `BUFFER_CHANNEL_INSTAGRAM`, `BUFFER_CHANNEL_YOUTUBE`, `BUFFER_CHANNEL_TIKTOK`, `DEPOTS_TOKEN` (jeton limité aux deux dépôts ci-dessous).
Variables : `VIDEOS_REPO` (dépôt public des vidéos), `ETAT_REPO` (dépôt privé de l'état), `SCORRO_ENVOIS` (`off` = essai à blanc sans aucun envoi, `on` = envois réels).
