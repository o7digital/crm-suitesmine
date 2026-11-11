import 'server-only';

// This feature also operates when the rest of the CRM is in browser-only demo mode.
// No workspace or publication is selected by this origin; the API uses the session.
export function newsletterBackend() {
  const origin = process.env.NEWSLETTER_API_ROOT || process.env.NEXT_PUBLIC_API_ROOT ||
    process.env.NEXT_PUBLIC_API_URL || 'https://api-suitesmine-production.up.railway.app';
  return `${origin.replace(/\/+$/, '').replace(/\/api$/, '')}/api`;
}
