import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WebsiteAgendasService } from './website-agendas.service';
import { allowedImageUrl, cleanWebsiteEvents, websiteMonth } from './website-agenda-data';
const user = { userId: 'owner', tenantId: 'mine', email: 'owner@example.com' };
const tr = (v: string) => ({ es: v, en: `English ${v}`, zh: `中文 ${v}` });
const event = () => ({ id: 'new-concert', sortDate: '2027-03-12', sortTime: '21:00', title: tr('Concierto'), date: tr('12 marzo'), venue: tr('Estadio GNP'), category: tr('Música'), description: tr('CDMX'), url: 'https://www.ticketmaster.com.mx/', imageUrl: 'https://media.ticketmaster.com/photo.jpg', internalToken: 'private' });
function setup(role = 'OWNER') {
  let rows: any[] = []; let revision = 0;
  const agenda = { id: 'feed', siteKey: 'kepler', tenantId: 'mine' };
  const prisma: any = {
    user: { findFirst: jest.fn().mockResolvedValue({ role }) },
    websiteAgenda: { findFirst: jest.fn(async ({ where }) => where.tenantId === 'mine' ? agenda : null), findUnique: jest.fn(async () => agenda) },
    websiteAgendaMonth: {
      findUnique: jest.fn(async ({ where }) => rows.find(r => where.id ? r.id === where.id : r.monthKey === where.agendaId_monthKey.monthKey) || null),
      create: jest.fn(async ({ data }) => { const row = { ...structuredClone(data), id: `row-${rows.length}`, updatedAt: new Date(++revision * 1000), approvedAt: null, approved: null }; rows.push(row); return row; }),
      updateMany: jest.fn(async ({ where, data }) => { const row = rows.find(r => r.id === where.id && r.updatedAt.getTime() === where.updatedAt.getTime()); if (!row) return { count: 0 }; Object.assign(row, structuredClone(data), { updatedAt: new Date(++revision * 1000) }); return { count: 1 }; }),
      findUniqueOrThrow: jest.fn(async ({ where }) => rows.find(r => r.id === where.id)),
    },
    $transaction: jest.fn(async fn => { const before = structuredClone(rows); try { return await fn(prisma); } catch (e) { rows = before; throw e; } }),
  };
  const publications = { publish: jest.fn().mockResolvedValue({}) };
  const service = new WebsiteAgendasService(prisma, publications as any);
  const save = (events = [event()], expectedUpdatedAt?: string) => service.save('feed', '2027-03', { campaignId: 'campaign', events, expectedUpdatedAt }, user);
  return { service, prisma, publications, save };
}
describe('Validated website agendas', () => {
  it('keeps drafts private and activates an arbitrary new month at midnight Mexico City', async () => {
    const { service, save } = setup(); const draft = await save();
    expect((await service.current('feed', new Date('2027-03-12T12:00:00Z'))).events).toEqual([]);
    await service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString() }, user);
    expect(await service.current('feed', new Date('2027-03-01T05:59:59Z'))).toMatchObject({ monthKey: '2027-02', available: false, events: [] });
    const live = await service.current('feed', new Date('2027-03-01T06:00:00Z'));
    expect(live).toMatchObject({ monthKey: '2027-03', available: true });
    expect(live.events[0].title.zh).toContain('中文');
    expect(JSON.stringify(live)).not.toContain('internalToken');
    expect(live.events[0].imageUrl).toMatch(/\/images\/2027-03\/\d+\/new-concert.webp$/);
    expect((await service.current('feed', new Date('2027-04-01T06:00:00Z'))).events).toEqual([]);
  });
  it('preserves approved content while edits remain private', async () => {
    const { service, save } = setup(); const first = await save();
    const approved = await service.approve('feed', '2027-03', { expectedUpdatedAt: first.updatedAt.toISOString() }, user);
    const changed = event(); changed.description.en = 'Private draft';
    const draft = await save([changed], approved.updatedAt.toISOString());
    expect(draft.hasPendingChanges).toBe(true);
    expect((await service.current('feed', new Date('2027-03-12T12:00:00Z'))).events[0].description.en).not.toContain('Private');
    await service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString() }, user);
    expect((await service.current('feed', new Date('2027-03-12T12:00:00Z'))).events[0].description.en).toBe('Private draft');
  });
  it('rejects incomplete translations, invalid dates, times and official links', async () => {
    for (const patch of [{ description: { es: 'Uno', en: '', zh: '' } }, { sortDate: '2027-04-12' }, { sortDate: '2027-03-32' }, { url: 'javascript:alert(1)' }, { sortTime: '24:00' }]) {
      const { service, save } = setup(); const draft = await save([{ ...event(), ...patch } as any]);
      await expect(service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString() }, user)).rejects.toThrow(BadRequestException);
    }
  });
  it('rejects stale versions and concurrent approval updates', async () => {
    const { service, save, prisma } = setup(); const draft = await save(); const version = draft.updatedAt.toISOString();
    await save([event()], version);
    await expect(save([event()], version)).rejects.toThrow(ConflictException);
    await expect(service.approve('feed', '2027-03', { expectedUpdatedAt: version }, user)).rejects.toThrow(ConflictException);
    const current = await service.readDraft('feed', '2027-03', user);
    prisma.websiteAgendaMonth.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.approve('feed', '2027-03', { expectedUpdatedAt: current.updatedAt.toISOString() }, user)).rejects.toThrow(ConflictException);
  });
  it('requires an administrator and isolates workspace bindings', async () => {
    await expect(setup('MEMBER').save()).rejects.toThrow(ForbiddenException);
    await expect(setup().service.readDraft('feed', '2027-03', { ...user, tenantId: 'other' })).rejects.toThrow(NotFoundException);
  });
  it('creates the review link transactionally and rolls back failed publication', async () => {
    const { service, save, publications, prisma } = setup(); const draft = await save();
    const newsletter = { campaignId: 'campaign', campaign: { month: 'Marzo', year: 2027, headline: 'Agenda' }, branding: {} };
    publications.publish.mockRejectedValueOnce(new Error('Publication failed'));
    await expect(service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString(), newsletter }, user)).rejects.toThrow('Publication failed');
    expect((await service.current('feed', new Date('2027-03-12T12:00:00Z'))).available).toBe(false);
    await service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString(), newsletter }, user);
    expect(publications.publish).toHaveBeenLastCalledWith(newsletter, user, prisma);
  });
  it('hides future and draft images and validates approved image revisions', async () => {
    const { service, save } = setup(); const draft = await save();
    await expect(service.imageSource('feed', '2027-03', '0', 'new-concert', new Date('2027-03-10T12:00:00Z'))).rejects.toThrow(NotFoundException);
    const approved = await service.approve('feed', '2027-03', { expectedUpdatedAt: draft.updatedAt.toISOString() }, user);
    const version = approved.approvedAt.getTime().toString();
    await expect(service.imageSource('feed', '2027-03', version, 'new-concert', new Date('2027-02-12T12:00:00Z'))).rejects.toThrow(NotFoundException);
    expect(await service.imageSource('feed', '2027-03', version, 'new-concert', new Date('2027-03-12T12:00:00Z'))).toMatchObject({ siteKey: 'kepler', imageUrl: event().imageUrl });
  });
  it('allows trusted image URLs only and bounds event data', () => {
    for (const source of ['http://127.0.0.1/x', 'https://169.254.169.254/x', 'https://media.ticketmaster.com.evil.test/x', 'https://user:password@media.ticketmaster.com/x']) expect(() => allowedImageUrl(source, 'kepler')).toThrow();
    expect(allowedImageUrl('/assets/events/photo.webp', 'kepler').origin).toBe('https://www.businesssuiteskepler.com');
    expect(() => cleanWebsiteEvents(Array.from({ length: 101 }, () => event()))).toThrow();
    expect(websiteMonth(new Date('2027-01-01T05:59:59Z'))).toBe('2026-12');
  });
});
