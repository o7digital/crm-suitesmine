const pipelineId = 'demo-pipeline-guest-lifecycle';

export const demoUser = {
  id: 'demo-user-suites-mine',
  email: 'demo@suitesmine.local',
  name: 'Suites Mine Demo',
  tenantId: 'demo-suites-mine-hotel',
  tenantName: 'Suites Mine CRM',
};

export const demoPipelines = [
  { id: pipelineId, name: 'Guest Lifecycle', isDefault: true },
  { id: 'demo-pipeline-post-sales', name: 'Post Sales', isDefault: false },
];

export const demoStages = [
  { id: 'stage-newsletter', name: 'Newsletter capture', position: 1, probability: 0.1, status: 'OPEN', pipelineId },
  { id: 'stage-segmented', name: 'Segmented guest', position: 2, probability: 0.25, status: 'OPEN', pipelineId },
  { id: 'stage-campaign', name: 'Campaign planned', position: 3, probability: 0.45, status: 'OPEN', pipelineId },
  { id: 'stage-follow-up', name: 'Stay follow-up', position: 4, probability: 0.65, status: 'OPEN', pipelineId },
  { id: 'stage-return-booked', name: 'Return booked', position: 5, probability: 1, status: 'WON', pipelineId },
  { id: 'stage-no-response', name: 'No response', position: 6, probability: 0, status: 'LOST', pipelineId },
];

export const demoClients = [
  {
    id: 'client-camille',
    firstName: 'Camille',
    name: 'Durand',
    email: 'camille.durand@example.com',
    phone: '+33 6 22 45 10 18',
    company: 'Repeat leisure guest',
    companySector: 'Wellness stays',
    clientStatus: 'CLIENT',
    notes: 'Visited twice in 2025. Interested in spa weekends and quiet rooms.',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'client-mateo',
    firstName: 'Mateo',
    name: 'Rodriguez',
    email: 'mateo.rodriguez@example.com',
    phone: '+52 55 3488 9021',
    company: 'Corporate traveler',
    companySector: 'Consulting',
    clientStatus: 'PROSPECT',
    notes: 'Monthly business trips, prefers invoice-ready reservations and airport transfer.',
    createdAt: '2026-07-03T10:00:00.000Z',
    updatedAt: '2026-07-03T10:00:00.000Z',
  },
  {
    id: 'client-sofia',
    firstName: 'Sofia',
    name: 'Mendes',
    email: 'sofia.mendes@example.com',
    phone: '+351 91 224 5710',
    company: 'Family guest',
    companySector: 'Family travel',
    clientStatus: 'CLIENT',
    notes: 'Booked family room last summer. Target with school holiday package.',
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z',
  },
  {
    id: 'client-nadia',
    firstName: 'Nadia',
    name: 'Benali',
    email: 'nadia.benali@example.com',
    phone: '+212 6 41 02 67 90',
    company: 'Couple getaway',
    companySector: 'Leisure',
    clientStatus: 'PROSPECT',
    notes: 'Downloaded romantic weekend offer from public landing page.',
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:00:00.000Z',
  },
  {
    id: 'client-jonas',
    firstName: 'Jonas',
    name: 'Weber',
    email: 'jonas.weber@example.com',
    phone: '+49 151 4471 8802',
    company: 'Loyalty guest',
    companySector: 'Food and beverage',
    clientStatus: 'CLIENT',
    notes: 'Restaurant-focused guest. High likelihood for dinner credit campaign.',
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
];

export const demoDeals = [
  { id: 'deal-spa', title: 'Spa weekend reactivation', value: 1240, currency: 'USD', probability: 0.45, clientId: 'client-camille', pipelineId, stageId: 'stage-campaign' },
  { id: 'deal-corporate', title: 'Q4 corporate long-stay package', value: 4800, currency: 'USD', probability: 0.25, clientId: 'client-mateo', pipelineId, stageId: 'stage-segmented' },
  { id: 'deal-family', title: 'Family summer return booking', value: 1850, currency: 'USD', probability: 0.65, clientId: 'client-sofia', pipelineId, stageId: 'stage-follow-up' },
  { id: 'deal-romantic', title: 'Romantic suite upsell', value: 960, currency: 'USD', probability: 0.1, clientId: 'client-nadia', pipelineId, stageId: 'stage-newsletter' },
  { id: 'deal-dinner', title: 'Return dinner loyalty campaign', value: 420, currency: 'USD', probability: 1, clientId: 'client-jonas', pipelineId, stageId: 'stage-return-booked' },
];

export const demoTasks = [
  { id: 'task-spa', title: 'Send personalized spa weekend newsletter', status: 'PENDING', clientId: 'client-camille', dueDate: '2026-07-21T15:00:00.000Z', amount: 1240, currency: 'USD' },
  { id: 'task-corporate', title: 'Qualify corporate rate and billing needs', status: 'PENDING', clientId: 'client-mateo', dueDate: '2026-07-22T15:00:00.000Z', amount: 4800, currency: 'USD' },
  { id: 'task-family', title: 'Follow up after family package email open', status: 'IN_PROGRESS', clientId: 'client-sofia', dueDate: '2026-07-23T15:00:00.000Z', amount: 1850, currency: 'USD' },
  { id: 'task-dinner', title: 'Prepare welcome-back note for arrival', status: 'DONE', clientId: 'client-jonas', dueDate: '2026-07-18T15:00:00.000Z', amount: 420, currency: 'USD' },
];

export function demoApiResponse(path: string, init?: RequestInit): unknown {
  const cleanPath = path.split('?')[0];
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET') return { ok: true };

  if (cleanPath === '/dashboard') {
    return {
      clients: 3,
      prospects: 2,
      tasks: { PENDING: 2, IN_PROGRESS: 1, DONE: 1 },
      leads: {
        open: 4,
        total: 5,
        openUsd: 8850,
        amountUsd: 9270,
        openByCurrency: [{ currency: 'USD', count: 4, amount: 8850 }],
        openValueUsd: 8850,
        fx: { date: '2026-07-14', provider: 'demo', missingCurrencies: [], error: null },
      },
      invoices: { total: 2, amount: 3270, recent: [] },
    };
  }
  if (cleanPath === '/pipelines') return demoPipelines;
  if (cleanPath === '/stages') return demoStages;
  if (cleanPath === '/deals') return demoDeals;
  if (cleanPath === '/clients') return demoClients;
  if (cleanPath === '/tasks') return demoTasks;
  if (cleanPath === '/products') return [];
  if (cleanPath === '/invoices') return [];
  if (cleanPath === '/admin/users') return [demoUser];
  if (cleanPath === '/tenant/branding') return { branding: {
    logoDataUrl: null,
    backgroundColor: '#10211f',
    surfaceColor: '#17312f',
    cardColor: '#213b38',
    foregroundColor: '#f8fafc',
    mutedColor: '#b7c8c3',
    accentColor: '#d8b36a',
    accentColor2: '#38c6b4',
  } };
  if (cleanPath === '/tenant/settings') return { settings: { crmMode: 'B2C', industry: 'HOTEL', crmDisplayCurrency: 'USD' } };
  if (cleanPath === '/fx/usd') return { base: 'USD', date: '2026-07-14', provider: 'demo', rates: { USD: 1, EUR: 0.92, MXN: 18.2, CAD: 1.36 } };
  if (path.startsWith('/export/')) return 'name,email,status\nCamille Durand,camille.durand@example.com,CLIENT\nMateo Rodriguez,mateo.rodriguez@example.com,PROSPECT\n';

  return {};
}
