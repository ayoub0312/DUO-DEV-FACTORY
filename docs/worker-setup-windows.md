# Worker local sous Windows — DUO DEV FACTORY WEB

> Le Worker n'exécute **rien de réel en V1** (squelette). Ce guide décrit l'installation
> et le modèle de connexion pour quand le Worker sera activé (après validation du Mock).

## Principe
Le Worker tourne **sur le poste Windows** de l'utilisateur, en processus persistant. Il
**initie** la connexion vers la plateforme (jamais l'inverse). Il exécutera plus tard
Claude Code, Codex (lecture seule), Git, installations, builds, tests et prévisualisations.

## Prérequis
- Windows 10/11, **Node.js 20+**, **npm**, Git.
- Aucune dépendance à WSL requise. Aucun port entrant ouvert sur Internet.

## Installation (dev)
```powershell
# Depuis la racine du monorepo
npm install
npm run start --workspace @duo/worker   # squelette : affiche l'allowlist et les limites
```

## Modèle de connexion (à activer en WP-09)
1. `register` → obtient un `workerId` + un jeton (transmis une seule fois). Le jeton est
   stocké **haché** côté plateforme.
2. `heartbeat` régulier (statut idle/busy/draining).
3. `claim` (idempotent) pour récupérer un job.
4. `jobs/:id/events` (append-only) et `jobs/:id/artifacts` pour publier l'avancement.
5. `jobs/:id/complete` ou `jobs/:id/fail`.

## Sécurité
- Jeton Worker **haché**, rotation, révocation, permissions par projet.
- **Allowlist** d'actions (voir `apps/worker/src/security/allowlist.ts`) : le navigateur
  ne transmet jamais de commande shell arbitraire.
- Limites de durée et de taille. Journal d'audit. Aucun secret dans les logs.

## Chemins Windows
Chemins gérés via l'API `path` de Node (`\` et `/`). Aucun chemin utilisateur codé en dur.
Workspaces de projets stockés dans le système de fichiers Windows.
