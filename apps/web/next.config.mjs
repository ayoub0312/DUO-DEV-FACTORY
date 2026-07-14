/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Consomme les packages internes directement en TypeScript source.
  transpilePackages: ['@duo/ui', '@duo/contracts'],
  experimental: {
    // Autorise l'import de code hors du dossier de l'app dans le monorepo.
    externalDir: true,
  },
};

export default nextConfig;
