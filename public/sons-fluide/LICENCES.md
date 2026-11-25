# Bruitages du skill video-fluide — sources et licences (24/11/2026)

Aucun son de marque (pas de son d'iPhone, d'Instagram, de WhatsApp…), rien qui demande un compte payant.
Chaque fichier : crête ≤ −1 dBFS. Régénérer : `python3 fabriquer.py`.

## RÈGLE DE LICENCE (décision de l'éditeur, 24/11/2026)
- **Usage commercial** (Scorro, clients, offre vidéos, Shopify, pub) : SEULEMENT CC0 / CC BY (avec usage commercial) — tous les fichiers de ce tableau.
- **Cours perso** (privés, jamais publiés) : CC BY-NC permis AUSSI, mais rangés à part dans `perso-non-commercial/` (LISEZMOI, champ `usage: perso` dans index.json). JAMAIS dans une vidéo publique ou payante. Dossier vide pour l'instant.
- **Sans licence claire : interdit partout.**
- Garde automatique : `sons.ts` et `mixer_bruitages.py` refusent un son NC sauf vidéo marquée « cours perso ».

| Fichier | Source exacte | Licence |
|---|---|---|
| `chiffres/compteur-1.wav` | compteur qui défile : 14 tics earshot `tick/key`, accélération puis ralenti | montage maison de sons rendus par earshot (MIT, libres de tout usage) |
| `chiffres/compteur-2.wav` | compteur qui défile : 20 tics earshot `tick/key`, accélération puis ralenti | montage maison de sons rendus par earshot (MIT, libres de tout usage) |
| `chiffres/ding-1.wav` | earshot `--sound tick/glass` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/ding-2.wav` | earshot `--sound tick/glass` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/ding-clair.wav` | earshot `--sound notify/single` (graine 24, prise 1) --pitch E6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/tic-1.wav` | earshot `--sound tick/key` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/tic-2.wav` | earshot `--sound tick/key` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/tic-3.wav` | earshot `--sound tick/key` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/tic-bois-1.wav` | earshot `--sound tick/wood` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `chiffres/tic-bois-2.wav` | earshot `--sound tick/wood` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/ballon-frappe-1.wav` | earshot `--sound ball/kick` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/ballon-frappe-2.wav` | earshot `--sound ball/kick` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/ballon-frappe-3.wav` | earshot `--sound ball/kick` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/ballon-reel-1.wav` | Openverse → https://freesound.org/people/musita182/sounds/261267 — « Soccer Kick.wav » par musita182 (extrait 0.0-0.8 s ; licence vérifiée sur la fiche : fiche : « Creative Commons 0 ») | CC0 1.0 (domaine public) — https://creativecommons.org/publicdomain/zero/1.0/ |
| `foot/ballon-reel-2.wav` | Openverse → https://freesound.org/people/volivieri/sounds/37157 — « soccer kick 02.wav » par volivieri (extrait 0.0-1.1 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/4.0 ») | CC BY 4.0 — CRÉDIT OBLIGATOIRE : « soccer kick 02.wav » par volivieri (https://freesound.org/people/volivieri/sounds/37157), CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ |
| `foot/but-cri-1.mp3` | Mixkit « Stadium joy shouting crowd (extrait 5 s) » (https://mixkit.co, sfx 3022), copie de ~/scorro-posts/sons-a-ecouter/02-stadium-joy-shouting-crowd.mp3 | Mixkit Sound Effects Free License (usage commercial autorisé, sans compte) — https://mixkit.co/license/#sfxFree |
| `foot/but-cri-2.mp3` | Mixkit « Male crowd cheering short » (https://mixkit.co, sfx 459), copie de ~/scorro-posts/sons-a-ecouter/04-male-crowd-cheering-short.mp3 | Mixkit Sound Effects Free License (usage commercial autorisé, sans compte) — https://mixkit.co/license/#sfxFree |
| `foot/filet-reel.wav` | Openverse → https://freesound.org/people/arfanile/sounds/667509 — « Footie near miss goal kick and rattling.mp3 » par arfanile (extrait 2.45-3.6 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/4.0 ») | CC BY 4.0 — CRÉDIT OBLIGATOIRE : « Footie near miss goal kick and rattling.mp3 » par arfanile (https://freesound.org/people/arfanile/sounds/667509), CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ |
| `foot/foule-joie.wav` | earshot `--sound crowd/cheer` (graine 24, prise 1) --dur 3 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/foule-oh-decue.wav` | Openverse → https://freesound.org/people/mrrap4food/sounds/619007 — « crowd `oh - - disappointed.mp3 » par mrrap4food (extrait 0.0-5.0 s ; licence vérifiée sur la fiche : fiche : « Creative Commons 0 ») | CC0 1.0 (domaine public) — https://creativecommons.org/publicdomain/zero/1.0/ |
| `foot/foule-ooh-1.wav` | Openverse → https://freesound.org/people/Quistard/sounds/237683 — « Football Crowd - Near Miss ooh - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (extrait 6.45-9.3 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/3.0 ») | CC BY 3.0 — CRÉDIT OBLIGATOIRE : « Football Crowd - Near Miss ooh - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (https://freesound.org/people/Quistard/sounds/237683), CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/ |
| `foot/foule-ooh-2.wav` | Openverse → https://freesound.org/people/Quistard/sounds/237683 — « Football Crowd - Near Miss ooh - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (extrait 2.55-5.3 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/3.0 ») | CC BY 3.0 — CRÉDIT OBLIGATOIRE : « Football Crowd - Near Miss ooh - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (https://freesound.org/people/Quistard/sounds/237683), CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/ |
| `foot/foule-ooh-3.wav` | Openverse → https://freesound.org/people/paulw2k/sounds/196464 — « Football-crowd-near-miss-from-freekick.wav » par paulw2k (extrait 1.35-4.5 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/4.0 ») | CC BY 4.0 — CRÉDIT OBLIGATOIRE : « Football-crowd-near-miss-from-freekick.wav » par paulw2k (https://freesound.org/people/paulw2k/sounds/196464), CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ |
| `foot/foule-ooh-4.wav` | Openverse → https://freesound.org/people/deleted_user_2104797/sounds/324890 — « Crowd Oooh.wav » par deleted_user_2104797 (extrait 10.7-13.6 s ; licence vérifiée sur la fiche : fiche : « Creative Commons 0 ») | CC0 1.0 (domaine public) — https://creativecommons.org/publicdomain/zero/1.0/ |
| `foot/sifflet-1.wav` | earshot `--sound whistle/referee` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/sifflet-2.wav` | earshot `--sound whistle/referee` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/sifflet-3.wav` | earshot `--sound whistle/referee` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/sifflet-arbitre.wav` | Openverse → https://freesound.org/people/Rosa-Orenes256/sounds/538422 — « Referee whistle sound.wav » par Rosa-Orenes256 (extrait 0.0-0.55 s ; licence vérifiée sur la fiche : fiche : « Creative Commons 0 ») | CC0 1.0 (domaine public) — https://creativecommons.org/publicdomain/zero/1.0/ |
| `foot/souffle-surprise.wav` | earshot `--sound gasp/breath` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `foot/stade-ambiance-1.mp3` | Mixkit « Crowd at the stadium » (https://mixkit.co, sfx 2111), copie de ~/scorro-posts/sons-a-ecouter/03-crowd-at-the-stadium.mp3 | Mixkit Sound Effects Free License (usage commercial autorisé, sans compte) — https://mixkit.co/license/#sfxFree |
| `foot/stade-ambiance-2.mp3` | Mixkit « Ambient sports crowd (extrait 20 s) » (https://mixkit.co), copie de ~/scorro-posts/sons-a-ecouter/11-ambient-sports-crowd-sound-1m16.mp3 | Mixkit Sound Effects Free License (usage commercial autorisé, sans compte) — https://mixkit.co/license/#sfxFree |
| `foot/tribunes-ambiance.mp3` | Openverse → https://freesound.org/people/D.jones/sounds/528799 — « 19 Football Crowd - Reaction To Goal.flac » par D.jones (extrait 0.3-10.3 s ; licence vérifiée sur la fiche : fiche : « Creative Commons 0 ») | CC0 1.0 (domaine public) — https://creativecommons.org/publicdomain/zero/1.0/ |
| `foot/tribunes-but.mp3` | Openverse → https://freesound.org/people/Quistard/sounds/237679 — « Football Crowd - Goal Cheer - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (extrait 32.3-37.6 s ; licence vérifiée sur la fiche : fiche : « creativecommons.org/licenses/by/3.0 ») | CC BY 3.0 — CRÉDIT OBLIGATOIRE : « Football Crowd - Goal Cheer - Southampton Vs Hull at Saint Mary's Stadium.wav » par Quistard (https://freesound.org/people/Quistard/sounds/237679), CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/ |
| `impact/boom-1.wav` | earshot `--sound boom/heavy` (graine 24, prise 1) --dur 1.4 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/boom-2.wav` | earshot `--sound boom/heavy` (graine 24, prise 2) --dur 1.4 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/hit-1.wav` | earshot `--sound hit/drop` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/hit-2.wav` | earshot `--sound hit/drop` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/hit-3.wav` | earshot `--sound hit/drop` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/hit-titre-1.wav` | earshot `--sound slam/title` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/hit-titre-2.wav` | earshot `--sound slam/title` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/impact-forge_01.wav` | earshot forge, recette `impact` (match z 4.32, sonne comme : a cinematic hit with a long tail, a deep cinematic boom) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/impact-forge_02.wav` | earshot forge, recette `impact` (match z 4.11, sonne comme : a cinematic hit with a long tail, a deep cinematic boom) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/impact-forge_03.wav` | earshot forge, recette `impact` (match z 4.05, sonne comme : a deep cinematic boom, a deep cinematic whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/impact-forge_04.wav` | earshot forge, recette `impact` (match z 4.00, sonne comme : a deep cinematic whoosh, a deep cinematic boom) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/stinger-1.wav` | earshot `--sound sting/reveal` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/stinger-2.wav` | earshot `--sound sting/reveal` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/stinger-doux.wav` | earshot `--sound sting/soft` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/thump-forge_01.wav` | earshot forge, recette `thump` (match z 4.13, sonne comme : an explosion, a deep cinematic whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/thump-forge_02.wav` | earshot forge, recette `thump` (match z 4.04, sonne comme : a big drum hit, a deep cinematic whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/thump-forge_03.wav` | earshot forge, recette `thump` (match z 4.03, sonne comme : a big drum hit, a deep cinematic whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `impact/thump-forge_04.wav` | earshot forge, recette `thump` (match z 3.91, sonne comme : a big drum hit, an explosion) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-1.wav` | earshot `--sound click/trackpad` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-2.wav` | earshot `--sound click/trackpad` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-forge_01.wav` | earshot forge, recette `click` (match z 4.17, sonne comme : a soft key release click, crisp hi-hats) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-forge_02.wav` | earshot forge, recette `click` (match z 4.09, sonne comme : crisp hi-hats, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-forge_03.wav` | earshot forge, recette `click` (match z 3.93, sonne comme : crisp hi-hats, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-forge_04.wav` | earshot forge, recette `click` (match z 3.55, sonne comme : a soft key release click, a scroll wheel tick) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/clic-souris.wav` | earshot `--sound click/mouse` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/notification-double.wav` | earshot `--sound notify/pair` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/notification-montante.wav` | earshot `--sound notify/lift` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/notification.wav` | earshot `--sound notify/single` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/scroll-1.wav` | earshot `--sound slide/panel` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/scroll-2.wav` | earshot `--sound slide/panel` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-1.wav` | earshot `--sound swipe/flick` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-2.wav` | earshot `--sound swipe/flick` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-3.wav` | earshot `--sound swipe/flick` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-forge_01.wav` | earshot forge, recette `swipe` (match z 3.99, sonne comme : a fast whoosh, a soft air whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-forge_02.wav` | earshot forge, recette `swipe` (match z 3.83, sonne comme : a fast whoosh, a short swish) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-forge_03.wav` | earshot forge, recette `swipe` (match z 3.81, sonne comme : a fast whoosh, a soft air whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/swipe-forge_04.wav` | earshot forge, recette `swipe` (match z 3.52, sonne comme : a fast whoosh, a deep cinematic whoosh) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/tap-1.wav` | earshot `--sound tap/tone` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/tap-2.wav` | earshot `--sound tap/tone` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/tap-3.wav` | earshot `--sound tap/tone` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/toggle-off.wav` | earshot `--sound toggle/down` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/toggle-on.wav` | earshot `--sound toggle/up` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/vibration-1.wav` | earshot `--sound phone/vibrate` (graine 24, prise 1) --dur 0.9 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `interface/vibration-2.wav` | earshot `--sound phone/vibrate` (graine 24, prise 2) --dur 0.9 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/chute-air.wav` | earshot `--sound fall/air` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/drop-1.wav` | earshot `--sound downlifter/air_fall` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/drop-2.wav` | earshot `--sound downlifter/air_fall` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/glissement-1.wav` | earshot `--sound swipe/cloth` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/glissement-2.wav` | earshot `--sound swipe/cloth` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-1.wav` | earshot `--sound rise/air` (graine 24, prise 1) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-2.wav` | earshot `--sound rise/air` (graine 24, prise 2) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-forge_01.wav` | earshot forge, recette `riser` (match z 3.89, sonne comme : a reverse cymbal swell, a rising riser building tension) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-forge_02.wav` | earshot forge, recette `riser` (match z 3.74, sonne comme : a downlifter falling sweep, a reverse cymbal swell) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-forge_03.wav` | earshot forge, recette `riser` (match z 3.69, sonne comme : a reverse cymbal swell, an uplifter sweep) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-forge_04.wav` | earshot forge, recette `riser` (match z 3.61, sonne comme : a reverse cymbal swell, a rising riser building tension) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/rise-tonal.wav` | earshot `--sound riser/tone` (graine 24, prise 1) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-air-1.wav` | earshot `--sound whoosh/airy` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-air-2.wav` | earshot `--sound whoosh/airy` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-court-1.wav` | earshot `--sound whoosh/soft` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-court-2.wav` | earshot `--sound whoosh/soft` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-court-3.wav` | earshot `--sound whoosh/soft` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-forge_01.wav` | earshot forge, recette `whoosh` (match z 4.97, sonne comme : a fast whoosh, a stick swung fast through the air) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-forge_02.wav` | earshot forge, recette `whoosh` (match z 4.86, sonne comme : a fast whoosh, a stick swung fast through the air) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-forge_03.wav` | earshot forge, recette `whoosh` (match z 4.66, sonne comme : a fast whoosh, a whip pan transition) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-forge_04.wav` | earshot forge, recette `whoosh` (match z 4.55, sonne comme : a fast whoosh, a stick swung fast through the air) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-long-1.wav` | earshot `--sound whoosh/deep` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-long-2.wav` | earshot `--sound whoosh/deep` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-vif-1.wav` | earshot `--sound whoosh/fast` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/whoosh-vif-2.wav` | earshot `--sound whoosh/fast` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/zoom-arriere-1.wav` | earshot `--sound swoosh/out` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/zoom-arriere-2.wav` | earshot `--sound swoosh/out` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/zoom-avant-1.wav` | earshot `--sound swoosh/in` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `mouvement/zoom-avant-2.wav` | earshot `--sound swoosh/in` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `nappes/ambiance-piece.mp3` | earshot `--sound room_tone/quiet` (20 s, boucle) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `nappes/nappe-air.mp3` | earshot `--sound pad/air` (20 s, boucle) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `nappes/nappe-chaude.mp3` | earshot `--sound pad/warm` (20 s, boucle) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/cash.wav` | earshot `--sound cash_register/open` (graine 24, prise 1) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/level-up.wav` | earshot `--sound level_up/fanfare` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/pieces.wav` | earshot `--sound coin/cup` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/sparkle-1.wav` | earshot `--sound shine/air` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/sparkle-2.wav` | earshot `--sound shine/air` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/sparkle-balaye.wav` | earshot `--sound shine/sweep` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `reussite/succes.wav` | earshot `--sound success/triad` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/bulle-pop-1.wav` | earshot `--sound pop/bubble` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/bulle-pop-2.wav` | earshot `--sound pop/bubble` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/bulle-pop-douce-1.wav` | earshot `--sound pop/soft` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/bulle-pop-douce-2.wav` | earshot `--sound pop/soft` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-douce-1.wav` | earshot `--sound keyboard/laptop` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-douce-2.wav` | earshot `--sound keyboard/laptop` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-douce-3.wav` | earshot `--sound keyboard/laptop` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-forge_01.wav` | earshot forge, recette `keypress` (match z 5.60, sonne comme : a single mechanical keyboard key press, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-forge_02.wav` | earshot forge, recette `keypress` (match z 5.47, sonne comme : a single mechanical keyboard key press, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-forge_03.wav` | earshot forge, recette `keypress` (match z 5.45, sonne comme : a single mechanical keyboard key press, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-forge_04.wav` | earshot forge, recette `keypress` (match z 5.36, sonne comme : a single mechanical keyboard key press, a soft key release click) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-mecanique-1.wav` | earshot `--sound keyboard/mechanical` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-mecanique-2.wav` | earshot `--sound keyboard/mechanical` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/frappe-mecanique-3.wav` | earshot `--sound keyboard/mechanical` (graine 24, prise 3) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/machine-a-ecrire-1.wav` | earshot `--sound typewriter/key` (graine 24, prise 1) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/machine-a-ecrire-2.wav` | earshot `--sound typewriter/key` (graine 24, prise 2) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/pop-forge_01.wav` | earshot forge, recette `popin` (match z 2.88, sonne comme : a punchy impact hit, a kick drum) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/pop-forge_02.wav` | earshot forge, recette `popin` (match z 2.80, sonne comme : a wooden block hit, a punchy impact hit) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/pop-forge_03.wav` | earshot forge, recette `popin` (match z 2.74, sonne comme : a punchy impact hit, a kick drum) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/pop-forge_04.wav` | earshot forge, recette `popin` (match z 2.72, sonne comme : a punchy impact hit, a kick drum) | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/stylo-1.wav` | earshot `--sound pencil/write` (graine 24, prise 1) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
| `texte/stylo-2.wav` | earshot `--sound pencil/write` (graine 24, prise 2) --dur 1.6 | earshot (MIT) — son rendu par nous, libre de tout usage, commercial compris, sans crédit |
