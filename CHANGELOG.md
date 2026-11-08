# Journal des versions — Check

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 3.9 — 8 novembre 2026

- Technique : les données sont passées sur le nouveau serveur Supabase en Suisse (adresse, clé et mémoire de connexion mises à jour). Il faut se reconnecter une fois.

## 3.8 — 7 novembre 2026

- Correction : le texte de l'écran de connexion est raccourci pour tenir sur une ligne.

## 3.7 — 7 novembre 2026

- Nouveauté : le menu des applis propose maintenant Joint (dilatation et joints) et Membrane (étanchéité).

## 3.6 — 6 novembre 2026

- Le menu des applis propose Joint (en préparation), pour le concepteur seulement : aucune Nouveauté à annoncer à l'équipe.

## 3.5 — 5 novembre 2026

- Nouveauté : on peut de nouveau inviter un collègue dans un projet (le message « Action refusée : vous n'êtes pas membre » apparaissait à tort).
- Un script SQL est à lancer une fois dans Supabase (`supabase/check-index.sql`, ou seulement l'extrait fourni dans le chat) : sans lui, l'invitation reste refusée.

## 3.4 — 4 novembre 2026

- Nouveauté : en mode sombre, les champs de date (calendrier et chiffres) ne restent plus noirs sur fond sombre : ils suivent le thème et se lisent bien.

## 3.3 — 4 novembre 2026

- Nouveauté : sans compte, la page de Check montre maintenant un carnet d'exemple (notes de chantier avec statuts, projets, échéances, réponses, recherche et filtres) pour voir ce que l'appli sait faire. On peut cliquer dedans, rien n'est enregistré.

## 3.2 — 4 novembre 2026

- Nouveauté : sans compte, Check propose un carnet d'essai : 5 notes perso gardées sur ce poste pour découvrir l'appli. En se connectant avec son compte Index, ces notes sont proposées à l'import dans le vrai carnet (notes illimitées, projets partagés, tous les postes).

## 3.1 — 4 novembre 2026

- Nouveauté : la connexion de Check est maintenant la même que celle d'Index, Masse, Format et Strate : se connecter dans l'une suffit pour toutes. Une seule reconnexion est nécessaire dans Check après cette mise à jour.

## 3.0 — 3 novembre 2026

- Nouveauté : une note réglée peut maintenant avoir une « Réponse » (facultative), visible par toute l'équipe du projet, pour garder la solution d'une question.
- Au passage d'une note à « Réglé », une notification propose « Ajouter une réponse » ; le champ est aussi dans « Modifier la note ». Notes perso comprises (elles restent privées).
- La réponse s'affiche sous la note, la recherche la trouve, et le bouton « Avec réponse » ne garde que ces notes.
- Elle est incluse dans l'export PDF et dans la sauvegarde. 500 caractères au plus.
- Avant la mise en ligne : une ligne de SQL à lancer une fois dans Supabase (fichier `supabase/check-index.sql`).

## 2.9 — 1er novembre 2026

- Nouveauté : le menu des applis de Check propose maintenant « Accueil » en premier, comme dans les autres applis.

## 2.8 — 1er novembre 2026

- Nouveauté : les noms de projet et de collègue ne sont plus coupés dans la saisie d'une note, et la fenêtre « Projet et équipe » ne déborde plus.
- Fenêtre « Projet et équipe » : les champs, la liste de l'équipe et le bouton « Inviter » restent dans la fenêtre ; la confirmation de suppression passe à la ligne au lieu d'être coupée.
- Saisie d'une note : le projet et le destinataire prennent toute la largeur.

## 2.7 — 1er novembre 2026

- Nouveauté : sur téléphone, les notes s'affichent en colonne et les boutons sont plus faciles à toucher.
- Une note vide n'est plus ignorée en silence : un message l'indique.
- Les longues listes s'affichent par paquets de 50, avec « Afficher la suite ».
- Si la base est injoignable, un bouton « Réessayer » évite de recharger la page.
- Le PDF et ses polices ne se chargent qu'au premier export (démarrage plus léger).
- Une note est limitée à 4000 caractères, avec un compteur quand on approche.
- Petits textes gris un peu plus contrastés.

## 2.6 — 1er novembre 2026

- Nouveauté : le mode clair ou sombre que tu choisis dans une appli est repris dans toutes les autres.
- Le réglage clair / sombre est aussi enregistré dans une clé commune à toutes les applis (`outils-theme`, même site) ; la clé propre à l'appli est conservée.

## 2.5 — 31 octobre 2026

- Disparition de l'avertissement technique « React #418 » dans la console du navigateur : le contenu s'affiche une fois la page chargée, au lieu de se télescoper avec la page de départ générée au build. Aucun changement visible.

## 2.4 — 31 octobre 2026

- Toutes les applis sont maintenant sur GitHub Pages : le sélecteur d'applis pointe vers `https://outils-hn.github.io/<Appli>/` à la place des adresses Lovable. Les liens vers les fiches d'Index (`?fiche=`, `?q=`, création de compte) ouvrent `https://outils-hn.github.io/Index/`.

## 2.3 — 31 octobre 2026

- Pied de page : ajout du lien « Suggestion / bug », qui ouvre l'Accueil (`https://outils-hn.github.io/`) avec le nom de l'appli, sa version et la page en cours, comme dans les autres applis.

## 2.2 — 31 octobre 2026

- Publication sur GitHub Pages (`https://outils-hn.github.io/Check/`) : l'appli est construite en mode SPA statique, sans serveur.
- Nouveau workflow « Pages » : construction avec le sous-dossier `/Check/`, page de repli `404.html`, déploiement automatique à chaque fusion sur `main`.
- Mise à jour de la configuration de build (`@lovable.dev/vite-tanstack-config` 2.25.3, TanStack Start 1.168.60, Router 1.170.41) pour produire la version statique, comme les autres applis. `bun.lock` sera actualisé au prochain `bun install`.
- Pages « Page introuvable » et « Cette page ne s'est pas chargée » en français.
- Les données gardées dans le navigateur à l'ancienne adresse (`lovable.app`) ne suivent pas automatiquement : faire une « Sauvegarde » avant de changer d'adresse, puis la restaurer à la nouvelle.

## 2.1 — 31 octobre 2026

- Adresses mises à jour après le renommage du compte GitHub en `outils-hn` : le sélecteur d'applis pointe vers Strate (`https://outils-hn.github.io/Strate/`) et Trame (`https://outils-hn.github.io/Trame/`), publiées sur GitHub Pages.
