# Check

Crée une application web de prise de notes rapide et de gestion de tâches (To-Do) optimisée pour un dessinateur projeteur en bâtiment. L'application doit être ultra-rapide, moderne, épurée et entièrement fonctionnelle en utilisant le LocalStorage pour la persistance des données.

Voici les fonctionnalités requises pour la V1 :

1. Gestion des Notes / Tâches :

- Formulaire d'ajout rapide : un champ texte pour la note, un sélecteur de catégorie, un sélecteur de statut, et un sélecteur de date d'échéance.

- Chaque note doit afficher : le texte, sa catégorie, son statut, sa date d'échéance (avec une alerte visuelle si l'échéance est dépassée ou proche), et la date de création.

- Possibilité de modifier, supprimer ou archiver une note.

2. Catégories & Organisation :

- Système de catégories pour filtrer les notes. Catégories par défaut : "Chantier 1", "Chantier 2", "Perso".

- Possibilité d'ajouter et de supprimer des catégories personnalisées dynamiquement.

3. Statuts & Cycle de vie :

- 3 statuts obligatoires avec un code couleur clair : "À faire" (Rouge/Orange), "En cours" (Bleu), "Réglé" (Vert).

- Un clic rapide sur le statut dans la liste doit permettre de le faire basculer au statut suivant.

4. Interface & UX (Filtres et Tri) :

- Design "Dashboard" clean, moderne et responsive (adapté mobile et desktop pour l'utiliser sur le chantier ou au bureau).

- Barre de recherche textuelle globale.

- Zone de filtres rapides : filtrer par Catégorie, filtrer par Statut.

- Tri des notes : par date de création (plus récent) ou par date d'échéance.

Contraintes techniques : Stocke TOUTES les données (notes et catégories) dans le localStorage pour qu'aucune info ne soit perdue au rafraîchissement. Pas de backend requis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://outils-hn.github.io/Check/

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/69ad18ee-4606-40dc-9001-00f0d80ce63c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
