// Design tokens — source de vérité partagée (voir docs/design-system.md).
// Utilisés par le preset Tailwind et exposés en variables CSS dans apps/web.
export const tokens = {
  color: {
    light: {
      bg: '#FBFAF7',
      surface: '#FFFFFF',
      'surface-2': '#F4F2ED',
      border: '#E6E2D9',
      text: '#1C1B1A',
      'text-muted': '#6B6862',
      'accent-builder': '#E0713A',
      'accent-reviewer': '#2B5CE6',
      success: '#2E9E6B',
      warning: '#D9822B',
      danger: '#D14343',
    },
    dark: {
      bg: '#0E1116',
      surface: '#171B22',
      'surface-2': '#1E232C',
      border: '#2A303A',
      text: '#ECEAE4',
      'text-muted': '#9BA1AC',
      'accent-builder': '#F08A57',
      'accent-reviewer': '#5B84F0',
      success: '#43B583',
      warning: '#E0975B',
      danger: '#E06565',
    },
  },
  radius: { sm: '8px', md: '12px', lg: '16px' },
  space: [0, 4, 8, 12, 16, 24, 32, 48, 64],
  motion: { fast: '120ms', base: '160ms', slow: '220ms' },
};

export default tokens;
