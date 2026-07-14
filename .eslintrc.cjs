// Config ESLint racine pour les packages (les apps ont leur propre config).
// apps/web utilise `next/core-web-vitals` (root:true) et n'hérite pas de ce fichier.
// Règles alignées sur packages/config/eslint-preset.cjs (inlinées ici pour une
// résolution fiable des plugins hoistés à la racine).
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2022: true, node: true, browser: true },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    '.next',
    'migrations',
    'apps/web',
    '**/*.config.*',
    '**/*.cjs',
  ],
};
