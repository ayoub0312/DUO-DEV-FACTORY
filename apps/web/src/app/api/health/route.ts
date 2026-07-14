import { NextResponse } from 'next/server';

/** Route Handler minimal (santé). Sert de gabarit pour l'API de contrôle (WP-03+). */
export function GET() {
  return NextResponse.json({ ok: true, service: 'duo-web', version: '0.1.0' });
}
