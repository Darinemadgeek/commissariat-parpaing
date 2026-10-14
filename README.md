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
- Chaque semaine rapporte jusqu'à 3 étoiles : objectif de dossiers atteint, signalisation PTS ≥ 95 %, et un critère propre au commissariat.
- À 10 étoiles, la **carte des affectations** permet d'être muté au commissariat suivant. Chaque nouveau poste ajoute un problème :
  1. **Saint-Parpaing-les-Choux** (campagne) : pas de problème particulier, on apprend le métier.
  2. **Parpaing-Ville** : les GAV ivres vomissent dans les couloirs, il faut une équipe de ménage.
  3. **Grand-Parpaing** (métropole) : des GAV qui puent des pieds, la PTS a besoin de masques à gaz, sinon elle fait des malaises.
  4. **Parpaing-la-Défense** (mégapole) : des avocats et le délai légal de 24 h, passé ce délai la GAV est levée.
  5. **Parpaing-Nord** (cité) : des manifestations qui amènent des vagues entières d'interpellations.
  6. Puis des secteurs sans fin, avec tous les problèmes à la fois.
- Le bâtiment grandit par paliers : tour administrative, antenne, hélicoptère, annexe vitrée, statue dorée. La partie n'a pas de fin.

Cliquez sur le commissaire (ou sur « Coup de tampon ») pour accélérer les GAV, et attrapez les croissants dorés pour des bonus. La partie est sauvegardée dans le navigateur.

## Fichiers

- `index.html` : la page, l'interface et les styles
- `data.js` : l'équilibrage (temps, prix, valeurs) et les textes
- `scene-core.js` : le moteur 3D (Three.js r128), les personnages, les clics
- `scene-world.js` : les décors (campagne, ville, métropole, mégapole, cité) et la circulation
- `scene-building.js` : le commissariat en vue coupe
- `scene-life.js` : les animations et la synchro avec la partie
- `game-core.js` : la simulation, les problèmes, la prime, les étoiles, la sauvegarde
- `game-ui.js` : l'interface, le procès-verbal, la carte des affectations

Aucune étape de build : c'est du HTML et du JavaScript statiques, servis par GitHub Pages.
