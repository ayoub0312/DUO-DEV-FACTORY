# Cahier des charges — DUO DEV FACTORY WEB

> Centre de commande Claude Builder + Codex Reviewer — Développement natif sous Windows.
> Source de référence importée depuis le document Word fourni. Ce fichier est la spécification
> officielle lue en Phase A par tous les agents.

DUO DEV FACTORY WEB

Centre de commande Claude Builder + Codex Reviewer

Cahier des charges détaillé — Développement natif sous Windows

Référence d’ambiance : assistant de développement moderne. L’interface finale doit rester originale.

Résumé exécutif

Objectif : construire une application web premium qui permet de déposer un besoin et des fichiers, de suivre un workflow Claude + Codex, de consulter les tests et les reviews, puis de connecter un Worker réel par API.

Architecture fonctionnelle de référence du workflow.

DUO DEV FACTORY WEB est une application web professionnelle de type assistant de développement, inspirée par la qualité d’usage de Claude, ChatGPT et des outils modernes de programmation, sans reproduire leur identité visuelle ni leur interface à l’identique.

L’application doit permettre à un utilisateur non technique de :

- créer un projet logiciel
- écrire son besoin dans un chat
- déposer un cahier des charges
- importer des PDF, DOCX, fichiers Markdown, images, logos, maquettes et archives
- visualiser l’extraction et le classement de ces fichiers
- démarrer un workflow Claude Builder + Codex Reviewer
- suivre les agents, étapes, lots, tests, corrections et verdicts
- lire les rapports produits
- visualiser les fichiers créés et les différences Git
- prévisualiser l’application développée
- mettre en pause, reprendre ou arrêter une exécution

préparer une livraison après validation humaine.

L’application Next.js sera développée nativement dans Windows. Le workflow existant restera séparé. La connexion réelle sera réalisée plus tard par une API sécurisée et un Worker local utilisant une connexion sortante vers la plateforme.

## 2. Vision du produit

### 2.1. Proposition de valeur

Transformer un workflow multi-agent complexe en une expérience simple :

- l’utilisateur crée un projet
- il décrit ce qu’il veut développer
- il ajoute ses documents et références
- il clique sur **Démarrer**
- il regarde Claude et Codex travailler

il consulte le résultat final.

Aucun copier-coller manuel entre Claude et Codex ne doit être nécessaire dans la version connectée.

### 2.2. Positionnement

Le produit doit se positionner comme :

- un centre de commande de développement assisté par IA
- un outil personnel ou professionnel
- une interface premium, rassurante et productive
- une couche de contrôle au-dessus des agents

une application qui rend visibles les décisions, fichiers, tests et risques.

### 2.3. Principes fondamentaux

**Claude construit.**

**Codex contrôle en lecture seule.**

**L’orchestrateur organise.**

**Les tests vérifient.**

**L’utilisateur garde le contrôle de la production.**

**Les secrets ne sont jamais affichés aux agents.**

**Une étape ne passe pas à la suivante sans validation.**

## 3. Périmètre de la version 1

### 3.1. Inclus

La V1 doit inclure :

- authentification propriétaire
- tableau de bord
- création et gestion de projets
- chat par projet
- upload multi-fichiers
- extraction de contenu
- gestion des références visuelles
- aperçu des fichiers
- Mock Workflow Adapter complet
- machine à états du workflow
- lots de travail
- événements en direct ou quasi temps réel
- affichage des agents actifs
- rapports
- résultats des tests
- vue des modifications
- checkpoints
- reprise
- prévisualisation simulée ou réelle selon disponibilité
- API documentée pour connecter un Worker
- préparation au déploiement Vercel
- interface claire et sombre
- responsive complet
- accessibilité

tests essentiels.

### 3.2. Hors périmètre V1

- déploiement automatique d’un projet client
- migration distante automatique
- push Git automatique
- facturation
- multi-tenant complexe
- place de marché d’agents
- exécution de code non isolée sur Vercel
- accès direct de Vercel au poste Windows
- application mobile native
- orchestration distribuée multi-serveurs
- paiement

gestion d’équipes avancée.

## 4. Utilisateurs et rôles

### 4.1. Propriétaire

Dans la V1, le produit est principalement mono-utilisateur.

Le propriétaire peut :

- créer, modifier, archiver et supprimer un projet
- déposer des fichiers
- envoyer des messages
- démarrer, mettre en pause, reprendre ou arrêter un workflow
- consulter tous les rapports
- gérer la configuration du Worker
- gérer les références de secrets

préparer une livraison.

### 4.2. Rôle futur : membre

Préparer le modèle pour ajouter plus tard :

- membre en lecture
- développeur
- reviewer

administrateur.

Aucune complexité multi-tenant inutile ne doit être ajoutée dans la V1.

## 5. Architecture générale

### 5.1. Architecture cible

Navigateur Windows

|

v

Application Next.js

Interface

API

Authentification

Projets

Chat

Fichiers

Orchestrateur

Rapports

|

+--> Turso/libSQL + Drizzle

|

+--> Vercel Blob

|

+--> Worker Adapter

|

v

Worker local Windows/WSL

- Claude Code

- Codex

- Git

- Tests

- Preview

- Workspaces

### 5.2. Séparation obligatoire

Application Web

Responsable de :

- l’expérience utilisateur
- la persistance du centre de commande
- la file de tâches
- les projets
- les messages
- les fichiers
- l’état du workflow
- l’affichage des événements

les décisions et validations.

Worker local

Responsable de :

- l’accès aux dossiers locaux
- l’exécution de Claude Code
- l’exécution de Codex
- les commandes Git
- les installations
- les builds
- les tests
- les prévisualisations

la remontée d’événements.

Règle réseau de production

L’application Vercel ne doit jamais appeler directement `localhost` sur l’ordinateur de l’utilisateur.

Le Worker doit :

- s’enregistrer auprès de la plateforme
- envoyer un heartbeat
- récupérer les tâches par connexion sortante
- publier les événements et résultats

ne jamais exposer un port public non protégé.

## 6. Architecture du dépôt

Utiliser un monorepo Windows compatible avec npm workspaces.

duo-dev-factory-web/

├── apps/

│   ├── web/

│   │   ├── src/app/

│   │   ├── src/components/

│   │   ├── src/features/

│   │   └── public/

│   └── worker/

│       ├── src/adapters/

│       ├── src/executors/

│       ├── src/security/

│       └── src/index.ts

├── packages/

│   ├── contracts/

│   ├── database/

│   ├── workflow-engine/

│   ├── ui/

│   └── config/

├── docs/

├── tests/

├── package.json

├── CLAUDE.md

├── AGENTS.md

└── .env.example

### 6.1. Compatibilité Windows

- scripts npm compatibles PowerShell
- aucun script Bash obligatoire
- chemins manipulés avec les API Node.js
- gestion correcte de `\` et `/`
- aucun chemin WSL codé en dur
- aucune dépendance à Docker pour lancer la V1

développement possible dans `C:\Users\<user>\Projects\duo-dev-factory-web`.

## 7. Stack technique

### 7.1. Application Web

- Next.js App Router
- React
- TypeScript strict
- Tailwind CSS
- primitives accessibles basées sur Radix ou équivalent
- composants maison pour préserver une identité originale
- Server Components par défaut
- Client Components seulement pour les interactions
- Route Handlers pour l’API

Server Actions uniquement lorsque leur utilisation est claire et sécurisée.

### 7.2. Données

- Turso/libSQL
- Drizzle ORM
- migrations locales versionnées
- transactions
- index
- contraintes
- repository layer

validation Zod.

### 7.3. Fichiers

- Vercel Blob en production
- stockage local abstrait en développement
- métadonnées en base
- empreinte SHA-256
- manifeste des fichiers

séparation original, extraction, aperçu et artefact.

### 7.4. Authentification

- fournisseur d’authentification mature compatible Next.js
- compte propriétaire
- session sécurisée
- cookies HttpOnly et Secure en production
- mode développement simulé autorisé uniquement localement

l’application doit refuser un mode mock en production.

### 7.5. Tests

- Vitest
- Testing Library
- Playwright
- axe-core ou équivalent
- tests des contrats API
- tests de la machine à états

tests de sécurité essentiels.

## 8. Direction artistique

### 8.1. Référence

S’inspirer de la qualité de finition des assistants professionnels modernes :

- interface claire
- grands espaces
- hiérarchie discrète
- animations sobres
- navigation évidente
- forte lisibilité

sensation de produit premium.

Ne pas copier :

- les logos
- les noms
- la palette exacte
- les icônes propriétaires
- la mise en page pixel par pixel

les textes de Claude ou ChatGPT.

### 8.2. Identité proposée

Nom : DUO DEV FACTORY

Ton visuel :

- professionnel
- minimaliste
- précis
- chaleureux
- technologique

rassurant.

Palette claire indicative :

- fond principal : ivoire très clair
- surfaces : blanc chaud
- texte principal : graphite
- texte secondaire : gris ardoise
- accent Claude Builder : ambre ou corail
- accent Codex Reviewer : bleu profond
- succès : vert
- avertissement : orange

erreur : rouge contrôlé.

Palette sombre :

- fond : noir bleuté
- surfaces : graphite
- bordures : gris anthracite
- texte : blanc cassé

accents conservés avec contraste accessible.

### 8.3. Typographie

- sans-serif moderne pour l’interface
- serif éditoriale très limitée pour les titres d’accueil facultatifs
- corps 15 à 16 px
- champs de formulaire 16 px minimum
- contraste AA au minimum

lignes de texte confortables.

### 8.4. Motion

- transitions 120 à 220 ms
- animations d’état légères
- respect de `prefers-reduced-motion`

aucun effet décoratif qui ralentit la productivité.

## 9. Mise en page principale

### 9.1. Desktop

┌───────────────┬──────────────────────────────┬─────────────────────┐

│ Sidebar       │ Zone principale             │ Panneau contextuel  │

│ Projets       │ Chat / Fichiers / Rapports  │ Workflow / Agents   │

│ Navigation    │                              │ Tests / Étapes      │

└───────────────┴──────────────────────────────┴─────────────────────┘

Sidebar gauche

- logo
- bouton Nouveau projet
- navigation
- liste des projets récents
- recherche
- paramètres
- profil

réduction de la sidebar.

Zone principale

- titre du projet
- onglets
- conversation
- cartes de fichiers
- événements
- composer
- pièces jointes

raccourcis.

Panneau droit

- étape actuelle
- progression
- agent actif
- lots
- verdict
- actions Pause, Reprendre, Arrêter

possibilité de masquer le panneau.

### 9.2. Mobile

- sidebar en drawer
- panneau workflow en bottom sheet ou drawer
- composer toujours accessible
- fichiers sous forme de cartes
- tables remplacées par listes

zones tactiles de 44 px minimum.

## 10. Écrans obligatoires

### 10.1. Accueil

- message de bienvenue
- bouton Nouveau projet
- projets récents
- projets actifs
- projets bloqués
- activité récente

raccourcis.

### 10.2. Liste des projets

- recherche
- filtres
- statut
- technologie
- date
- grille et liste
- archivage
- duplication

suppression confirmée.

### 10.3. Création de projet

Assistant multi-étapes :

- identité
- type de projet
- description
- technologies
- fichiers
- niveau d’autonomie
- résumé

création.

### 10.4. Espace projet

Onglets :

- Chat
- Workflow
- Fichiers
- Lots
- Reviews
- Tests
- Modifications
- Prévisualisation
- Rapports

Paramètres.

### 10.5. Chat

- messages utilisateur
- messages Claude
- rapports Codex
- événements système
- streaming visuel
- pièces jointes
- réponses liées à une étape
- édition d’un message utilisateur non encore traité
- recherche
- copie

export.

### 10.6. Fichiers

- glisser-déposer
- progression
- état
- catégorie
- aperçu
- extraction
- suppression
- renommage logique
- association à un message

filtre par type.

### 10.7. Workflow

- frise des étapes
- statut
- durée
- agents
- décisions
- checkpoints
- erreurs

relance contrôlée.

### 10.8. Lots de travail

Chaque lot affiche :

- objectif
- dépendances
- agent principal
- fichiers concernés
- critères d’acceptation
- tests
- review

verdict.

### 10.9. Reviews

Sections :

- blockers
- corrections obligatoires
- sécurité
- régressions
- tests manquants
- design
- innovations
- polish

verdict.

### 10.10. Tests

- typecheck
- lint
- build
- unitaires
- intégration
- E2E
- accessibilité
- durée
- logs

relance.

### 10.11. Modifications

- Git status
- fichiers créés
- fichiers modifiés
- fichiers supprimés
- diff
- agent
- étape

lot.

### 10.12. Prévisualisation

- démarrer/arrêter
- mobile 320/375
- tablette 768
- desktop 1440
- actualiser
- ouvrir dans un onglet
- logs
- URL locale

état du serveur.

### 10.13. Rapports

- vision
- architecture
- design system
- schéma
- sécurité
- QA
- handoffs
- reviews
- résultat final

export Markdown/PDF.

### 10.14. Paramètres

- profil
- apparence
- Worker
- stockage
- auth
- sécurité
- limites
- intégrations

nettoyage.

## 11. Upload et extraction

### 11.1. Formats acceptés

Documents :

- PDF
- DOCX
- TXT
- Markdown
- JSON
- YAML

CSV.

Images :

- PNG
- JPG
- JPEG
- WEBP

SVG.

Archives :

ZIP.

### 11.2. Pipeline

- vérification du type
- vérification de la taille
- empreinte
- stockage original
- extraction
- aperçu
- catégorisation
- manifeste

statut READY ou ERROR.

### 11.3. Sécurité ZIP

- blocage du zip slip
- blocage des chemins absolus
- blocage des liens symboliques dangereux
- limite du nombre de fichiers
- limite de taille décompressée
- refus des exécutables

quarantaine en cas d’anomalie.

### 11.4. Catégories

- requirements
- business_rules
- brand_asset
- design_reference
- source_archive
- technical_document

other.

## 12. Modèle de workflow

### 12.1. États principaux

DRAFT

INGESTING

READY

ANALYZING_REQUIREMENTS

PLANNING

REVIEWING_PLAN

FIXING_PLAN

PLAN_APPROVED

PREPARING_WORK_PACKAGES

BUILDING_PACKAGE

TESTING_PACKAGE

REVIEWING_PACKAGE

FIXING_PACKAGE

INTEGRATING

FINAL_TESTING

FINAL_REVIEW

APPROVED

BLOCKED

PAUSED

CANCELLED

FAILED

### 12.2. Règles

- une seule transition valide à la fois
- transition enregistrée
- acteur identifié
- horodatage
- erreur conservée
- reprise depuis checkpoint
- limite de cycles
- Codex ne modifie pas pendant une review

aucun passage au lot suivant sans approbation.

### 12.3. Mock Workflow Adapter

La première implémentation doit simuler :

- démarrage
- agents
- événements
- rapports
- reviews
- tests
- corrections
- verdict

pause et reprise.

Le mock doit utiliser les mêmes contrats que le futur Worker réel.

## 13. API entre l’application et le Worker

### 13.1. Principe

Le Worker initie la connexion vers la plateforme.

### 13.2. Endpoints minimum

Worker

`POST /api/workers/register`

`POST /api/workers/heartbeat`

`POST /api/workers/claim`

`POST /api/workers/jobs/:id/events`

`POST /api/workers/jobs/:id/artifacts`

`POST /api/workers/jobs/:id/complete`

`POST /api/workers/jobs/:id/fail`

Projets

`GET /api/projects`

`POST /api/projects`

`GET /api/projects/:id`

`PATCH /api/projects/:id`

`DELETE /api/projects/:id`

Fichiers

`POST /api/projects/:id/files`

`GET /api/projects/:id/files`

`GET /api/files/:id`

`DELETE /api/files/:id`

Chat

`GET /api/projects/:id/messages`

`POST /api/projects/:id/messages`

Workflow

`POST /api/projects/:id/workflow/start`

`POST /api/workflows/:id/pause`

`POST /api/workflows/:id/resume`

`POST /api/workflows/:id/cancel`

`GET /api/workflows/:id`

`GET /api/workflows/:id/events`

### 13.3. Contrats

Tous les contrats doivent être définis dans `packages/contracts` avec Zod.

Chaque réponse d’erreur :

{

"error": {

"code": "WORKFLOW_NOT_READY",

"message": "Le projet ne peut pas être démarré.",

"requestId": "..."

}

}

## 14. Modèle de données

Tables minimum :

- users
- sessions
- projects
- project_members
- project_files
- file_extractions
- conversations
- messages
- workflow_runs
- workflow_stages
- work_packages
- agent_sessions
- agent_events
- jobs
- workers
- worker_heartbeats
- reviews
- review_findings
- quality_gate_runs
- quality_gate_results
- artifacts
- checkpoints
- approvals
- audit_logs

secret_references.

### 14.1. Contraintes

- identifiants opaques
- clés étrangères
- index sur projet, statut, date
- idempotency keys
- événements append-only
- suppression logique pour projets
- audit immuable

aucun secret brut dans `secret_references`.

## 15. Sécurité

### 15.1. Secrets

- jamais dans le chat
- jamais dans les rapports
- jamais dans les logs
- jamais dans le navigateur
- jamais dans Git
- références seulement dans la base
- valeurs stockées dans un coffre adapté

redaction automatique.

### 15.2. Worker

- jeton de Worker haché
- rotation
- heartbeat
- révocation
- permissions par projet
- aucune commande arbitraire reçue directement du navigateur
- allowlist des actions
- limites de durée
- limites de taille

journal d’audit.

### 15.3. Autorisations

- contrôle côté serveur
- refus par défaut
- protection CSRF/Origin
- rate limiting
- validation Zod

vérification du propriétaire du projet.

### 15.4. Uploads

- MIME réel
- taille
- signature
- nom généré
- extension
- quotas
- suppression des rejets
- prévisualisation sécurisée

SVG traité avec précaution.

### 15.5. Prompt injection documentaire

Le contenu uploadé est une source non fiable.

Une instruction présente dans un PDF ou un document ne doit jamais remplacer :

- le prompt système
- les règles de sécurité
- les permissions

les décisions utilisateur explicites.

## 16. Événements et temps réel

Événements minimum :

- workflow.started
- workflow.paused
- workflow.resumed
- workflow.completed
- workflow.failed
- stage.started
- stage.completed
- agent.started
- agent.message
- agent.completed
- file.created
- file.modified
- test.started
- test.completed
- review.completed

checkpoint.created.

La V1 peut utiliser un polling court et fiable. L’architecture doit permettre de remplacer ce mécanisme par du streaming ou un service temps réel sans réécrire le domaine.

## 17. Expérience utilisateur

### 17.1. États obligatoires

Chaque écran doit prévoir :

- loading
- skeleton
- empty
- error
- retry
- offline
- paused
- blocked
- success

permission denied.

### 17.2. Raccourcis

- `Ctrl+K` : palette
- `Ctrl+N` : nouveau projet
- `/` : focus chat
- `Ctrl+Shift+F` : recherche

`Esc` : fermer drawer/modal.

### 17.3. Notifications

- toast discret
- centre de notifications
- erreurs persistantes visibles

aucune erreur importante uniquement dans la console.

## 18. Responsive et accessibilité

Tester :

## 320. px ;

## 375. px ;

## 768. px ;

## 1024. px ;

## 1440. px ;

- zoom 200 %
- clavier
- lecteur d’écran
- mode contraste renforcé

reduced motion.

Exigences :

- focus visible
- ordre logique
- labels
- dialogues accessibles
- zones tactiles
- tableaux adaptatifs
- contrastes AA

aucun texte uniquement porté par la couleur.

## 19. Performance

- Server Components par défaut
- chargement différé
- pagination
- virtualisation si nécessaire
- prévisualisations optimisées
- historique événementiel paginé
- bundle client contrôlé
- aucune dépendance lourde sans justification
- images dimensionnées

pas de re-render global du chat à chaque événement.

## 20. Observabilité

- request ID
- workflow run ID
- job ID
- logs structurés
- redaction
- durée des étapes
- statut du Worker
- dernière activité
- erreurs par catégorie

page diagnostics accessible au propriétaire.

## 21. Tests

### 21.1. Unitaires

- machine à états
- transitions
- permissions
- validateurs
- normalisation des chemins Windows
- manifestes
- classification
- redaction

idempotence.

### 21.2. Intégration

- création projet
- upload
- extraction
- envoi message
- lancement workflow
- pause/reprise
- Worker register/claim
- publication événements
- review

verdict.

### 21.3. E2E

- connexion
- nouveau projet
- dépôt cahier des charges
- chat
- démarrage du mock
- suivi
- pause/reprise
- consultation review
- résultat final

mobile.

### 21.4. Sécurité

- accès croisé à un projet
- token Worker invalide
- replay
- archive malveillante
- path traversal
- SVG dangereux
- fuite de secret
- prompt injection dans document

production avec auth mock interdite.

## 22. Déploiement

### 22.1. Développement

- Windows
- Node.js Windows
- npm
- VS Code Windows
- Claude Code Windows
- navigateur Windows

projet stocké dans le système de fichiers Windows.

### 22.2. Production

Vercel

Déployer :

- l’interface Next.js
- les API de contrôle
- les pages

les webhooks éventuels.

Services externes

- Turso pour les données
- Vercel Blob pour les fichiers
- fournisseur d’authentification

fournisseur e-mail facultatif.

Worker

- installé localement
- exécution persistante
- connexion sortante
- non déployé dans une fonction serverless courte

statut visible dans l’application.

## 23. Lots de développement

WP-01 — Fondations

- monorepo
- design tokens
- layout
- navigation
- thème
- qualité

CI locale.

WP-02 — Authentification et données

- auth
- Drizzle
- schéma
- sessions
- repository

seed démo.

WP-03 — Projets

- liste
- création
- détail
- archivage

paramètres.

WP-04 — Fichiers

- upload
- stockage
- extraction
- preview
- manifeste

sécurité.

WP-05 — Chat

- messages
- composer
- attachments
- timeline

événements.

WP-06 — Workflow Engine

- états
- transitions
- limites
- checkpoints

Mock Adapter.

WP-07 — Lots et Reviews

- work packages
- findings
- verdicts
- résolutions

filtres.

WP-08 — Tests, Modifications, Rapports

- quality gates
- Git diff mock/réel
- rapports

exports.

WP-09 — Worker API

- contrats
- register
- heartbeat
- claim
- events
- artifacts

sécurité.

WP-10 — Preview et finition

- preview
- responsive
- accessibilité
- performance
- E2E
- documentation

préparation Vercel.

## 24. Critères d’acceptation

La V1 est acceptable lorsque :

- l’application fonctionne sous Windows
- le build passe
- TypeScript passe
- lint passe
- les tests essentiels passent
- l’interface est professionnelle
- clair/sombre fonctionne
- mobile fonctionne
- un projet peut être créé
- des fichiers peuvent être déposés
- l’extraction et les états sont visibles
- le chat fonctionne
- le Mock Workflow Adapter déroule un cycle complet
- les étapes, agents, reviews et tests sont visibles
- pause/reprise fonctionne
- le résultat final est visible
- les contrats Worker sont documentés
- aucun secret n’est exposé
- le projet est prêt pour Vercel

aucune dépendance WSL n’est requise pour lancer l’interface.

## 25. Livrables

- code complet
- monorepo
- application Next.js
- Worker skeleton
- Mock Workflow Adapter
- contrats API
- schéma Drizzle
- migrations locales
- seed de démonstration
- tests
- README
- documentation architecture
- documentation Worker
- guide Windows
- guide Vercel
- `.env.example` sans secret
- rapport de sécurité

rapport QA.

## 26. Interdictions

Claude Code ne doit pas :

- utiliser le workflow DUO existant pour développer cette application
- développer l’application dans WSL
- lire `.env.local`
- afficher un secret
- pousser le dépôt
- déployer automatiquement
- appliquer une migration de production
- exposer le poste Windows sur Internet
- copier l’interface Claude ou ChatGPT pixel par pixel
- ignorer les tests

créer des scripts Bash obligatoires.

## 27. Résultat attendu

Un centre de commande web premium dans lequel l’utilisateur peut :

- créer un projet
- écrire son besoin
- déposer ses fichiers
- lancer un workflow simulé
- suivre chaque étape
- lire les reviews
- consulter les tests
- voir les modifications
- reprendre après interruption
- connecter ensuite un Worker réel par API

déployer l’interface sur Vercel.

Le développement doit privilégier la qualité, la maintenabilité et la sécurité plutôt que la quantité de fonctionnalités.

Annexe — Décision d’architecture

Décision importante : la V1 doit être pleinement utilisable avec un Mock Workflow Adapter avant la connexion au vrai workflow.
