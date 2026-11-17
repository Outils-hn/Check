# Journal des versions — Check

Le numéro de version se met à jour dans `src/lib/version.ts` (pied de page et fenêtre « À propos » le lisent).

Chaque version qui change quelque chose de visible pour l'équipe a une puce « Nouveauté : … », en langage courant : c'est la seule phrase affichée sur la page « Nouveautés » de l'Accueil.

## 3.76 — 17 novembre 2026

- Nouveauté : dans « À retenir », chaque sujet (Soudure, Isolation…) a sa propre couleur, sur l'étiquette et le bord de la fiche, pour repérer d'un coup d'œil.

## 3.75 — 17 novembre 2026

- Nouveauté : dans « À retenir », l'auteur peut maintenant modifier sa fiche une fois publiée (crayon à côté de la corbeille), plus seulement la supprimer.

## 3.74 — 17 novembre 2026

- Nouveauté : l'onglet « Pour moi » disparaît, car « Aujourd'hui » contient déjà toutes les notes qui vous sont confiées. Pour les retrouver (réglées ou non), utilisez « Filtres » puis « Pour » : « Moi ».
- Nouveauté : l'onglet « Actives » s'appelle « Toutes » (toutes les notes sauf archivées et corbeille), pour que ce soit plus clair.

## 3.73 — 17 novembre 2026

- Correction : les notes urgentes clignotent vraiment toutes ensemble, y compris celle qu'on vient de marquer urgente (l'animation est calée sur l'horloge de la page).
- Correction : après un clic (statut, etc.), la date de création, la photo, l'archive et la corbeille se masquent dès que la souris quitte la note, sans qu'il faille cliquer ailleurs. Elles restent visibles au clavier.

## 3.72 — 17 novembre 2026

- Correction : « Ajouter une réponse » place maintenant le curseur directement dans le champ Réponse (à la fin du texte s'il y en a déjà un), et non au début du texte de la note.

## 3.71 — 17 novembre 2026

- Nouveauté : après l'ajout d'une note, le choix « Pour » reste en place (comme le projet), pour enchaîner plusieurs notes pour la même personne. Il se remet à « Personne » seulement si on change de projet.

## 3.70 — 17 novembre 2026

- Nouveauté : dans « Filtres », un choix « Pour » (un collègue inscrit ou sans compte) affiche toutes les notes qui lui sont confiées. Le PDF s'intitule alors « Notes pour Marc », prêt à lui remettre.

## 3.69 — 17 novembre 2026

- Nouveauté : les suggestions de noms (« Autre personne (sans compte) ») s'affichent dans une liste aux couleurs de l'appli, navigable au clavier, au lieu de la boîte grise du navigateur.

## 3.68 — 17 novembre 2026

- Nouveauté : dans le choix « Pour », « Moi » et « Personne » prennent une majuscule.

## 3.67 — 16 novembre 2026

- Nouveauté : l'option de « Pour » s'appelle « Autre personne (sans compte) », sans les points de suspension.

## 3.66 — 16 novembre 2026

- Nouveauté : dans « Pour », on peut choisir « Autre personne (sans compte)… » et taper le nom d'un collègue qui n'est pas inscrit (les noms déjà saisis sont proposés). La note affiche « Pour Marc », la recherche et le PDF le retrouvent. Nécessite d'exécuter une fois `supabase/check-pour-nom.sql`.

## 3.65 — 16 novembre 2026

- Correction : une note qu'on vient de marquer « urgent » clignote tout de suite en même temps que les autres notes urgentes, sans qu'il faille actualiser la page.

## 3.64 — 16 novembre 2026

- Nouveauté : la date de création d'une note (l'horloge) n'apparaît plus qu'au survol de la ligne sur ordinateur, pour alléger la liste. L'échéance et la date de règlement restent toujours visibles.

## 3.63 — 16 novembre 2026

- Nouveauté : dans « Filtres », un bouton « Réinitialiser les filtres et le tri » apparaît dès qu'un filtre ou un tri est actif (la pastille indique leur nombre), et l'option « Manuel » devient « Manuel (par défaut) ».
- Nouveauté : dans le PDF, les longues notes n'ont plus de grand vide en dessous, et le titre d'un projet ne reste plus seul en bas de page : il passe avec sa première note.

## 3.62 — 16 novembre 2026

- Nouveauté : dans le PDF en couleurs, plus d'espace au-dessus du titre de chaque projet, pour qu'il se rattache clairement aux notes qui le suivent.

## 3.61 — 16 novembre 2026

- Nouveauté : sur chaque note, la date de création est précédée d'une petite horloge (au lieu du calendrier) et s'explique au survol (« Créée le … »). Les titres des fenêtres (Raccourcis, À propos…) ont la même taille, les champs de saisie ont le même fond blanc que les listes déroulantes, le menu « Filtres » ne déborde plus de la page et une phrase des raccourcis ne laisse plus un mot seul sur sa ligne.

## 3.60 — 16 novembre 2026

- Nouveauté : petits alignements dans la colonne de gauche : « Photo ou capture » s'aligne sur les champs et les nombres de la liste des projets sont rangés dans la même colonne.

## 3.59 — 15 novembre 2026

- Nouveauté : dans le menu des applis, Maquette passe en dernier.

## 3.58 — 15 novembre 2026

- Nouveauté : la recherche cherche maintenant dans toutes les notes (archivées comprises) depuis « Actives », « Pour moi » et « Aujourd'hui », trouve aussi le nom de la personne à qui la note est confiée, et surligne les mots trouvés. Le PDF sobre indique la date de création de chaque note.

## 3.57 — 15 novembre 2026

- Nouveauté : le menu des applis propose maintenant Maquette (visionneuse de maquettes IFC).

## 3.56 — 14 novembre 2026

- Nouveauté : la barre au-dessus de la liste est plus légère. Statut, « Avec réponse » et tri sont rangés dans un bouton « Filtres » (un petit chiffre indique combien sont actifs) ; « PDF en couleurs » et « Nettoyer » passent dans le menu « ⋯ ».

## 3.55 — 14 novembre 2026

- Nouveauté : en bas de page, le lien « Conçu par… » devient « À propos » ; les noms sont dans la fenêtre qui s'ouvre. Les liens du pied de page ont partout la même présentation (soulignés au survol seulement).

## 3.54 — 13 novembre 2026

- Nouveauté : les barres de recherche n'ont plus de « … » à la fin du texte d'exemple.

## 3.53 — 12 novembre 2026

- Nouveauté : les PDF de « Questions Tâches » n'affichent plus « Check » en haut et en bas de page.

## 3.52 — 12 novembre 2026

- Nouveauté : dans « Questions Tâches », les boutons de droite sont alignés : « PDF » et « Répondre » ont la même largeur, et les icônes crayon et corbeille sont en colonne d'une ligne à l'autre.

## 3.51 — 12 novembre 2026

- Nouveauté : les filtres Tous / Atelier / Montage / Fournisseur de « Questions Tâches » ont le même liseré violet que les onglets quand ils sont actifs.

## 3.50 — 12 novembre 2026

- Nouveauté : dans « Questions Tâches », « Répondre » (et « Modifier la réponse ») ouvre une petite fenêtre avec seulement la question et une cellule « Réponse », au lieu de la fenêtre complète d'une note.

## 3.49 — 12 novembre 2026

- Nouveauté : dans « Questions Tâches », on peut modifier une question (texte, destinataire, fournisseur) avec le crayon, qu'elle soit en attente ou réglée.

## 3.48 — 12 novembre 2026

- Nouveauté : dans les PDF de questions, un espace régulier sépare chaque question de la suivante (la ligne de réponse ne touche plus l'étiquette de la question suivante).

## 3.47 — 12 novembre 2026

- Nouveauté : dans les PDF de questions, une seule ligne est laissée sous chaque question pour la réponse, ce qui fait tenir plus de questions par page.

## 3.46 — 12 novembre 2026

- Nouveauté : dans « Questions Tâches », on peut afficher plusieurs destinataires à la fois (atelier + montage, par exemple) : un clic, ou Ctrl + clic, ajoute ou retire un destinataire ; « Tous » remet tout.

## 3.45 — 12 novembre 2026

- Nouveauté : le PDF global s'intitule « Questions Tâches » ; le PDF d'une seule tâche annonce ses destinataires (« Questions atelier et montage », ou « atelier, montage et fournisseur » s'il contient des questions pour un fournisseur).

## 3.44 — 12 novembre 2026

- Nouveauté : retouches des PDF : « 1 réglée » et « 1 note » s'accordent au singulier, et le PDF d'une tâche s'intitule « Questions Tâches » (il peut contenir des questions pour un fournisseur).

## 3.43 — 12 novembre 2026

- Nouveauté : dans « Questions Tâches », on peut réorganiser les questions d'une tâche : glisser-déposer sur ordinateur, flèches monter / descendre partout. Les nouvelles questions arrivent en fin de liste et le PDF suit l'ordre choisi.

## 3.42 — 12 novembre 2026

- Nouveauté : le carnet d'essai sans compte est retiré ; sans compte, Check invite simplement à se connecter.

## 3.41 — 12 novembre 2026

- Nouveauté : sans compte, le bouton « Se connecter » n'apparaît plus en double ; il reste celui de la page.

## 3.40 — 12 novembre 2026

- Nouveauté : sur téléphone, la barre de recherche des notes prend toute la largeur et son texte n'est plus coupé.

## 3.39 — 12 novembre 2026

- Nouveauté : petites retouches de confort. « À demander à l'atelier » est plus court, la feuille « Questions Tâches » explique la case à cocher, les actions au survol restent visibles sur tablette, les filtres du téléphone tiennent mieux sur la ligne et le message d'une liste vide est plus clair.

## 3.38 — 12 novembre 2026

- Nouveauté : Check est plus confortable. Sur téléphone, « Questions Tâches » et « À retenir » tiennent sur une ligne, la date est plus courte et les actions rares d'une note sont dans un menu « ⋯ ». Sur ordinateur, archiver, photo et corbeille apparaissent au survol. Dans « Questions Tâches », la case sert à marquer une question comme « posée, j'attends la réponse », le formulaire est plus compact, et renommer ou supprimer une tâche est instantané.

## 3.37 — 11 novembre 2026

- Nouveauté : dans « Questions Tâches », le crayon d'une tâche permet de changer son numéro en plus de son nom ; toutes ses questions suivent.

## 3.36 — 11 novembre 2026

- Nouveauté : dans « Questions Tâches », chaque question a un destinataire : atelier, montage ou fournisseur (avec son nom). Un filtre n'affiche que l'un d'eux. Le PDF général garde les questions atelier et montage, celui d'une tâche reprend tout avec le destinataire.

## 3.35 — 11 novembre 2026

- Nouveauté : dans « Questions Tâches », on peut donner un nom à une tâche (à la création, ou avec le crayon à côté d'elle) ; il s'affiche à côté du numéro, sur le PDF, et la recherche le trouve.

## 3.34 — 11 novembre 2026

- Nouveauté : dans « Questions Tâches », une barre de recherche (touche /) retrouve une tâche, une question ou une réponse, et les tâches déjà utilisées du projet se choisissent d'un clic au lieu de la grande liste déroulante.

## 3.33 — 11 novembre 2026

- Nouveauté : dans « Questions Tâches », une question réglée peut être rouverte, sa réponse corrigée ou la question supprimée ; le PDF d'une tâche reprend aussi ses questions réglées avec leur réponse.

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
