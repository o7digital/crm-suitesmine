import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { BufferSyncService } from './buffer-sync.service';

describe('Marketing workspace persistence', () => {
  it('retains campaign year, event date and edited social copy across saves', () => {
    const service = new TenantService(
      {} as PrismaService,
      {} as BufferSyncService,
    );
    const setup = (service as any).sanitizeMarketingSetup({
      provider: 'MAILCHIMP',
      newsletterCampaigns: [
        {
          id: 'enero',
          month: 'Enero',
          year: 2027,
          events: [
            {
              id: 'concert',
              title: 'Concierto',
              month: 'Enero',
              sortDate: '2027-01-16',
              socialText: 'Texto aprobado para Buffer',
            },
          ],
        },
      ],
    });
    expect(setup.newsletterCampaigns[0].year).toBe(2027);
    expect(setup.newsletterCampaigns[0].events[0]).toMatchObject({
      month: 'Enero',
      sortDate: '2027-01-16',
      socialText: 'Texto aprobado para Buffer',
    });
  });
  it('retains more than a year of campaigns and over twenty events', () => {
    const service = new TenantService({} as PrismaService, {} as BufferSyncService);
    const campaigns = Array.from({ length: 24 }, (_, i) => ({ id: `month-${i}`, month: 'Marzo', year: 2027, events: Array.from({ length: 30 }, (_, j) => ({ id: `event-${j}`, title: 'Evento' })) }));
    const result = (service as any).sanitizeMarketingSetup({ provider: 'MAILCHIMP', newsletterCampaigns: campaigns });
    expect(result.newsletterCampaigns).toHaveLength(24);
    expect(result.newsletterCampaigns[23].events).toHaveLength(30);
  });

});
