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

describe('Instagram media when scheduling from the CRM', () => {
  it('uses the prepared image only on Instagram and preserves the requested date and text', async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    const prisma = { tenant: { findFirst: jest.fn().mockResolvedValue({ marketingSetup: null }) }, $transaction: jest.fn(async fn => fn(tx)) };
    const buffer = { imageForChannel: jest.fn(async (source, channel) => channel === 'instagram' ? 'https://images.example/prepared.jpg' : source) };
    const service = new TenantService(prisma as unknown as PrismaService, buffer as unknown as BufferSyncService);
    jest.spyOn(service as any, 'ensureAdmin').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'loadBufferWorkspace').mockResolvedValue({ config: { apiKey: 'test' }, organization: { id: 'org' }, channels: [{ id: 'ig', service: 'instagram' }, { id: 'fb', service: 'facebook' }] });
    const request = jest.spyOn(service as any, 'bufferRequest').mockResolvedValue({ createPost: { post: { id: 'post', dueAt: '2099-01-01T15:00:00.000Z' } } });
    const result = await service.createBufferPost({ text: 'Caption kept', imageUrl: 'https://media.ticketmaster.com/source.jpg', channelIds: ['ig', 'fb'], mode: 'custom', dueAt: '2099-01-01T15:00:00.000Z' }, { userId: 'owner', tenantId: 'tenant' });
    expect(result.ok).toBe(true);
    expect(request.mock.calls[0][1]).toContain('https://images.example/prepared.jpg');
    expect(request.mock.calls[1][1]).toContain('https://media.ticketmaster.com/source.jpg');
    for (const [, query] of request.mock.calls) {
      expect(query).toContain('Caption kept'); expect(query).toContain('2099-01-01T15:00:00.000Z');
    }
  });
});
