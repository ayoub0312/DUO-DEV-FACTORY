'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <div className="text-4xl font-bold text-danger">Erreur</div>
      <p className="max-w-md text-center text-text-muted">
        {error.message || 'Une erreur inattendue est survenue.'}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-accent-builder px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        Réessayer
      </button>
    </div>
  );
}
