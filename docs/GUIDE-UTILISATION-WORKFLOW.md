# Guide d'utilisation — Développer un projet avec DUO DEV FACTORY

Ce guide explique, étape par étape, comment utiliser concrètement la plateforme et le
workflow réel (Claude Builder + Codex Reviewer) pour développer un projet du début à la
fin. Il complète [`worker-bridge-ubuntu.md`](./worker-bridge-ubuntu.md) (connexion
technique du pont) en se concentrant sur l'**usage** : quoi faire, dans quel ordre.

## Vue d'ensemble : qui fait quoi

| Composant | Rôle | Où ça tourne |
|---|---|---|
| **Plateforme web** (Vercel) | Tableau de bord : projets, chat, fichiers, **affichage** de la progression | Cloud (Vercel) |
| **`duo-autopilot.sh`** | Orchestre réellement Claude Code et Codex, écrit le code | Votre terminal Ubuntu/WSL |
| **Pont** (`duo-web-bridge.sh`) | Fait remonter la progression réelle vers la plateforme | Votre terminal Ubuntu/WSL |

**Règle à retenir : la plateforme n'écrit jamais de code.** Elle affiche ce que fait votre
script Ubuntu. Sans lancer `duo-autopilot.sh`, rien ne se développe.

## Étape 1 — Préparer le projet côté Ubuntu

Chaque projet développé par le workflow doit être un dossier avec cette structure :

```
mon-projet/
├── brief/
│   ├── CAHIER_DES_CHARGES.md   ← le besoin, en détail
│   └── assets/                 ← maquettes, logos, captures (optionnel)
├── scripts/
│   ├── duo-autopilot.sh        ← le script d'orchestration (déjà en place)
│   └── duo-web-bridge.sh       ← le pont vers la plateforme (déjà en place)
└── reports/                    ← généré automatiquement pendant l'exécution
```

### Rédiger `brief/CAHIER_DES_CHARGES.md`

C'est le document le plus important : Claude s'appuie **dessus** pour tout le reste.
Plus il est précis, meilleur sera le résultat. Structure conseillée :

```markdown
# Cahier des charges — [Nom du projet]

## Contexte
Qui est le client, quel problème on résout, pour qui.

## Fonctionnalités attendues
- Liste concrète des fonctionnalités (une par ligne, vérifiable)
- Ex. : "Un visiteur peut réserver une table en choisissant une date et un créneau"

## Contraintes techniques
Stack imposée ou préférée (ex. Next.js, base de données, hébergement prévu),
contraintes de sécurité, d'accessibilité, de performance.

## Design / identité visuelle
Couleurs, ton, références visuelles (mettre les fichiers dans brief/assets/).

## Ce qui est explicitement hors périmètre
Pour éviter que Claude n'invente des fonctionnalités non désirées.
```

## Étape 2 — Créer le projet dans la plateforme (pour le suivi)

1. Allez sur la plateforme (`https://duo-dev-factory-web.vercel.app`), connectez-vous
2. **+ Nouveau projet** → donnez-lui un nom clair (ex. correspondant au dossier Ubuntu)
3. Notez son **ID** dans l'URL : `prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Étape 3 — Configurer le pont (une fois par session de terminal)

Dans votre terminal Ubuntu, avant de lancer le script :

```bash
export DUO_WEB_URL="http://172.23.208.1:3001"      # ou l'URL de la plateforme déployée
export DUO_PROJECT_ID="prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export DUO_BRIDGE_TOKEN="<votre token, voir WORKER_BRIDGE_TOKEN côté plateforme>"
```

> Astuce : ajoutez ces lignes à un fichier `~/.bashrc` (avec un `if` sur le dossier
> courant) si vous voulez éviter de les retaper à chaque session — mais ne committez
> jamais le vrai token dans le dépôt du projet.

## Étape 4 — Lancer le workflow réel

```bash
cd ~/projets/mon-projet
./scripts/duo-autopilot.sh
```

Le script va, dans l'ordre :

1. **Phase Plan** : Claude lit le cahier des charges et produit un plan
   (`reports/architecture-plan.md`, `reports/design-system.md`, etc.). Codex le relit et
   rend un verdict (`APPROVED` ou `CHANGES_REQUESTED`, jusqu'à 2 cycles de correction par
   défaut — `MAX_PLAN_CYCLES`).
2. **Phase Build** : une fois le plan approuvé, Claude développe réellement le code.
   Des contrôles automatiques tournent ensuite (install, TypeScript, lint, build, tests).
3. **Phase Code Review** : Codex revoit le code produit. S'il demande des corrections,
   Claude les applique et les contrôles retournent avant une nouvelle revue (jusqu'à
   `MAX_CODE_CYCLES`, 3 par défaut).
4. **Verdict final** : `reports/DUO-RESULT.md` contient `STATUS: APPROVED` ou `BLOCKED`.

## Étape 5 — Suivre la progression en direct

Pendant que le script tourne, ouvrez l'onglet **Workflow** du projet dans la plateforme :
vous verrez l'état changer en temps réel (`Planification`, `Construction`,
`Review du lot`, etc.), avec la frise de progression et le journal d'événements.

Vous pouvez aussi suivre les logs bruts directement dans le terminal, ou dans
`~/.local/state/mon-projet-duo/logs/<horodatage>/`.

## Étape 6 — Récupérer le résultat

Une fois le script terminé (`exit 0` = succès) :

```bash
cat reports/DUO-RESULT.md          # verdict global
git log --oneline                  # historique (rien n'est poussé automatiquement)
git diff <commit-avant>..HEAD      # voir tout ce qui a été écrit
```

Si `STATUS: BLOCKED`, ouvrez le dernier rapport Codex mentionné dans le fichier pour
comprendre ce qui bloque, ajustez le cahier des charges ou les contraintes si besoin, et
relancez `./scripts/duo-autopilot.sh` (il recommence à `plan-0`).

## Ce que le script ne fait jamais (sécurité)

- Aucun `git push`, `git commit` automatique, ni déploiement
- Aucune lecture de vos vrais secrets (`.env.local` est sauvegardé et remplacé par des
  valeurs factices pendant l'exécution, puis restauré à la fin)
- Aucune modification en dehors du dossier du projet

## Questions fréquentes

**Le workflow s'arrête avec "Un autre workflow Duo est déjà en cours."**
Un verrou (`duo.lock`) empêche deux exécutions simultanées sur le même projet. Si aucune
exécution n'est réellement en cours (crash précédent), supprimez le fichier indiqué dans
`~/.local/state/<projet>-duo/duo.lock`.

**Je veux juste voir une démo sans lancer de vrai développement.**
Utilisez le bouton **Démarrer** dans l'onglet Workflow de la plateforme (Mock Adapter) —
ça simule une progression fictive sans toucher à Ubuntu ni consommer de vrais appels
Claude/Codex.

**Comment changer le nombre de cycles de correction autorisés ?**
Exportez `MAX_PLAN_CYCLES` et/ou `MAX_CODE_CYCLES` avant de lancer le script
(ex. `export MAX_CODE_CYCLES=5`).
