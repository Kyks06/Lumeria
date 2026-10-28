# Éclats de Lumeria — v3 « L'Ordre du Crépuscule »

RPG de capture de créatures en **pixel art façon GBA**, avec effets « 3D » (lumières, halo, ombres portées,
reflets, météo, jour/nuit), jouable dans le navigateur, aucune installation.
Il y a mille ans, une étoile s'est brisée au-dessus de Lumeria ; ses éclats ont donné vie aux **Lumins**.
Aujourd'hui, l'Ordre du Crépuscule vole les Éclats de l'Aube pour réveiller Nyctaris, le Lumin qui dévore la lumière.
Choisissez votre partenaire, gagnez les huit badges, arrêtez Vesper et devenez Champion de la Ligue du Zénith.

## Lancer le jeu

Les modules ES exigent un petit serveur local (un double-clic sur `index.html` ne suffit pas).
Depuis le dossier du projet :

```bash
# Python (déjà installé sur macOS et la plupart des Linux)
python3 -m http.server 8000

# ou Node.js
npx serve .
```

Ouvrez ensuite http://localhost:8000. Avec VS Code : extension **Live Server** → clic droit sur `index.html` → *Open with Live Server*.
La police pixel est fournie dans `fonts/` ; une connexion Internet sert seulement au premier lancement (Three.js vient d'un CDN).

Navigateur conseillé : Chrome, Edge ou Firefox récents, accélération matérielle activée.
Si le jeu rame, passez la qualité sur **Basse** dans *Options* (le jeu le propose aussi automatiquement au premier lancement).

## Contenu

| | |
|---|---|
| **Lumins** | **357 espèces** : les 180 formes du board + leurs évolutions (1 à 3 stades) + 6 légendaires de l'histoire ; 16 types (Feu, Eau, Plante, Électrik, Glace, Roche, Sol, Air, Insecte, Poison, Spectre, Acier, Dragon, Ténèbres, Lumière, Cosmique), formes chromatiques |
| **Puissance** | rareté par lignée (commun, peu commun, rare, pseudo-légendaire, unique) : statistiques, talents et attaques plus ou moins forts ; moyenne des formes finales ≈ 490 |
| **Habitats** | chaque Lumin vit dans ses biomes (prairie, forêt, côte, haute mer, lacs, marais, montagne, désert, neige, volcan, hauteurs célestes, grottes), parfois seulement le jour ou la nuit ; les rencontres de chaque zone en découlent |
| **Pixel art** | sprites dessinés par programme, animés (respiration, clignement), flammes, cristaux, feux follets et auras de particules selon le type |
| **Monde** | 11 villes et lieux, 9 routes, 4 grottes, 17 bâtiments-énigmes (arènes, repaires, Conseil), 48 intérieurs visitables |
| **Biomes** | prairie, forêt, côte, montagne, désert, marais, neige, volcan, cité céleste, grottes, île tropicale |
| **Arènes** | 8 Champions avec énigmes : haies, rochers à pousser, glace, tapis roulants, interrupteurs, téléporteurs, obscurité |
| **Antagonistes** | l'Ordre du Crépuscule (sbires, Admins Kessel et Morvane, chef Vesper) + le rival Naël (5 combats) |
| **Ligue** | Route Victoire, Conseil des 4, Championne Orsane, revanches renforcées |
| **Après-jeu** | Île Lointaine, Solarion et les 3 gardiens légendaires, Sanctuaire du Zénith, Tour de Combat (séries, Points de Combat à échanger), Carnet de 25 défis |
| **Dresseurs** | 135 dresseurs sur les cartes, IA qui exploite les faiblesses, objets de soin selon la difficulté |
| **Objets** | 140 objets : Prismes spéciaux, baies, objets tenus, pierres d'évolution, 40 Disques Techniques, vitamines… |

**Systèmes** : combats au tour par tour (talents, statuts, météo, coups critiques, priorités, changements),
expérience partagée, évolutions (niveau, pierre, amitié, jour/nuit), cycle jour/nuit, météo,
**pension et reproduction** (œufs, héritage des IV et des natures, attaques d'œuf), PC à boîtes,
**déplacements** : marche, course, vélo, surf, escalade, vol, glissade sur glace, pêche (3 cannes),
capacités de terrain (Coupe, Éclate-Roc, Force, Surf, Lanterne, Escalade, Vol) qui ouvrent des zones secrètes,
Lumins sauvages visibles qui se promènent, PNJ dans chaque maison, boutiques, Grand Magasin, maître des capacités.

**Difficulté** : Facile / Normal / Difficile, plus des défis optionnels cumulables : Nuzlocke, plafond de niveau,
sans objets en combat, monotype.

Durée : environ 15 à 25 h pour l'histoire principale, 30 à 40 h en complétant le Lumidex, l'après-jeu et les défis.

## Commandes

| Action | Clavier / souris | Manette | Tactile |
|---|---|---|---|
| Se déplacer (case par case : appui bref = se tourner) | ZQSD / WASD / flèches | Stick gauche | Joystick |
| Courir | Maj | B / gâchettes | Bouton « Courir » |
| Interagir / valider | E, Entrée, Espace | A | Bouton A, toucher |
| Retour | Échap, Retour arrière, X | B | Bouton « Retour » |
| Menu | Échap, P, Tab | Start | Bouton ☰ |
| Vélo | B | X | Bouton « Vélo » |
| Pêcher | F (face à l'eau) | Y | Menu → Sac |
| Carte / Vol | M | — | Menu → Carte |

Surf : face à l'eau, appuyez sur Interagir. Escalade : approchez une paroi marquée.

Les anciennes sauvegardes (v1, v2) se chargent : les anciennes espèces sont converties vers le nouveau bestiaire.

## Organisation du code

```
index.html, css/style.css      interface (HUD, menus, combat, écrans) ; css/pixel.css = thème pixel GBA
src/main.js                    point d'entrée et boucle
src/core/                      moteur de rendu, entrées, audio, musique procédurale, sauvegarde
src/config/                    données : créatures, attaques, talents, objets, types, dresseurs, badges, boutiques
src/maps/                      les cartes (ch1 à ch5, après-jeu) décrites en données
src/world2d/                   monde 2D en tuiles : cartes, joueur et PNJ sur la grille, rendu, lumières, météo, rencontres
src/pixel/                     pixel art procédural : créatures (creatureArt.js), décors, bâtiments, sols, meubles
src/battle/                    moteur de combat (pur), arène 2D GBA, effets, contrôleur
src/game/                      partie : scénario, scripts, équipe, capacités de terrain, objectifs
src/ui/                        dialogues, menus, écrans, carte, portraits 3D, commandes tactiles
models/                        vos modèles .glb facultatifs (voir models/LISEZMOI.md)
```

Pour modifier le jeu : `src/config/dex.js` (bestiaire : lignées, types, forme, rareté, habitats),
`src/config/creatures.js` (calcul des statistiques et talents), `src/config/looks.js` (apparence),
`src/maps/encounters.js` (biomes de chaque zone), `src/config/moves.js` (attaques),
`src/config/trainers.js` et `src/game/Teams.js` (dresseurs), `src/maps/*.js` (cartes, PNJ, objets),
`src/game/Scripts.js` (événements de l'histoire), `src/config/game.js` (équilibrage).

La sauvegarde est stockée dans le `localStorage` du navigateur : automatique à chaque changement de zone
et à chaque soin, manuelle depuis le menu. Effacer les données du site efface la partie.
