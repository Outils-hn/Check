# Journal des versions — Check

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 3.32 — 11 novembre 2026

- Nouveauté : « Atelier / Montage » devient « Questions Tâches » : le bouton PDF sort la feuille à emporter, chaque tâche se replie et se supprime avec ses questions une fois réglée, et ces questions ne s'affichent plus dans la liste des notes.

## 3.31 — 11 novembre 2026

- Nouveauté : « Atelier / Montage » : notez vos questions pour l'atelier ou les monteurs, rangées par tâche dans un projet. Un bouton imprime la feuille (cases à cocher et lignes pour écrire), puis vous saisissez les réponses à votre retour ; elles restent visibles pour l'équipe.

## 3.30 — 11 novembre 2026

- Nouveauté : l'appli est réservée aux comptes de l'équipe. Sans compte, on passe par l'Accueil pour se connecter, puis on revient directement ici.

## 3.29 — 10 novembre 2026

- Nouveauté : le logo en haut à gauche de l'appli est maintenant le même que sur l'Accueil (pastille de couleur et pictogramme).
- Nouveauté : en haut à droite, le nom s'affiche (Prénom NOM) à la place de l'adresse mail.
- Nouveauté : un fondu doux quand on passe d'une appli à l'autre ou qu'on revient à l'Accueil (sur les navigateurs récents).

## 3.28 — 10 novembre 2026

- Nouveauté : chaque appli a maintenant son logo comme icône d'onglet et d'écran d'accueil, le même que sur l'Accueil.

## 3.27 — 10 novembre 2026

- Nouveauté : un bouton « Rechercher » (Ctrl K) en haut à droite, comme sur l'Accueil, dans toutes les applis. Il remplace la ligne « Rechercher » du menu des applis.

## 3.26 — 10 novembre 2026

- Nouveauté : le menu des applis suit l'ordre d'usage : Check, Index, Access, puis Trame, Linear, Format, puis les autres.

## 3.25 — 10 novembre 2026

- Nouveauté : dans le menu des applis, la ligne « Rechercher » est alignée avec les autres.

## 3.24 — 10 novembre 2026

- Nouveauté : un lien avec ?note=… ouvre directement la note choisie (c'est ce que fait la recherche Ctrl+K de l'Accueil).

## 3.23 — 10 novembre 2026

- Nouveauté : Ctrl+K ouvre la recherche de l'Accueil (applis, chantiers, fiches Index, notes Check) dans un nouvel onglet ; le menu de l'appli propose aussi « Rechercher ».

## 3.22 — 10 novembre 2026

- Nouveauté : la liste des raccourcis ne mentionne plus que les touches Windows.

## 3.21 — 10 novembre 2026

- Nouveauté : la liste des raccourcis clavier est dans le pied de page (« Raccourcis ») ou en tapant « ? ».

## 3.20 — 10 novembre 2026

- Nouveauté : la case « Rechercher une note » n'est plus coupée sur les écrans moyens.

## 3.19 — 10 novembre 2026

- Nouveauté : dans le PDF en couleurs, le bandeau du haut est plus fin et plus discret.

## 3.18 — 10 novembre 2026

- Nouveauté : le PDF est refait, sobre et classe : notes regroupées par projet, chiffres clés (en retard, urgentes…), retards bien visibles. Le petit bouton palette à côté de « PDF » imprime une version en couleurs, avec les images jointes.

## 3.17 — 10 novembre 2026

- Nouveauté : dans la fenêtre « Modifier la note », « Voir l'historique des changements » montre qui a changé quoi et quand (statut, échéance, texte, personne, projet, réponse ; script SQL « check-historique.sql » à lancer une fois).

## 3.16 — 10 novembre 2026

- Nouveauté : Check peut s'installer comme une appli sur le téléphone (« Ajouter à l'écran d'accueil ») et s'ouvre aussi sans réseau : on retrouve ses notes en lecture, les modifications demandent la connexion.

## 3.15 — 10 novembre 2026

- Nouveauté : on peut joindre des photos ou des captures d'écran à une note (3 au plus, compressées automatiquement ; script SQL « check-images.sql » à lancer une fois).

## 3.14 — 10 novembre 2026

- Nouveauté : nouvelle page « À retenir » : les retours de l'atelier et bonnes pratiques, visibles par tout le bureau, avec recherche (script SQL « check-retenir.sql » à lancer une fois).

## 3.13 — 10 novembre 2026

- Nouveauté : Check accepte un texte venu d'une autre appli (bouton « Noter dans Check ») : la saisie s'ouvre avec le texte prêt à valider.

## 3.12 — 9 novembre 2026

- Nouveauté : nouvel onglet « Aujourd'hui » (notes en retard, du jour ou confiées à vous), le nombre s'affiche aussi dans l'onglet du navigateur ; on peut taper #chantier dans une note pour la ranger dans ce projet, et Check retient le dernier projet choisi.

## 3.11 — 9 novembre 2026

- Nouveauté : au téléphone, la liste des notes s'affiche en premier (un bouton « Nouvelle note » ouvre le formulaire), et sur ordinateur la barre de recherche tient sur une seule ligne.

## 3.10 — 9 novembre 2026

- Nouveauté : au téléphone, les liens du pied de page (« Conçu par », « Sauvegarde », « Suggestion / bug ») se touchent plus facilement.

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
