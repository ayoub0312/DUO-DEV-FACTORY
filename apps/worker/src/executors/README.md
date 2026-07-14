# Executors (stubs — non branchés en V1)

Emplacement des exécuteurs réels du Worker local, **désactivés** en V1 (cahier §26 : pas de
connexion au workflow réel avant validation du Mock Adapter). Chaque exécuteur sera branché
en WP-09 et au-delà, derrière l'allowlist (`../security/allowlist.ts`) et les limites de
durée/taille.

Exécuteurs prévus :

- `claude.ts` — invoque Claude Code localement (build).
- `codex.ts` — invoque Codex en **lecture seule** (review).
- `git.ts` — `git status` / `git diff` (jamais de push automatique).
- `tests.ts` — typecheck, lint, build, unit, integration, e2e, a11y.
- `preview.ts` — démarre/arrête un serveur de prévisualisation local.

Règle : aucune commande shell arbitraire reçue du navigateur. Seules les actions de
l'allowlist sont exécutables.
