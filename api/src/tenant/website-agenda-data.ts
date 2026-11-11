import { BadRequestException } from '@nestjs/common';

export const websiteLanguages = ['es', 'en', 'zh'] as const;
export type WebsiteLanguage = (typeof websiteLanguages)[number];
export type Translation = Record<WebsiteLanguage, string>;
export type WebsiteEvent = {
  id: string; sortDate: string; sortTime: string;
  title: Translation; date: Translation; venue: Translation; category: Translation; description: Translation;
  url: string; sourceLabel: string; imageUrl: string; imageWidth: number; imageHeight: number;
};
export const websiteSites: Record<string, { name: string; origin: string; path: string }> = {
  suitesmine: { name: 'Suites Mine', origin: 'https://www.suitesmine.com', path: '/our-blog/' },
  kepler: { name: 'Business Suites Kepler', origin: 'https://www.businesssuiteskepler.com', path: '/#eventos' },
};
const imageHosts = new Set([
  'media.ticketmaster.com', 'prismic-images.tmol.io', 'dynamicmedia.livenationinternational.com',
  'networksites.livenationinternational.com', 'www.auditorio.com.mx', 'auditorio.com.mx',
  'munal.mx', 'www.munal.mx', 'cdn.prod.website-files.com', 'www.museotamayo.org',
  'www.suitesmine.com', 'www.businesssuiteskepler.com',
]);

export function websiteMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export function validMonth(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Le mois doit être au format AAAA-MM.');
}

const text = (value: unknown, max = 400) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const translation = (value: unknown, max: number): Translation => {
  const obj = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { es: text(obj.es, max), en: text(obj.en, max), zh: text(obj.zh, max) };
};

export function allowedImageUrl(source: string, siteKey: string): URL {
  const site = websiteSites[siteKey];
  if (!site) throw new BadRequestException('Site inconnu.');
  let url: URL;
  try { url = new URL(source, site.origin); } catch { throw new BadRequestException('Adresse du visuel invalide.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !imageHosts.has(url.hostname)) {
    throw new BadRequestException('Utilisez le visuel HTTPS d’un organisateur officiel ou de l’hôtel.');
  }
  return url;
}

export function cleanWebsiteEvents(raw: unknown): WebsiteEvent[] {
  if (!Array.isArray(raw) || raw.length > 100) throw new BadRequestException('Un agenda contient au maximum 100 événements.');
  const ids = new Set<string>();
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new BadRequestException('Événement invalide.');
    const event = item as Record<string, unknown>;
    const id = text(event.id, 120);
    if (!/^[a-z0-9][a-z0-9_-]{0,119}$/i.test(id) || ids.has(id)) throw new BadRequestException('Chaque événement doit avoir un identifiant unique.');
    ids.add(id);
    return {
      id, sortDate: text(event.sortDate, 10), sortTime: text(event.sortTime, 5),
      title: translation(event.title, 300), date: translation(event.date, 200),
      venue: translation(event.venue, 300), category: translation(event.category, 80), description: translation(event.description, 2000),
      url: text(event.url, 2000), sourceLabel: text(event.sourceLabel, 120), imageUrl: text(event.imageUrl, 2000),
      imageWidth: Math.min(3000, Math.max(1, Number(event.imageWidth) || 720)),
      imageHeight: Math.min(3000, Math.max(1, Number(event.imageHeight) || 450)),
    };
  });
}

export function agendaIssues(events: WebsiteEvent[], monthKey: string, siteKey: string) {
  const issues: string[] = [];
  const languages = { es: true, en: true, zh: true };
  if (!events.length) issues.push('Ajoutez au moins un événement avant de valider.');
  for (const event of events) {
    const label = event.title.es || event.id;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(event.sortDate) ? new Date(`${event.sortDate}T12:00:00Z`) : null;
    if (!parsed || !Number.isFinite(parsed.getTime()) || !parsed.toISOString().startsWith(event.sortDate) || !event.sortDate.startsWith(monthKey)) {
      issues.push(`${label} : date de classement absente ou hors du mois choisi.`);
    }
    if (event.sortTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.sortTime)) issues.push(`${label} : heure invalide.`);
    try { if (new URL(event.url).protocol !== 'https:') throw new Error(); }
    catch { issues.push(`${label} : lien officiel HTTPS requis.`); }
    if (event.imageUrl) try { allowedImageUrl(event.imageUrl, siteKey); } catch { issues.push(`${label} : source du visuel non autorisée.`); }
    for (const lang of websiteLanguages) {
      const missing = (['title', 'date', 'venue', 'category', 'description'] as const).filter(field => !event[field][lang]);
      if (missing.length) {
        languages[lang] = false;
        issues.push(`${label} · ${lang.toUpperCase()} : ${missing.join(', ')} à compléter.`);
      }
    }
  }
  return { languages, issues };
}

export function agendaStatus(monthKey: string, approvedAt: Date | null, now = new Date()) {
  if (!approvedAt) return 'DRAFT';
  const current = websiteMonth(now);
  return monthKey > current ? 'SCHEDULED' : monthKey === current ? 'LIVE' : 'ARCHIVED';
}
