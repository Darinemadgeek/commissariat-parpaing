# Commissariat Parpaing

Jeu idle en 3D low-poly, jouable dans le navigateur (ordinateur et mobile) :
**https://darinemadgeek.github.io/commissariat-parpaing/**

Vous êtes le commissaire divisionnaire Parpaing. Vous partez d'un petit poste de police sur l'île de Parpaing-sur-Mer et vous devez faire rentrer un maximum d'argent.

## Le principe

- Les **patrouilles** ramènent des suspects en **garde à vue**. Sans place en cellule, ils repartent libres.
- Les **enquêteurs** bouclent les GAV, et chaque GAV bouclée rapporte.
- La **PTS** (police technique et scientifique) doit signaliser chaque personne avant la fin de sa GAV.
- L'**accueil** reçoit le public, et le **bureau des plaintes** traite les plaintes. Une plainte sur deux donne une piste, et avec des pistes les patrouilles interpellent deux fois plus vite.
- Chaque fin de semaine, un procès-verbal fixe la **prime** :
  - la prime récompense le nombre de dossiers traités (GAV + plaintes) ;
  - elle est doublée si l'objectif du préfet est atteint ;
  - elle est réduite, puis supprimée, si la signalisation PTS ne suit pas.
- Le bâtiment grandit par paliers, et la mutation permet de repartir de zéro avec des étoiles. La partie n'a pas de fin.

Cliquez sur le commissaire (ou sur « Coup de tampon ») pour accélérer les GAV, et attrapez les croissants dorés pour des bonus. La partie est sauvegardée dans le navigateur.

## Fichiers

- `index.html` : la page, l'interface et les styles
- `data.js` : l'équilibrage (temps, prix, valeurs) et les textes
- `scene-core.js` / `scene-zones.js` : la scène 3D (Three.js r128)
- `game.js` : la simulation, la prime hebdo et la sauvegarde

Aucune étape de build : c'est du HTML et du JavaScript statiques, servis par GitHub Pages.
