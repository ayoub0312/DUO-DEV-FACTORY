// Preset Tailwind partagé. Les couleurs pointent vers des variables CSS définies par le
// thème (clair/sombre) dans apps/web/src/app/globals.css — voir docs/design-system.md.
const withVar = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {Partial<import('tailwindcss').Config>} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: withVar('bg'),
        surface: withVar('surface'),
        'surface-2': withVar('surface-2'),
        border: withVar('border'),
        text: withVar('text'),
        'text-muted': withVar('text-muted'),
        'accent-builder': withVar('accent-builder'),
        'accent-reviewer': withVar('accent-reviewer'),
        success: withVar('success'),
        warning: withVar('warning'),
        danger: withVar('danger'),
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px' },
      transitionDuration: { fast: '120ms', base: '160ms', slow: '220ms' },
    },
  },
};
