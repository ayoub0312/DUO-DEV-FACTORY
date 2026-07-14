# Pont Worker externe — connecter un workflow Duo réel (WSL/Ubuntu) à la plateforme

Ce document explique comment relier un workflow Duo **réel** déjà en fonctionnement dans
un terminal WSL/Ubuntu (ex. `scripts/duo-autopilot.sh` orchestrant Claude Builder et Codex
Reviewer sur un projet local) à l'interface DUO DEV FACTORY WEB, pour que sa progression
s'affiche dans l'onglet Workflow de la plateforme au lieu du Mock Adapter.

## Principe

- Votre script Ubuntu continue de tourner **exactement comme aujourd'hui**, sans aucune
  modification de sa logique métier.
- On ajoute uniquement des appels `curl` à quelques points clés (déjà loggés aujourd'hui)
  pour pousser des événements structurés vers un endpoint dédié de la plateforme.
- La plateforme ne fait qu'**enregistrer** ces événements et les traduire en transitions
  de la machine à états déjà existante (`PLANNING → REVIEWING_PLAN → FIXING_PLAN → …`).
  Aucune commande n'est jamais envoyée dans l'autre sens : la plateforme ne peut ni ne
  doit jamais déclencher d'exécution shell sur votre machine (voir
  [`docs/SECURITY-REVIEW.md`](./SECURITY-REVIEW.md)).
- Communication strictement **sortante** depuis Ubuntu vers la plateforme (localhost),
  authentifiée par un jeton partagé.

## 1. Activer le pont côté plateforme

Dans `apps/web/.env.local` (jamais commité) :

```env
WORKER_BRIDGE_ENABLED=true
WORKER_BRIDGE_TOKEN=<valeur aléatoire longue, ex. générée avec `openssl rand -hex 32`>
```

Redémarrez le serveur de développement (`npm run dev --workspace @duo/web`) pour que la
configuration soit prise en compte.

## 2. Récupérer l'ID du projet cible

Ouvrez le projet concerné dans la plateforme (ex. « Restaurant Maison Azur ») : l'ID
apparaît dans l'URL, sous la forme `prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
(`/projects/prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).

## 3. Copier le script de pont

Copiez [`scripts/duo-web-bridge.sh`](../scripts/duo-web-bridge.sh) dans le dossier
`scripts/` de votre projet Ubuntu (ex. `~/projets/restaurant-premium/scripts/`).

## 4. Configurer les variables dans votre environnement Ubuntu

En tête de `duo-autopilot.sh`, ou dans votre `~/.bashrc` / un fichier `.env` sourcé avant
lancement :

```bash
export DUO_WEB_URL="http://localhost:3001"
export DUO_PROJECT_ID="prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export DUO_BRIDGE_TOKEN="<la même valeur que WORKER_BRIDGE_TOKEN côté plateforme>"

source "$(dirname "$0")/scripts/duo-web-bridge.sh"
```

> Si votre poste Ubuntu (WSL) et la plateforme web (Windows) tournent sur la même
> machine, `http://localhost:3001` fonctionne directement grâce au partage réseau de
> WSL2 avec l'hôte Windows. Si ce n'est pas le cas, remplacez par l'IP de la machine
> hébergeant la plateforme.

## 5. Ajouter les appels dans `duo-autopilot.sh`

D'après la sortie observée de votre script, ajoutez un appel `duo_web_event` juste après
chaque ligne de log existante correspondante :

| Log existant | Appel à ajouter juste après |
|---|---|
| `[...] Claude démarre : plan-$CYCLE` | `duo_web_event claude started "$CYCLE"` |
| `[...] Claude terminé : plan-$CYCLE` | `duo_web_event claude completed "$CYCLE"` |
| `[...] Codex démarre : plan-$CYCLE` | `duo_web_event codex started "$CYCLE"` |
| `[...] Codex terminé : plan-$CYCLE` | `duo_web_event codex completed "$CYCLE"` |
| `[...] Verdict plan cycle $CYCLE : $VERDICT` | `duo_web_event codex verdict "$CYCLE" "$VERDICT"` |

`$VERDICT` doit valoir exactement `APPROVED`, `CHANGES_REQUESTED` ou `INVALID` (adaptez si
votre script utilise d'autres libellés — ex. mappez `absent`/erreur de lecture du rapport
vers `INVALID`).

## 6. Vérifier

1. Démarrez (ou laissez tourner) `./scripts/duo-autopilot.sh` dans Ubuntu.
2. Ouvrez l'onglet **Workflow** du projet correspondant dans la plateforme.
3. Vous devez voir apparaître, en quelques secondes, l'état réel (`Planification`, puis
   `Review du plan`, etc.) et les événements dans la frise — poussés par votre script,
   plus par la simulation Mock.

Si rien n'apparaît :
- vérifiez que `WORKER_BRIDGE_ENABLED=true` et que le serveur web a bien redémarré ;
- vérifiez que `DUO_BRIDGE_TOKEN` est identique des deux côtés ;
- vérifiez les logs du serveur web (`console.error` sur erreur 401/500) ;
- testez manuellement un appel avec `curl -v` pour voir la réponse HTTP exacte.

## Limites de cette V1.5 du pont

- Ne couvre que le cycle de revue du **plan** (`PLANNING ↔ REVIEWING_PLAN ↔ FIXING_PLAN`),
  conformément à ce que fait actuellement `duo-autopilot.sh`. Si votre script est étendu
  plus tard pour gérer la construction de lots et les tests, il faudra ajouter de
  nouveaux types d'événements et transitions correspondantes (`built`, `tested`,
  `package_approved`, etc. — déjà définis dans `packages/workflow-engine`).
- Authentification par jeton partagé unique (pas de gestion multi-Worker, pas de
  heartbeat, pas de `claim` de job) — suffisant pour un seul poste de développement.
  Le protocole complet (registre, heartbeat, claim idempotent) reste décrit dans
  [`docs/REAL-WORKFLOW-INTEGRATION-TODO.md`](./REAL-WORKFLOW-INTEGRATION-TODO.md) pour
  une V2 avec plusieurs Workers.
- Le pont ne peut ni mettre en pause, ni reprendre, ni annuler votre script Ubuntu depuis
  la plateforme — l'affichage est en lecture seule. Pause/Reprise/Arrêt dans l'UI restent
  réservés aux runs Mock tant que ce contrôle n'est pas implémenté côté script Ubuntu.
