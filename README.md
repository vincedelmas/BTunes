# Sillage

Votre collection musicale locale dans une application Electron. Première version de travail, conçue pour Linux / CachyOS. Nom et direction graphique provisoires : fond forêt sombre, typographie éditoriale et accent cuivre.

## Démarrer

Prérequis : Bun et Node.js récent (Node 22.18+ pour les tests TypeScript ; testé avec Node 26). Aucun serveur ni compte requis.

```sh
cd /home/vince/Desktop/code-projects/sillage
bun install
bun run dev
```

Cliquez sur **Ajouter un dossier** pour indexer votre collection. Aucun morceau de démonstration n'est ajouté. Les playlists se créent avec le bouton + dans la barre latérale. Choisissez un genre à la création pour une playlist automatique. Dans la vue Morceaux, le menu « + Playlist » ajoute un titre à une playlist classique. Cliquer sur un album lance sa lecture ; double-cliquer sur une ligne lance le morceau.

## Disponible

- Import récursif : MP3, FLAC, OGG, Opus, M4A, AAC, WAV, AIFF. Lecture des métadonnées et des pochettes intégrées. La lecture dépend des codecs fournis par Electron.
- Vues albums, artistes et morceaux. Recherche immédiate et filtres combinables artiste / genre. Tri artiste, album, titre, année ou écoutes.
- SQLite persistante : favoris, nombre d'écoutes, dernière écoute, dossiers, playlists classiques et playlists automatiques par genre.
- Lecture, pause, arrêt, précédent / suivant, aléatoire, répétition de la file, déplacement dans le morceau et volume.
- File de lecture consultable ; historique basé sur la dernière écoute. Une écoute est comptée après 30 secondes ou la moitié d'un titre court.
- Surveillance des ajouts, changements et suppressions de fichiers pendant que l'app tourne. Actualisation de l'interface toutes les 5 secondes.
- Réimport d'un dossier pour réconcilier les changements survenus hors de l'application. Les favoris et écoutes sont conservés.
- Doublons **possibles** par titre + artiste + durée arrondie. Aucun effacement automatique.

## Architecture

```text
src/
  main/
    index.ts                 Fenêtre Electron, protocole local et dispatch RPC
    repositories/library.ts  SQLite, schéma initial et requêtes paramétrées
    services/library.ts      Indexation et surveillance
  preload/index.ts           Pont isolé : une méthode rpc()
  shared/contracts.ts        Contrats TypeScript des méthodes RPC
  renderer/src/
    App.tsx                  Interface et lecteur
    components/ui/           Composants shadcn/ui
    style.css                Tokens et composition visuelle
tests/
  library.test.ts            Conservation des données et règles de playlists
  electron-smoke.cjs         React + RPC + import WAV + protocole audio
```

React ne reçoit ni accès à Node ni accès arbitraire au disque. Un seul canal Electron `rpc` transporte les méthodes typées, validées avec Zod côté principal. Le protocole `sillage://audio/<id>` résout uniquement les morceaux indexés ; les pochettes sont servies par leur empreinte SHA-256. Ce protocole suit le mécanisme [protocol.handle d'Electron](https://www.electronjs.org/docs/latest/api/protocol).

SQLite utilise le module natif de Node embarqué dans Electron, sans addon C++ tiers à recompiler. Bun gère les dépendances et les commandes ; le backend tourne dans le processus Node d'Electron.

Les données résident dans `app.getPath('userData')` (habituellement `~/.config/sillage`) : `library.sqlite` et `covers/`. Les fichiers musicaux sont seulement lus. Aucun tag ni nom de fichier n'est modifié.

## Vérification

```sh
bun run test            # tests des repositories
bun run build           # TypeScript + bundles principal, preload et React
bun run test:electron   # test Electron headless avec profil et WAV temporaires
bun run package         # dossier Linux exécutable dans dist/
```

Le test Electron rejette volontairement un identifiant négatif ; le message Zod dans sa sortie est attendu. L'empaquetage est configuré mais n'a pas encore été validé.

## Suite du produit

1. **Métadonnées** : éditeur individuel et par lots, aperçu des différences, sauvegarde réelle dans les formats pris en charge, pochettes intégrées. Écriture transactionnelle via fichier temporaire, sauvegarde et restauration en cas d'erreur. MusicBrainz : identification explicite et comparaison avant application. Renommage : aperçu, gestion des collisions et possibilité d'annuler.
2. **Playlists avancées** : règles combinées (genre, année, écoutes, favoris), export M3U relatif pour téléphone, édition / suppression / ordre manuel, historique d'événements complet et file persistante.
3. **Android** : manifeste PC / téléphone, comparaison des chemins relatifs, tailles et empreintes, liste des morceaux manquants puis plan de copie. D'abord dossier monté accessible en écriture ; ensuite MTP / USB et KDE Connect avec détection des outils CachyOS disponibles. Pas de suppression implicite côté téléphone.
4. **Bibliothèque à grande échelle** : recherche SQL indexée et pagination, virtualisation des listes, extraction des métadonnées dans un worker, progression et annulation d'import.
5. **Finitions Linux** : touches multimédias, MPRIS, icône, packaging AppImage et intégration bureau.

Limites actuelles : l'import s'exécute dans le processus principal, toute la bibliothèque est chargée dans React, les tris ne sont pas encore configurables en plusieurs clés. Les tags sont lus mais pas éditables. Pas encore de synchronisation Android, de récupération MusicBrainz ni d'export téléphone. La file et les réglages du lecteur ne survivent pas à une fermeture. Une suppression de dossier entier et les modifications faites app fermée demandent un réimport. Les liens symboliques ne sont pas parcourus lors de l'import initial.
