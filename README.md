# Commissariat Parpaing

Jeu idle en 3D low-poly, jouable dans le navigateur (ordinateur et mobile) et installable comme une appli :
**https://darinemadgeek.github.io/commissariat-parpaing/**

Vous êtes le commissaire divisionnaire Parpaing. Vous partez d'un petit poste de police à la campagne et vous devez faire rentrer un maximum d'argent, de commissariat en commissariat, jusqu'au ministère.

## Le principe

- **Le cycle d'une GAV** : une patrouille ramène un suspect en cellule. Un enquêteur l'auditionne et, en même temps, un agent PTS le signalise (empreintes, photos, ADN). À la fin de l'audition, si sa signalisation a commencé, la GAV attend qu'elle se termine ; si aucun agent PTS n'a pu s'en occuper, elle sort non signalisée. Il faut donc assez d'agents PTS pour suivre le rythme des enquêteurs.
- L'**accueil** reçoit le public et le **bureau des plaintes** traite les plaintes. Une plainte sur deux donne une piste : les patrouilles vont 50 % plus vite tant qu'il en reste.
- Chaque fin de semaine, un procès-verbal fixe la **prime**. Elle n'est versée que si la jauge d'objectif est pleine. Son montant baisse si la PTS ne suit pas (rien sous 70 % de signalisation) ou si des usagers repartent fâchés.
- L'objectif suit vos résultats, sans jamais dépasser ce que vos équipes peuvent traiter.
- Chaque semaine rapporte jusqu'à **3 étoiles** :
  - l'objectif atteint ;
  - une signalisation PTS d'au moins 95 % ;
  - le critère propre au commissariat.
- Certains lundis, des **missions du préfet** rapportent des étoiles en plus. La « Semaine étoilée » double toutes les étoiles de la semaine.
- À **75 étoiles**, la carte permet d'être muté au commissariat suivant. Chaque poste garde au plus 3 problèmes actifs :

| # | Commissariat | Problème qui arrive |
|---|---|---|
| 1 | Saint-Parpaing-les-Choux (campagne) | aucun, on apprend le métier |
| 2 | Parpaing-Ville | vomi dans les couloirs → agents d'entretien |
| 3 | Grand-Parpaing (métropole) | odeur de pieds → masques à gaz, sinon malaises à la PTS |
| 4 | Parpaing-la-Défense (mégapole) | avocats et délai légal de 24 h |
| 5 | Parpaing-Nord (banlieue) | manifestations par vagues |
| 6 | Parpaing-Plage | touristes : trois fois plus de public |
| 7 | Parpaing-les-Neiges | tempêtes qui bloquent les patrouilles → motoneiges |
| 8 | Roissy-Parpaing (aéroport) | passagers étrangers → interprètes, et colis suspects |
| 9 | Festival de Parpaing | GAV de stars, paparazzis et scandales → chargés de com' |
| 10 | Place Beauvau-Parpaing (ministère) | réunionite et inspection de l'IGPN |

Au-delà, des secteurs sans fin tirent 3 ou 4 problèmes au hasard.

- Le bâtiment grandit par paliers : tour administrative, antenne, hélicoptère, annexe vitrée, statue dorée. La partie n'a pas de fin.
- Le **croissant doré** qui traverse l'écran cache 16 surprises :
  - des bonus : visite du préfet, aura du major, Maxime et le mail LRP, pizzas, BAC, stagiaire, barbecue, IGPN…
  - quelques pièges : Laurine, les corbeaux, le pigeon voleur de tampon, la photocopieuse en panne ;
  - et Amélie, la folle du bus, qui vide les cellules.
- Survolez une stat ou une carte (appui long sur téléphone) pour voir exactement comment elle est calculée et ce qu'elle change.

La partie est sauvegardée automatiquement dans le navigateur.

## Fichiers

- `index.html` : la page, l'écran d'accueil, l'interface et les styles
- `data.js` : l'équilibrage (temps, prix, effets par niveau), les commissariats, les événements et les textes
- `scene-core.js` : le moteur 3D (Three.js r128), les personnages, les clics
- `scene-world.js` / `scene-world2.js` : les décors (campagne, villes, plage, montagne, aéroport, festival, ministère) et la circulation
- `scene-building.js` : le commissariat en vue coupe
- `scene-life.js` : les animations et la synchro avec la partie
- `game-core.js` : la simulation, les problèmes, la prime, les étoiles, les événements, la sauvegarde
- `game-tips.js` : les infobulles
- `game-ui.js` : l'interface, le procès-verbal, la carte, l'écran d'accueil
- `manifest.webmanifest`, `sw.js`, `icons/` : l'installation comme appli et le jeu hors ligne
- `tools/make-icons.js` : génère les icônes ; `tools/sim.js` : simulation d'équilibrage (`node tools/sim.js 6`)

Aucune étape de build : c'est du HTML et du JavaScript statiques, servis par GitHub Pages.
