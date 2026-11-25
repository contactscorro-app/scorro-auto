# scorro-auto

Génère et publie automatiquement des vidéos courtes de football (1080×1920) pour TikTok, Instagram et YouTube : avant-match, après-match, récap et avant-journée, stories, formats (Top 5, duel), série « fonctionnalités », carrousel du lundi. Rendu avec [Remotion](https://www.remotion.dev), envoi via Buffer. Sans IA.

Ce dépôt est volontairement **sans secret, sans donnée de match, sans donnée d'utilisateur et sans média tiers** :
- les clés (Buffer, adresse du service de données) sont des *secrets GitHub* ;
- l'état (ce qui est publié, la file d'attente, le verrou `publieur.json`) vit dans un dépôt **privé** séparé ;
- les sons Mixkit (licence « Sound Effects Free License », pas de redistribution) sont téléchargés au moment du rendu (`scripts/preparer-assets.mjs`) ou lus dans un dépôt **privé** de médias (`scripts/preparer-medias.mjs`) ; ils ne sont jamais versionnés ici ;
- les logos et photos sont récupérés au moment du rendu ;
- les bruitages versionnés sont libres (earshot MIT, CC0) : voir `public/sons-fluide/LICENCES.md` et `public/sons/v3/`.

## Fonctionnement
`.github/workflows/auto.yml` lance `scripts/auto.mjs` (cron, réveil externe `cloudflare/worker.js` ou lancement manuel) : calendrier → décision → contrôles → rendu → publication.
Tests : `node --test scripts/controler.test.mjs scripts/verrou.test.mjs`.

## Garde contre les doublons
1. `publieur.json` dans le dépôt d'état (`{"actif":"cloud"}` ou `{"actif":"mac"}`) : seul le publieur nommé envoie à Buffer.
2. Variable `SCORRO_ENVOIS` : sur le serveur, il faut `on` écrit en toutes lettres.
3. Avant chaque post : vérification dans `etat/publiees.json` et dans la file Buffer (lecture seule).

## Configuration (Settings → Secrets and variables → Actions)
Secrets : `SCORRO_PROXY`, `BUFFER_API_KEY`, `BUFFER_CHANNEL_INSTAGRAM`, `BUFFER_CHANNEL_YOUTUBE`, `BUFFER_CHANNEL_TIKTOK`, `DEPOTS_TOKEN` (jeton limité aux dépôts d'état, de vidéos et de médias).
Variables : `VIDEOS_REPO` (dépôt public des vidéos), `ETAT_REPO` (dépôt privé de l'état), `MEDIAS_REPO` (dépôt privé des médias ; sinon `ETAT_REPO`), `SCORRO_ENVOIS` (`on` = envois réels, sinon aucun), `SCORRO_ESSAIS` (`on` = rendus déposés dans la publication privée « essais », sans envoi), `SCORRO_RELANCE` (`on` = chaque passe relance la suivante le soir, si aucun réveil externe).
