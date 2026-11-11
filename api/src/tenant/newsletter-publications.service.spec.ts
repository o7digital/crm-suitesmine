import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NewsletterPublicationsService, newsletterSnapshot } from './newsletter-publications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishNewsletterDto } from './dto/publish-newsletter.dto';

const user = { userId: 'owner', tenantId: 'mine', email: 'owner@example.com' };
const dto = (): PublishNewsletterDto => ({
  campaignId: 'noviembre',
  campaign: {
    month: 'Noviembre', year: 2026, headline: 'Una escapada', subject: 'Agenda',
    body: 'Hola {{firstName}},', bodyHtml: '<p>Hola {{firstName}}, <strong>bienvenido</strong></p>',
    heroImage: 'https://example.com/hotel.jpg', ctaUrl: 'https://example.com/reservar',
    segment: 'Confidential targeting', goal: 'Internal goal', mailchimp: { apiKey: 'secret' },
    events: [{ id: 'concert', title: 'Concierto', socialText: 'Unapproved Buffer draft', url: 'https://example.com/tickets' }],
  },
  branding: { address: 'Reforma', gallery: ['https://example.com/hotel.jpg'], smtp: { password: 'secret' }, buffer: { apiKey: 'secret' } },
});

describe('Public newsletter snapshots', () => {
  it('publishes only public fields and replaces recipient placeholders', () => {
    const snapshot = newsletterSnapshot(dto());
    expect(snapshot.monthKey).toBe('2026-11');
    expect(snapshot.campaign.bodyHtml).toBe('<p>Hola viajero, <strong>bienvenido</strong></p>');
    expect(JSON.stringify(snapshot)).not.toMatch(/secret|Internal goal|Confidential|Unapproved/);
  });

  it('removes active HTML, CSS, event handlers and unsafe links', () => {
    const input = dto();
    input.campaign.bodyHtml = '<script>alert(1)</script><svg onload="alert(1)"></svg><p style="position:fixed" onclick="alert(1)">Texto <a href="javascript:alert(1)">link</a><a href="//evil.test">otro</a></p>';
    input.campaign.ctaUrl = 'javascript:alert(1)';
    input.campaign.heroImage = 'data:image/svg+xml,<svg onload="alert(1)"/>';
    const snapshot = newsletterSnapshot(input);
    expect(snapshot.campaign.bodyHtml).toBe('<p>Texto <a>link</a><a>otro</a></p>');
    expect(snapshot.campaign.ctaUrl).toBe('');
    expect(snapshot.campaign.heroImage).toBe('');
  });

  it.each([{ year: 2027, month: 'Enero' }, { year: 2027, month: 'Febrero' }])('keeps the campaign year for $month', ({ year, month }) => {
    const input = dto(); Object.assign(input.campaign, { year, month });
    expect(newsletterSnapshot(input).monthKey).toBe(month === 'Enero' ? '2027-01' : '2027-02');
  });

  it('rejects campaigns without a valid month, year or title', () => {
    for (const patch of [{ month: 'Unknown' }, { year: 0 }, { headline: '' }]) {
      const input = dto(); Object.assign(input.campaign, patch);
      expect(() => newsletterSnapshot(input)).toThrow(BadRequestException);
    }
  });

  it('also supports the special 16 Septiembre edition', () => {
    const input = dto(); input.campaign.month = '16 Septiembre';
    expect(newsletterSnapshot(input).monthKey).toBe('2026-09');
  });
});

describe('Publication access and persistence', () => {
  const makeService = (role = 'OWNER') => {
    const records = new Map<string, any>();
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ role }) },
      newsletterPublication: {
        upsert: jest.fn(async ({ where, create, update }) => {
          const key = `${where.tenantId_campaignId.tenantId}:${where.tenantId_campaignId.campaignId}`;
          const previous = records.get(key);
          const record = structuredClone(previous ? { ...previous, ...update } : { ...create, id: `public-${records.size}`, updatedAt: new Date() });
          records.set(key, record);
          return record;
        }),
        findMany: jest.fn(async ({ where }) => [...records.values()].filter((record) => record.tenantId === where.tenantId)),
        findUnique: jest.fn(async ({ where }) => where.tenantId_campaignId
          ? records.get(`${where.tenantId_campaignId.tenantId}:${where.tenantId_campaignId.campaignId}`) || null
          : [...records.values()].find((record) => record.id === where.id) || null),
      },
    };
    return { service: new NewsletterPublicationsService(prisma as unknown as PrismaService), prisma };
  };

  it('keeps a shared URL stable and changes the snapshot only on explicit publication', async () => {
    const { service } = makeService();
    const draft = dto();
    const first = await service.publish(draft, user);
    draft.campaign.headline = 'Nouvelle version';
    expect((await service.read(first.id)).snapshot.campaign.headline).toBe('Una escapada');
    const second = await service.publish(draft, user);
    expect(second.id).toBe(first.id);
    expect((await service.read(first.id)).snapshot.campaign.headline).toBe('Nouvelle version');
  });

  it('isolates publication lists and campaign IDs across workspaces', async () => {
    const { service, prisma } = makeService();
    const first = await service.publish(dto(), user);
    const other = { ...user, tenantId: 'other-workspace' };
    const second = await service.publish(dto(), other);
    expect(first.id).not.toBe(second.id);
    await service.list(other);
    expect(prisma.newsletterPublication.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: other.tenantId } }));
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: other.userId, tenantId: other.tenantId } }));
  });

  it('keeps an existing shared URL when the campaign month is changed accidentally', async () => {
    const { service } = makeService();
    const draft = dto();
    const first = await service.publish(draft, user);
    draft.campaign.month = 'Diciembre';
    await expect(service.publish(draft, user)).rejects.toThrow(BadRequestException);
    expect((await service.read(first.id)).monthKey).toBe('2026-11');
  });

  it('prevents members from publishing or listing admin publications', async () => {
    const { service, prisma } = makeService('MEMBER');
    await expect(service.publish(dto(), user)).rejects.toThrow(ForbiddenException);
    await expect(service.list(user)).rejects.toThrow(ForbiddenException);
    expect(prisma.newsletterPublication.upsert).not.toHaveBeenCalled();
  });

  it('returns 404 for an unpublished URL', async () => {
    const { service } = makeService();
    await expect(service.read('unknown')).rejects.toThrow(NotFoundException);
  });
});
