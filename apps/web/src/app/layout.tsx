import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeScript } from '../components/theme-script';
import { CommandPalette } from '../components/command-palette';

export const metadata: Metadata = {
  title: 'DUO DEV FACTORY WEB',
  description: 'Centre de commande de développement assisté par IA — Claude Builder + Codex Reviewer.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1116' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
