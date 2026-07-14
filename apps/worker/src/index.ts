/**
 * Point d'entrée du Worker local (SQUELETTE V1).
 *
 * En V1, le Worker n'exécute rien de réel : il documente la boucle de connexion sortante
 * et permet de valider les contrats. La boucle réelle (register → heartbeat → claim →
 * events/artifacts → complete/fail) sera activée après validation du Mock Adapter.
 *
 * Lancement : `npm run start --workspace @duo/worker` (ou `dev` pour le watch).
 */
import { ALLOWED_WORKER_ACTIONS, WORKER_LIMITS } from './security/allowlist';

function main() {
  // eslint-disable-next-line no-console
  console.warn('[worker] squelette V1 — aucune exécution réelle.');
  // eslint-disable-next-line no-console
  console.warn('[worker] actions autorisées :', ALLOWED_WORKER_ACTIONS.join(', '));
  // eslint-disable-next-line no-console
  console.warn('[worker] limites :', JSON.stringify(WORKER_LIMITS));
  // TODO(WP-09) : boucle de connexion sortante vers la plateforme.
}

main();
