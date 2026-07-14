# AGENTS.md — Sous-agents spécialisés

Utiliser ces rôles lorsqu'ils apportent une vraie valeur. Utiliser le meilleur modèle
disponible pour l'architecture, le design, la sécurité et la revue finale. Les agents
peuvent rechercher en parallèle mais ne modifient jamais simultanément les mêmes fichiers.

| Agent | Responsabilité | Intervient sur |
|---|---|---|
| `software-architect` | Décisions d'architecture, découpage, ADR, cohérence contrats | `docs/`, frontières packages |
| `product-designer` | Design system, layout, états, accessibilité visuelle | `docs/design-system.md`, `packages/ui`, `apps/web` UI |
| `frontend-developer` | Composants, écrans, interactions, thème, responsive | `apps/web`, `packages/ui` |
| `backend-developer` | Route Handlers, services domaine, adapters, événements | `apps/web/src/server`, `apps/worker` |
| `database-developer` | Schéma Drizzle, migrations, repository, index | `packages/database` |
| `security-reviewer` | Secrets, autorisations, uploads, prompt injection, Worker | transverse + `docs/SECURITY-REVIEW.md` |
| `qa-reviewer` | Tests (unit/intégration/E2E/a11y), portes qualité, verdict | `tests/`, `*/__tests__`, `docs/QA-REPORT.md` |

## Règles communes
- Lire `CLAUDE.md` et le cahier des charges avant d'agir.
- Respecter les frontières de dépendances : `apps/*` dépend de `packages/*`, jamais l'inverse.
  `packages/workflow-engine` reste **pur** (aucune I/O).
- Toute entrée validée par **Zod** (`packages/contracts`). Refus par défaut côté serveur.
- Documenter les décisions importantes dans `docs/`.
