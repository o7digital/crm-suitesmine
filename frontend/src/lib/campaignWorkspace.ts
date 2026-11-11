import seed from './newsletterCampaigns.json';
import annualEventsSeed from './events2026.json';
import type { AnnualEvent } from '../app/admin/mail/CampaignTools';

export type NewsletterEvent = AnnualEvent;
export type NewsletterCampaign = Omit<(typeof seed.campaigns)[number], 'events'> & { bodyHtml?: string; events: NewsletterEvent[] };
const annualEvents = clone(annualEventsSeed) as AnnualEvent[];
export const campaignMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function campaignMonthKey(campaign: { month: string; year: number }) {
  const month = campaignMonths.indexOf(campaign.month.replace(/^\d+\s+/, ''));
  return month >= 0 && Number.isInteger(campaign.year) ? `${campaign.year}-${String(month + 1).padStart(2, '0')}` : '';
}

// Include the current Mexico City month and every later campaign, regardless of year.
export function campaignsForBufferSync(campaigns: NewsletterCampaign[], now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const month = `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
  return campaigns.filter(campaign => campaignMonthKey(campaign) >= month)
    .sort((left, right) => campaignMonthKey(left).localeCompare(campaignMonthKey(right)));
}

export function bufferSyncBatches(campaignIds: string[]) {
  return Array.from({ length: Math.ceil(campaignIds.length / 12) }, (_, index) => campaignIds.slice(index * 12, (index + 1) * 12));
}

export function createMonthlyCampaign(monthKey: string, template: NewsletterCampaign): NewsletterCampaign {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error('Choisissez un mois valide.');
  const [year, index] = monthKey.split('-').map(Number);
  const month = campaignMonths[index - 1];
  return {
    ...clone(template), id: `month-${monthKey}`, month, year, status: 'DRAFT', lastVerified: '',
    sendWindow: `Durante ${month.toLowerCase()} de ${year}`, goal: '', segment: '',
    subject: `Agenda de ${month.toLowerCase()} ${year} en CDMX`, preheader: 'Conciertos, cultura y experiencias para preparar tu próxima estancia.',
    headline: `${month} en Ciudad de México`, eyebrow: `Agenda Suites Mine · ${month} ${year}`,
    body: 'Hola {{firstName}},\n\nPrepara tu próxima escapada a Ciudad de México. Descubre la agenda del mes y elige tus fechas.',
    bodyHtml: undefined, events: [],
    mailchimp: { ...clone(template.mailchimp), tags: ['newsletter', month.toLowerCase()], utmCampaign: `newsletter_${monthKey}` },
  };
}

export function hydrateCampaigns(value: unknown): NewsletterCampaign[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === 'object' && typeof item.id === 'string').map((rawCampaign) => {
    const campaign = rawCampaign as NewsletterCampaign;
    return {
      ...campaign,
      events: Array.isArray(campaign.events)
        ? campaign.events.map((event) => {
            const catalogEvent = annualEvents.find((item) => item.id === event.id);
            return {
              ...(catalogEvent || {}),
              ...event,
              month: event.month || catalogEvent?.month || campaign.month,
              sortDate: event.sortDate || catalogEvent?.sortDate || '',
              imageUrl: event.imageUrl || catalogEvent?.imageUrl,
              posterUrl: event.posterUrl || catalogEvent?.posterUrl || event.url,
            } as NewsletterEvent;
          })
        : [],
    };
  });
}

export function mergeCampaignsWithSeed(value: unknown): NewsletterCampaign[] {
  const defaults = hydrateCampaigns(clone(seed.campaigns));
  const saved = hydrateCampaigns(value);
  const defaultIds = new Set(defaults.map((campaign) => campaign.id));
  const templates = [...defaults, ...saved.filter((campaign) => !defaultIds.has(campaign.id))];
  return templates.map((template) => {
    const draft = saved.find((campaign) => campaign.id === template.id);
    const refreshReady = draft?.status === 'READY' && !draft.bodyHtml && draft.lastVerified < template.lastVerified;
    const merged = draft && !refreshReady ? {
      ...template,
      ...draft,
      events: draft.events?.length ? draft.events : template.events,
      mailchimp: { ...template.mailchimp, ...draft.mailchimp },
    } as NewsletterCampaign : template;
    const refreshed = merged.month === 'Octubre' && defaultIds.has(merged.id)
      ? {
          ...merged,
          subject: template.subject,
          preheader: template.preheader,
          headline: template.headline,
          body: template.body,
          mailchimp: { ...merged.mailchimp, tags: template.mailchimp.tags },
        }
      : merged;
    const requiredEvents = annualEvents.filter(
      (event) => event.month === refreshed.month && event.sortDate.startsWith(`${refreshed.year}-`) && (event.category === 'Concierto' || event.category === 'Deporte'),
    );
    const existingIds = new Set(refreshed.events.map((event) => event.id));
    return {
      ...refreshed,
      events: [...refreshed.events, ...requiredEvents.filter((event) => !existingIds.has(event.id))]
        .sort((left, right) => {
          const featured = Number(right.id === 'formula-1-mexico-2026') - Number(left.id === 'formula-1-mexico-2026');
          return featured || (left.sortDate || '').localeCompare(right.sortDate || '');
        }),
    } as NewsletterCampaign;
  });
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
