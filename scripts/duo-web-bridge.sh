#!/usr/bin/env bash
# Pont léger entre un workflow Duo réel (ex. duo-autopilot.sh, exécuté dans WSL/Ubuntu)
# et la plateforme DUO DEV FACTORY WEB. Pousse des événements structurés vers l'API
# d'ingestion (POST /api/projects/:id/workflow/external-events) ; n'exécute JAMAIS de
# commande envoyée par la plateforme — communication à sens unique, en lecture seule
# pour la plateforme (voir docs/worker-bridge-ubuntu.md).
#
# Utilisation : copier ce fichier dans le dossier `scripts/` de VOTRE projet Ubuntu
# (ex. ~/projets/restaurant-premium/scripts/), puis le sourcer en tête de votre script
# d'orchestration :
#
#   source "$(dirname "$0")/duo-web-bridge.sh"
#
# Variables d'environnement requises (à exporter avant de lancer votre script — via
# votre ~/.bashrc pour la persistance, JAMAIS committées dans le dépôt du projet) :
#   DUO_WEB_URL      — ex. http://172.23.208.1:3001 (URL de la plateforme, vue depuis WSL)
#   DUO_PROJECT_ID   — ID du projet dans la plateforme (visible dans l'URL /projects/:id)
#   DUO_BRIDGE_TOKEN — doit correspondre à WORKER_BRIDGE_TOKEN côté plateforme (.env.local)
#
# Fonction fournie :
#   duo_web_event <agent:claude|codex> <action:started|completed|verdict> <stage> [verdict] [message]
#
# `stage` identifie la phase réelle du script (ex. "plan-0", "build", "code-1", "fix-2") —
# la plateforme reconnaît les préfixes plan-/build/code-/fix- pour piloter la machine à
# états correspondante.
#
# La fonction échoue silencieusement (avertissement sur stderr) si la plateforme est
# injoignable : elle ne doit jamais bloquer ni faire échouer votre workflow réel.

duo_web_event() {
  local agent="$1"
  local action="$2"
  local stage="$3"
  local verdict="${4:-}"
  local message="${5:-}"

  if [ -z "${DUO_WEB_URL:-}" ] || [ -z "${DUO_PROJECT_ID:-}" ] || [ -z "${DUO_BRIDGE_TOKEN:-}" ]; then
    echo "[duo-web-bridge] variables DUO_WEB_URL / DUO_PROJECT_ID / DUO_BRIDGE_TOKEN manquantes — événement ignoré" >&2
    return 0
  fi

  local payload
  payload=$(printf '{"agent":"%s","action":"%s","stage":"%s"' "$agent" "$action" "$stage")
  if [ -n "$verdict" ]; then
    payload="${payload},\"verdict\":\"${verdict}\""
  fi
  if [ -n "$message" ]; then
    # Échappement minimal des guillemets pour rester un JSON valide.
    local escaped_message="${message//\"/\\\"}"
    payload="${payload},\"message\":\"${escaped_message}\""
  fi
  payload="${payload}}"

  curl -fsS -m 5 \
    -X POST "${DUO_WEB_URL%/}/api/projects/${DUO_PROJECT_ID}/workflow/external-events" \
    -H "Authorization: Bearer ${DUO_BRIDGE_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    >/dev/null 2>&1 \
    || echo "[duo-web-bridge] échec d'envoi de l'événement (${agent} ${action} ${stage}) — plateforme injoignable, on continue" >&2
}
