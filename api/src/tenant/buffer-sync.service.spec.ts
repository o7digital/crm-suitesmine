import {
  BufferSyncService,
  crmHash,
  remoteHash,
  socialTextForEvent,
  type RemotePost,
} from './buffer-sync.service';
import { PrismaService } from '../prisma/prisma.service';
const event = {
  id: 'tamayo-enero',
  title: 'Arquitectura',
  date: 'Hasta febrero',
  venue: 'Tamayo',
  url: 'https://museum.example/expo',
  imageUrl: 'https://museum.example/poster.jpg',
  sortDate: '2027-01-01',
};
const campaign = { id: 'enero', month: 'Enero', year: 2027, events: [event] };
const workspace = {
  organization: { id: 'org', name: 'Hotel' },
  channels: [{ id: 'instagram', service: 'instagram', name: 'Hotel' }],
};
const post = (patch: Partial<RemotePost> = {}): RemotePost => ({
  id: 'post',
  channelId: 'instagram',
  text: socialTextForEvent(event),
  status: 'draft',
  dueAt: '2027-01-02T15:00:00Z',
  assets: [{ source: event.imageUrl }],
  ...patch,
});
function setup(remote: RemotePost[] = [], linked = false) {
  let posts = [...remote];
  const links: any[] = linked
    ? [
        {
          id: 'link',
          tenantId: 'tenant',
          organizationId: 'org',
          campaignId: 'enero',
          eventId: event.id,
          channelId: 'instagram',
          postId: 'post',
          crmHash: crmHash(event),
          remoteHash: remoteHash(post()),
          syncedAt: new Date(),
        },
      ]
    : [];
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
    bufferPostLink: {
      findMany: jest.fn(async () => links),
      findFirst: jest.fn(async ({ where }) =>
        links.find(
          (link) =>
            link.tenantId === where.tenantId &&
            link.organizationId === where.organizationId &&
            link.postId === where.postId,
        ),
      ),
      update: jest.fn(async ({ where, data }) =>
        Object.assign(
          links.find((link) => link.id === where.id),
          data,
        ),
      ),
      create: jest.fn(async ({ data }) => {
        links.push({ id: 'link', ...data, syncedAt: new Date() });
      }),
      upsert: jest.fn(async ({ create, update }) => {
        const existing = links.find(
          (link) =>
            link.eventId === create.eventId &&
            link.channelId === create.channelId,
        );
        if (existing) Object.assign(existing, update);
        else links.push({ id: 'link', ...create, syncedAt: new Date() });
      }),
    },
    tenant: {
      findUniqueOrThrow: jest.fn(async () => ({
        marketingSetup: {
          newsletterCampaigns: [{ ...campaign, events: [{ ...event }] }],
        },
      })),
      update: jest.fn(async () => ({})),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(async (callback) => callback(tx)),
  };
  const request = jest.fn(async (query: string): Promise<any> => {
    if (query.includes('posts(first:'))
      return {
        posts: {
          edges: posts.map((node) => ({ node })),
          pageInfo: { hasNextPage: false },
        },
      };
    const text = JSON.parse(query.match(/text: ("(?:\\.|[^"\\])*")/)![1]);
    if (query.includes('editPost(')) {
      posts = posts.map((item) =>
        item.id === 'post'
          ? { ...item, text, assets: [{ source: event.imageUrl }] }
          : item,
      );
      return { editPost: { post: posts.find((item) => item.id === 'post') } };
    }
    const created = post({ id: 'new-post', text });
    posts.push(created);
    return { createPost: { post: created } };
  });
  return {
    service: new BufferSyncService(prisma as unknown as PrismaService),
    request,
    tx,
  };
}
describe('Buffer synchronization', () => {
  it('imports a Buffer edit into the CRM and acknowledges that version', async () => {
    const { service, request, tx } = setup(
      [post({ text: 'Version approuvée Buffer' })],
      true,
    );
    expect(
      await service.importPost('tenant', 'post', workspace, request),
    ).toMatchObject({
      eventId: event.id,
      socialText: 'Version approuvée Buffer',
    });
    expect(tx.tenant.update).toHaveBeenCalled();
    expect(tx.bufferPostLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remoteHash: remoteHash(post({ text: 'Version approuvée Buffer' })),
        }),
      }),
    );
  });
  it('rejects imports for another tenant before reading Buffer', async () => {
    const { service, request } = setup([post()], true);
    await expect(
      service.importPost('another-tenant', 'post', workspace, request),
    ).rejects.toThrow('pas relié');
    expect(request).not.toHaveBeenCalled();
  });
  it('creates drafts once and repeats without duplicates', async () => {
    const { service, request } = setup();
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('created');
    const mutation = request.mock.calls.find(([query]) =>
      query.includes('createPost('),
    )![0];
    expect(mutation).toContain('saveToDraft: true');
    expect(mutation).toContain('2027-01-01T15:00:00.000Z');
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('unchanged');
    expect(
      request.mock.calls.filter(([query]) => query.includes('createPost(')),
    ).toHaveLength(1);
  });
  it('adopts a dated draft and updates content without changing its planning date', async () => {
    const { service, request } = setup([
      post({ text: 'Arquitectura ancien texte https://museum.example/expo' }),
    ]);
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('updated');
    expect(
      request.mock.calls.some(([query]) => query.includes('createPost(')),
    ).toBe(false);
    expect(
      request.mock.calls.find(([query]) => query.includes('editPost('))![0],
    ).not.toMatch(/mode:|dueAt:|saveToDraft:/);
  });
  it('updates image-only CRM changes', async () => {
    const { service, request } = setup([post()], true);
    await service.sync(
      'tenant',
      [
        {
          ...campaign,
          events: [{ ...event, imageUrl: 'https://museum.example/new.jpg' }],
        },
      ],
      workspace,
      request,
    );
    expect(
      request.mock.calls.some(
        ([query]) => query.includes('editPost(') && query.includes('new.jpg'),
      ),
    ).toBe(true);
  });
  it('preserves Buffer edits and reports their actual content', async () => {
    const { service, request } = setup([post({ text: 'Buffer édité' })], true);
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('remote_changed');
    expect(request).toHaveBeenCalledTimes(1);
    const state = await service.status('tenant', workspace, request);
    expect(state.posts[0].changedInBuffer).toBe(true);
    expect(state.posts[0].text).toBe('Buffer édité');
  });
  it('reports simultaneous edits as a conflict', async () => {
    const { service, request } = setup([post({ text: 'Buffer édité' })], true);
    expect(
      (
        await service.sync(
          'tenant',
          [{ ...campaign, events: [{ ...event, venue: 'Nouveau lieu' }] }],
          workspace,
          request,
        )
      ).results[0].action,
    ).toBe('conflict');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each(['scheduled', 'sent', 'error'])(
    'preserves %s posts',
    async (status) => {
      const { service, request } = setup([post({ status })]);
      expect(
        (await service.sync('tenant', [campaign], workspace, request))
          .results[0].action,
      ).toBe('protected');
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it('does not recreate a deleted linked post', async () => {
    const { service, request } = setup([], true);
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('conflict');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('refuses ambiguous undated drafts', async () => {
    const { service, request } = setup([post({ dueAt: null })]);
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .action,
    ).toBe('conflict');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('fetches every page before deciding a post is missing', async () => {
    const { service, request } = setup();
    request.mockImplementationOnce(async () => ({
      posts: { edges: [], pageInfo: { hasNextPage: true, endCursor: 'page2' } },
    }));
    request.mockImplementationOnce(async () => ({
      posts: { edges: [{ node: post() }], pageInfo: { hasNextPage: false } },
    }));
    expect(
      (await service.sync('tenant', [campaign], workspace, request)).results[0]
        .postId,
    ).toBe('post');
    expect(
      request.mock.calls.some(([query]) => query.includes('createPost(')),
    ).toBe(false);
    expect(request.mock.calls[1][0]).toContain('after: "page2"');
  });
  it('prevents concurrent writes across application instances', async () => {
    const { service, request, tx } = setup();
    tx.$queryRaw.mockResolvedValue([{ locked: false }]);
    await expect(
      service.sync('tenant', [campaign], workspace, request),
    ).rejects.toThrow('déjà en cours');
    expect(request).not.toHaveBeenCalled();
  });
});
