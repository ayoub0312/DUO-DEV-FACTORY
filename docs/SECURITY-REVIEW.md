# Revue de sécurité — DUO DEV FACTORY WEB (V1)

Revue des contraintes définies dans le cahier des charges (§26) et de leur respect dans
l'implémentation actuelle.

## Contraintes explicites — statut

| Contrainte | Statut | Notes |
|---|---|---|
| Ne jamais lire `.env.local` | ✅ Respecté | Aucun accès programmatique à ce fichier dans le code livré. |
| Pas de push / déploiement / migration distante | ✅ Respecté | Aucune commande de ce type exécutée pendant le développement. |
| Pas de création de compte réel | ✅ Respecté | `requireOwner()` utilise un utilisateur mock local unique. |
| Pas de connexion au workflow réel avant validation du Mock Adapter | ✅ Respecté | Le Mock Adapter a été validé (tests + parcours complet observé, cf. `docs/QA-REPORT.md`) **avant** l'ajout du pont V1.5 décrit ci-dessous. `apps/worker` (protocole complet V2) reste un squelette. |
| Pas de copie pixel-perfect de Claude/ChatGPT | ✅ Respecté | Design system propre (`packages/config` tokens, palette builder/reviewer distincte). |
| Pas de dépendance à WSL | ✅ Respecté | Tout tourne nativement sous PowerShell/Node sur Windows. |
| Pas de scripts Bash obligatoires | ✅ Respecté | Scripts npm cross-platform ; Bash utilisé seulement comme confort de session, jamais requis. |
| Pas de modification destructive sans sauvegarde | ✅ Respecté | Suppression de projet = soft-delete (`deletedAt`), aucune purge physique. |
| Pas d'API exposant l'exécution de commandes shell arbitraires | ✅ Respecté | Aucune route API n'exécute de commande système ; le Worker (squelette) documente une allowlist d'actions (`security/allowlist.ts`) plutôt qu'un shell libre. Le pont Worker externe (`POST /api/projects/:id/workflow/external-events`) ne fait qu'**ingérer** des données structurées validées par Zod (`agent`, `action`, `cycle`, `verdict`, `message`) — communication strictement sortante depuis le script Ubuntu, jamais l'inverse ; la plateforme ne peut déclencher aucune exécution sur la machine externe. |
| Auth mock interdite en production | ⚠️ À surveiller | L'auth actuelle (`requireOwner`) est un mock volontaire pour la V1 locale. **Ne pas déployer en l'état** — un vrai provider (sessions signées, hachage de mot de passe ou OAuth) est requis avant toute mise en production. |
| Documents uploadés considérés non fiables | ✅ Respecté | Validation de type MIME/catégorie et de taille côté serveur (`files.ts`), noms générés (`generatedName`) plutôt que noms bruts, aucune exécution de contenu uploadé. |
| Aucune instruction dans un fichier ne remplace les règles de sécurité | ✅ Respecté par construction | Le contenu des fichiers/messages utilisateur n'est jamais interprété comme instruction système ; aucun mécanisme de prompt-execution sur contenu uploadé. |

## Pont Worker externe (V1.5) — `POST /api/projects/:id/workflow/external-events`

Ajouté pour relier un workflow Duo réel déjà en fonctionnement (ex. script bash local
orchestrant Claude Builder + Codex Reviewer, cf. `docs/worker-bridge-ubuntu.md`) à
l'affichage de la plateforme, sans attendre le protocole Worker complet (V2).

- **Désactivé par défaut** (`WORKER_BRIDGE_ENABLED=false`) — vérifié : sans configuration,
  toute requête reçoit `401 WORKER_TOKEN_INVALID`.
- **Authentification** : jeton partagé (`WORKER_BRIDGE_TOKEN`), comparaison à temps
  constant (`timingSafeEqual`) pour éviter une attaque par timing.
- **Aucune commande transmise** : le corps de requête est validé par
  `zExternalWorkflowEvent` (agent, action, cycle, verdict, message) — aucun champ ne peut
  contenir de commande exécutable, et rien n'est jamais interprété comme tel.
- **Communication à sens unique** : le script externe pousse des événements ; la
  plateforme ne peut rien déclencher en retour sur la machine externe.
- **Rate limité** comme toute route d'écriture (30 req/60s, catégorie `write`).
- **Testé de bout en bout** (voir `docs/QA-REPORT.md`) : cycle complet
  `PLANNING → REVIEWING_PLAN → FIXING_PLAN → REVIEWING_PLAN → PLAN_APPROVED` vérifié par
  appels `curl` réels, jeton invalide/absent correctement rejeté (401).

## Points d'attention pour la suite (V2 / Worker réel)

1. **Jetons Worker** : le schéma (`workers.tokenHash`) prévoit déjà un stockage haché — ne
   jamais stocker de jeton en clair lors de l'implémentation réelle du register/heartbeat.
2. **Allowlist d'actions** : `apps/worker/src/security/allowlist.ts` doit rester la seule
   source de vérité des actions permises ; toute nouvelle action doit être ajoutée
   explicitement, jamais déduite dynamiquement d'une entrée utilisateur.
3. **Secrets** : la table `secret_references` ne stocke que des pointeurs — vérifier que
   l'implémentation réelle du Worker ne journalise jamais la valeur résolue.
4. **Rate limiting** : ✅ implémenté en V1 — fenêtre glissante en mémoire par propriétaire
   + catégorie de route (`apps/web/src/server/rate-limit.ts`), branchée dans `handle()`
   (`apps/web/src/server/http.ts`). Limites : 120 req/60s en lecture, 30 req/60s en
   écriture, 10 req/60s pour l'upload. Retourne `429` + en-tête `Retry-After`. Suffisant
   pour la V1 mono-processus ; à remplacer par un store partagé (Redis) si le serveur est
   un jour répliqué sur plusieurs instances ou exposé à plusieurs utilisateurs.
   Pour le Worker réel (V2), prévoir une limite distincte par jeton Worker plutôt que
   par propriétaire.
5. **Audit log** : la table `audit_logs` existe dans le schéma mais n'est pas encore
   alimentée systématiquement par les routes API — à compléter avant la production.

## Synthèse

Aucune violation des interdictions explicites n'a été constatée dans le code livré à date.
Le principal garde-fou restant avant toute mise en production est le remplacement de
l'authentification mock et l'ajout d'un rate limiting réseau, tous deux déjà identifiés
comme hors-scope V1 par le cahier des charges.
