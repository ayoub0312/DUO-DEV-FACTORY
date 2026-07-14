# Design system — DUO DEV FACTORY WEB

Statut : Phase A (référence). Identité **originale et premium**. On s'inspire de la
finition des assistants professionnels modernes, **sans copier** logos, noms, palette
exacte, icônes, mise en page pixel par pixel, ni textes. Source : `docs/CAHIER…` §8–9, §17–18.

## 1. Principes

Professionnel, minimaliste, précis, chaleureux, technologique, rassurant. Grands espaces,
hiérarchie discrète, animations sobres, navigation évidente, forte lisibilité. La
productivité prime sur la décoration.

## 2. Design tokens

Les tokens sont la **source de vérité** (implémentés dans `packages/config/design-tokens.ts`
et exposés en variables CSS dans `apps/web`). Ne jamais coder une couleur en dur dans un
composant.

### 2.1 Couleurs — thème clair (indicatif, à affiner)

| Token | Rôle | Valeur indicative |
|---|---|---|
| `bg` | Fond principal (ivoire très clair) | `#FBFAF7` |
| `surface` | Surfaces (blanc chaud) | `#FFFFFF` |
| `surface-2` | Surface secondaire | `#F4F2ED` |
| `border` | Bordures | `#E6E2D9` |
| `text` | Texte principal (graphite) | `#1C1B1A` |
| `text-muted` | Texte secondaire (gris ardoise) | `#6B6862` |
| `accent-builder` | Claude Builder (ambre/corail) | `#E0713A` |
| `accent-reviewer` | Codex Reviewer (bleu profond) | `#2B5CE6` |
| `success` | Succès (vert) | `#2E9E6B` |
| `warning` | Avertissement (orange) | `#D9822B` |
| `danger` | Erreur (rouge contrôlé) | `#D14343` |

### 2.2 Couleurs — thème sombre

| Token | Rôle | Valeur indicative |
|---|---|---|
| `bg` | Fond (noir bleuté) | `#0E1116` |
| `surface` | Surfaces (graphite) | `#171B22` |
| `surface-2` | Surface secondaire | `#1E232C` |
| `border` | Bordures (gris anthracite) | `#2A303A` |
| `text` | Texte (blanc cassé) | `#ECEAE4` |
| `text-muted` | Texte secondaire | `#9BA1AC` |
| `accent-builder` | Claude Builder | `#F08A57` |
| `accent-reviewer` | Codex Reviewer | `#5B84F0` |
| `success` / `warning` / `danger` | conservés, contraste accessible | `#43B583` / `#E0975B` / `#E06565` |

Les deux accents (builder ambre, reviewer bleu) sont **sémantiques** : ils identifient
systématiquement l'agent concerné dans toute l'UI (badges, barres d'étape, événements).

### 2.3 Typographie
- Sans-serif moderne pour l'interface. Serif éditoriale **très limitée**, réservée à des
  titres d'accueil facultatifs.
- Corps 15–16 px. Champs de formulaire **16 px minimum**. Lignes de texte confortables.
- Contraste **AA minimum** partout. Aucun texte porté uniquement par la couleur.

### 2.4 Espacement, rayon, ombre
Échelle 4 px (`4, 8, 12, 16, 24, 32, 48`). Rayons doux (`8`/`12`/`16`). Ombres discrètes,
jamais dramatiques. Focus ring visible et contrasté.

### 2.5 Motion
Transitions **120–220 ms**. Animations d'état légères. Respect strict de
`prefers-reduced-motion` (désactivation des transitions non essentielles). Aucun effet
décoratif qui ralentit la productivité.

## 3. Mise en page

### 3.1 Desktop (trois zones)
```
┌───────────────┬──────────────────────────────┬─────────────────────┐
│ Sidebar       │ Zone principale              │ Panneau contextuel  │
│ Projets/Nav   │ Chat / Fichiers / Rapports   │ Workflow / Agents   │
│ Recherche     │ Onglets · composer           │ Étapes / Tests      │
└───────────────┴──────────────────────────────┴─────────────────────┘
```
- **Sidebar** : logo, bouton *Nouveau projet*, navigation, projets récents, recherche,
  paramètres, profil, réduction.
- **Zone principale** : titre du projet, onglets, conversation, cartes de fichiers,
  événements, composer, pièces jointes, raccourcis.
- **Panneau droit** (masquable) : étape actuelle, progression, agent actif, lots, verdict,
  actions Pause/Reprendre/Arrêter.

### 3.2 Mobile
Sidebar en drawer, panneau workflow en bottom sheet/drawer, composer toujours accessible,
fichiers en cartes, tables remplacées par des listes, zones tactiles **≥ 44 px**.

### 3.3 Breakpoints à tester
320, 375, 768, 1024, 1440 px, plus **zoom 200 %**.

## 4. Composants (bibliothèque maison, accessible)

Primitives inspirées de Radix (comportement/ARIA) mais **habillage maison** pour préserver
l'identité. Ensemble minimum V1 : Button, IconButton, Input, Textarea/Composer, Select,
Checkbox/Switch, Tabs, Dialog/Drawer/Sheet, Toast + centre de notifications, Tooltip,
Badge (statut/agent), Card, Table→List responsive, Skeleton, EmptyState, ProgressBar,
Timeline d'événements, StepFrise (frise d'étapes), CommandPalette (`Ctrl+K`).

## 5. États obligatoires (chaque écran)

`loading` · `skeleton` · `empty` · `error` · `retry` · `offline` · `paused` · `blocked` ·
`success` · `permission denied`. Prévus **systématiquement**, jamais après coup.

## 6. Statuts & couleurs sémantiques

| Statut workflow | Couleur | Note |
|---|---|---|
| En cours (building/testing) | accent-builder | animation légère |
| En review | accent-reviewer | pas de modification pendant la review |
| Approuvé / succès | success | |
| En pause | text-muted | icône pause |
| Bloqué | warning | action requise |
| Échec / annulé | danger | erreur conservée et lisible |

## 7. Raccourcis clavier

`Ctrl+K` palette · `Ctrl+N` nouveau projet · `/` focus chat · `Ctrl+Shift+F` recherche ·
`Esc` fermer drawer/modal.

## 8. Accessibilité (exigences)

Focus visible, ordre logique, labels, dialogues accessibles, zones tactiles, tableaux
adaptatifs, contraste AA, mode contraste renforcé, reduced motion, navigation clavier
complète, compatibilité lecteurs d'écran. Vérification automatisée avec axe-core.

## 9. Notifications

Toast discret, centre de notifications, erreurs persistantes visibles. Aucune erreur
importante uniquement en console.
