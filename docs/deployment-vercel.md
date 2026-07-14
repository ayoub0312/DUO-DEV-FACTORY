# Déploiement Vercel — DUO DEV FACTORY WEB

> **Ne pas déployer automatiquement** (cahier §26). Ce guide prépare le projet ; le
> déploiement reste une action humaine explicite.

## Ce qui est déployé sur Vercel
- L'interface Next.js (`apps/web`) et ses **API de contrôle** (Route Handlers).
- Les pages, et d'éventuels webhooks.

## Ce qui n'est **pas** sur Vercel
- Le **Worker** : installé localement (Windows), exécution persistante, connexion
  **sortante** uniquement. Jamais dans une fonction serverless courte.

## Point réseau critique
Vercel **ne peut pas** appeler le `localhost` du poste de l'utilisateur. Le Worker doit
récupérer ses tâches via une connexion **sortante** sécurisée (register → heartbeat →
claim → events/artifacts → complete/fail). N'exposez jamais un port public non protégé sur
le poste Windows.

## Services externes
- **Turso** (libSQL) pour les données — `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
- **Vercel Blob** pour les fichiers — `BLOB_READ_WRITE_TOKEN`, `STORAGE_DRIVER=blob`.
- Fournisseur d'authentification — `AUTH_SECRET`, `OWNER_EMAIL`, `AUTH_DEV_MODE=false`.
- Fournisseur e-mail (facultatif).

## Variables d'environnement (Project Settings → Environment Variables)
Renseigner les noms listés dans `.env.example`. **Aucun secret dans le dépôt.**
En production : `NODE_ENV=production`, `AUTH_DEV_MODE=false` (l'app **refuse** l'auth mock
en production). `RATE_LIMIT_ENABLED=true`.

## Étapes (manuelles, quand décidé)
1. Importer le dépôt dans Vercel, racine du monorepo, app = `apps/web`.
2. Build command : `npm run build` (dans `apps/web`). Install : `npm install` (racine).
3. Configurer les variables d'environnement.
4. Provisionner Turso + Vercel Blob, brancher les tokens.
5. Vérifier `GET /api/health`.

## Compatibilité serverless
Server Components par défaut, pas d'état en mémoire longue durée côté web, événements par
**polling curseur** (remplaçable par streaming sans changer les contrats). Le Worker,
persistant, reste hors Vercel.
