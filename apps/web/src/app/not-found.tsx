import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <div className="text-6xl font-bold text-text-muted">404</div>
      <p className="text-lg text-text-muted">Page introuvable</p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-accent-builder px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
