import type { NewsletterCampaign } from './campaignWorkspace';

export type AgendaLanguage = 'es' | 'en' | 'zh';
export type AgendaTranslation = Record<AgendaLanguage, string>;
export type WebsiteEvent = {
  id: string; sortDate: string; sortTime: string;
  title: AgendaTranslation; date: AgendaTranslation; venue: AgendaTranslation; category: AgendaTranslation; description: AgendaTranslation;
  url: string; sourceLabel: string; imageUrl: string; imageWidth: number; imageHeight: number;
};
export type WebsiteAgenda = {
  id: string; siteKey: 'suitesmine' | 'kepler'; name: string; origin: string; path: string;
  months: Array<{ monthKey: string; approvedAt: string | null; updatedAt: string; status: string }>;
};
export type AgendaDraft = {
  monthKey: string; campaignId: string; events: WebsiteEvent[]; updatedAt: string | null;
  approvedAt: string | null; status: string; hasPendingChanges: boolean;
  validation: { languages: Record<AgendaLanguage, boolean>; issues: string[] };
};
export const agendaLanguages: AgendaLanguage[] = ['es', 'en', 'zh'];
export const agendaFields = ['title', 'date', 'venue', 'category', 'description'] as const;
export const agendaFieldLabels = { title: 'Nom de l’événement', date: 'Dates à afficher', venue: 'Lieu', category: 'Catégorie', description: 'Présentation' };
export const agendaStatuses: Record<string, string> = { DRAFT: 'Brouillon', SCHEDULED: 'Programmé', LIVE: 'En ligne', ARCHIVED: 'Archivé' };
const empty = (): AgendaTranslation => ({ es: '', en: '', zh: '' });

export function newWebsiteEvent(monthKey: string, id: string): WebsiteEvent {
  return {
    id, sortDate: `${monthKey}-01`, sortTime: '', title: empty(), date: empty(), venue: empty(), category: empty(), description: empty(),
    url: '', sourceLabel: '', imageUrl: '', imageWidth: 720, imageHeight: 450,
  };
}

export function importCampaignEvents(campaign: NewsletterCampaign, monthKey: string, previous: WebsiteEvent[] = []) {
  return campaign.events.map(event => {
    const old = previous.find(item => item.id === event.id);
    const result = { ...newWebsiteEvent(monthKey, event.id), ...(old || {}) };
    for (const field of agendaFields) {
      const es = event[field] || '';
      result[field] = old?.[field]?.es === es ? { ...old[field] } : { es, en: '', zh: '' };
    }
    return {
      ...result, sortDate: event.sortDate || result.sortDate,
      sortTime: event.date.match(/·\s*([0-2]\d:[0-5]\d)/)?.[1] || result.sortTime,
      url: event.url || '', sourceLabel: event.sourceLabel || '', imageUrl: event.imageUrl || result.imageUrl,
    };
  });
}

export function draftIssues(events: WebsiteEvent[], monthKey: string) {
  const issues: string[] = [];
  const languages = { es: events.length > 0, en: events.length > 0, zh: events.length > 0 };
  if (!events.length) issues.push('Ajoutez au moins un événement.');
  for (const event of events) {
    const label = event.title.es || 'Événement sans nom';
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(event.sortDate) ? new Date(`${event.sortDate}T12:00:00Z`) : null;
    if (!parsed || !Number.isFinite(parsed.getTime()) || !parsed.toISOString().startsWith(event.sortDate) || !event.sortDate.startsWith(monthKey)) issues.push(`${label} : choisissez une date dans ce mois.`);
    try { if (new URL(event.url).protocol !== 'https:') throw new Error(); } catch { issues.push(`${label} : ajoutez le lien officiel HTTPS.`); }
    for (const lang of agendaLanguages) {
      const missing = agendaFields.filter(field => !event[field][lang].trim());
      if (missing.length) { languages[lang] = false; issues.push(`${label} · ${lang.toUpperCase()} : ${missing.map(field => agendaFieldLabels[field]).join(', ')}.`); }
    }
  }
  return { languages, issues };
}
