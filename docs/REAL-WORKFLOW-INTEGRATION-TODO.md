# Feuille de route — intégration du Workflow réel (V2)

Ce document liste ce qui doit être fait pour remplacer le Mock Workflow Adapter par une
connexion à un Worker réel exécutant Claude Builder + Codex Reviewer, **sans** rien de tout
cela n'ayant été implémenté ni activé en V1 (cf. `docs/SECURITY-REVIEW.md`).

## 1. Contrats déjà en place (réutilisables tels quels)

- `packages/contracts` : schémas Zod des états de workflow, types d'événements, payloads
  d'API — conçus pour être agnostiques du Mock vs réel.
- `packages/database` schéma : tables `workers`, `worker_heartbeats`, `jobs`, `artifacts`,
  `approvals` déjà présentes et prêtes à recevoir des données réelles.
- `packages/workflow-engine` : machine à états pure (21 états, transitions, limites de
  cycle, pause/resume) — indépendante de l'adapter, ne nécessite aucune modification.

## 2. Ce qu'il reste à construire côté Worker (`apps/worker`)

1. **Boucle de connexion sortante** (register → heartbeat → claim → events/artifacts →
   complete/fail), actuellement documentée mais non implémentée
   (`apps/worker/src/index.ts` reste un squelette qui logge et s'arrête).
2. **Authentification du Worker** : génération et vérification de jeton haché
   (`workers.tokenHash`), jamais stocké ni journalisé en clair.
3. **Exécuteurs réels** (`apps/worker/src/executors/`) : appels effectifs à l'API Claude
   (Builder) et à l'API/outil Codex (Reviewer), avec allowlist stricte des actions
   (`security/allowlist.ts`) — pas d'exécution de commande arbitraire.
4. **Remontée d'événements** vers `apps/web` via l'API existante (`appendEvent`,
   `eventsAfter`) en respectant le curseur monotone `seq`.
5. **Gestion des checkpoints** : persister un état reprenable à chaque transition majeure
   (`checkpoints` table) pour permettre pause/reprise réelles, pas seulement simulées.

## 3. Ce qu'il reste à construire côté `apps/web`

1. **Sélecteur d'adapter** : un point de configuration explicite (variable d'environnement
   ou paramètre projet) pour choisir Mock vs Worker réel, avec le Mock comme valeur par
   défaut tant que le réel n'est pas validé.
2. **Endpoint de registration Worker** : route API pour que le Worker s'enregistre et
   obtienne son jeton (à créer, aujourd'hui inexistante).
3. **Endpoint de claim de job** : le Worker doit pouvoir réclamer un job en attente
   (`jobs.status = 'queued'`) de façon atomique (éviter double-claim).
4. **Vérification des artefacts** : validation de `sha256` avant d'accepter un artefact
   remonté par le Worker.
5. **Timeout / reprise sur Worker perdu** : détecter l'absence de heartbeat et repasser le
   job en file d'attente plutôt que de bloquer indéfiniment.

## 4. Sécurité — prérequis avant activation

- Remplacer l'authentification mock (`requireOwner`) par une authentification réelle
  (cf. `docs/SECURITY-REVIEW.md`) — **obligatoire avant toute exposition réseau**.
- Ajouter un rate limiting sur les routes exposées au Worker.
- Auditer que l'allowlist d'actions du Worker ne peut pas être contournée par un payload
  provenant d'un fichier uploadé ou d'un message utilisateur (aucune instruction dans le
  contenu ne doit jamais devenir une commande exécutée).

## 5. Ordre de bascule recommandé

1. Valider intégralement le Mock Adapter en environnement de test (fait — V1).
2. Implémenter la boucle Worker en mode « dry-run » (n'exécute rien, journalise
   seulement) pour valider le protocole register/heartbeat/claim.
3. Activer un seul exécuteur réel (Builder) sur un projet de test isolé.
4. Activer Codex Reviewer une fois Builder validé.
5. Ouvrir progressivement à plusieurs projets, avec monitoring des heartbeats et alerte
   sur Worker perdu.

Tant que les étapes 2 à 5 ne sont pas complétées, l'application doit rester sur le Mock
Workflow Adapter, conformément à la contrainte explicite du cahier des charges.
