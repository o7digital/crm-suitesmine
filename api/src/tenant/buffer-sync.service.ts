import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type SyncEvent = {
  id: string;
  title: string;
  date: string;
  venue: string;
  url: string;
  month?: string;
  sortDate?: string;
  imageUrl?: string;
  socialText?: string;
};
export type SyncCampaign = {
  id: string;
  month: string;
  year?: number;
  events: SyncEvent[];
};
export type RemotePost = {
  id: string;
  channelId: string;
  text: string;
  status: string;
  dueAt: string | null;
  assets: Array<{ source: string }>;
};
export type BufferWorkspace = {
  organization: { id: string; name: string };
  channels: Array<{ id: string; service: string; name: string }>;
};
export type BufferRequest = <T>(query: string) => Promise<T>;
export const postFields = 'id channelId text status dueAt assets { source }';

export function socialTextForEvent(event: SyncEvent) {
  if (event.socialText) return event.socialText;
  if (event.id === 'grito-independencia-zocalo-2026') {
    return `🇲🇽 Celebra el Grito de Independencia en el corazón de Ciudad de México.\n\n📅 ${event.date}\n📍 ${event.venue}\n\nVive las Fiestas Patrias desde Suites Mine, a solo dos calles del Ángel de la Independencia.\n\nInformación oficial: ${event.url}\nReserva tu estancia: https://www.suitesmine.com/`;
  }
  if (event.id === 'desfile-civico-militar-2026') {
    return `🇲🇽 Este 16 de septiembre, vive el tradicional Desfile Cívico Militar en Ciudad de México.\n\n📍 ${event.venue}\n\nSuites Mine te espera junto a Paseo de la Reforma para disfrutar la celebración y descansar cerca de la ruta.\n\nInformación oficial: ${event.url}\nReserva tu estancia: https://www.suitesmine.com/`;
  }
  return `${event.title} llega a CDMX ✨\n\n📅 ${event.date}\n📍 ${event.venue}\n\nHaz de Suites Mine tu punto de partida, a solo dos calles del Ángel de la Independencia.\n\nInformación oficial: ${event.url}\nReserva tu estancia: https://www.suitesmine.com/`;
}

function hash(text: string, images: string[]) {
  return createHash('sha256')
    .update(JSON.stringify([text.trim(), images]))
    .digest('hex');
}
export const remoteHash = (post: RemotePost) =>
  hash(
    post.text,
    post.assets.map((asset) => asset.source),
  );
export const crmHash = (event: SyncEvent) =>
  hash(socialTextForEvent(event), event.imageUrl ? [event.imageUrl] : []);

@Injectable()
export class BufferSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async posts(organizationId: string, request: BufferRequest) {
    const posts: RemotePost[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 50; page++) {
      const result: {
        posts: {
          edges: Array<{ node: RemotePost }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      } = await request(
        `query SyncPosts { posts(first: 100, ${cursor ? `after: ${JSON.stringify(cursor)},` : ''} input: { organizationId: ${JSON.stringify(organizationId)} }) { edges { node { ${postFields} } } pageInfo { hasNextPage endCursor } } }`,
      );
      posts.push(...result.posts.edges.map((edge) => edge.node));
      if (!result.posts.pageInfo.hasNextPage) return posts;
      const next = result.posts.pageInfo.endCursor;
      if (!next || next === cursor)
        throw new BadRequestException(
          'Buffer: pagination incomplète, synchronisation arrêtée.',
        );
      cursor = next;
    }
    throw new BadRequestException(
      'Buffer: trop de posts pour une synchronisation complète.',
    );
  }

  async status(
    tenantId: string,
    workspace: BufferWorkspace,
    request: BufferRequest,
  ) {
    const posts = await this.posts(workspace.organization.id, request);
    const links = await this.prisma.bufferPostLink.findMany({
      where: { tenantId, organizationId: workspace.organization.id },
    });
    return {
      checkedAt: new Date().toISOString(),
      posts: links.map((link) => {
        const post = posts.find((item) => item.id === link.postId);
        return {
          eventId: link.eventId,
          campaignId: link.campaignId,
          channelId: link.channelId,
          service:
            workspace.channels.find((channel) => channel.id === link.channelId)
              ?.service || '',
          postId: link.postId,
          status: post?.status || 'missing',
          dueAt: post?.dueAt || null,
          text: post?.text || '',
          changedInBuffer: !!post && remoteHash(post) !== link.remoteHash,
          syncedAt: link.syncedAt.toISOString(),
        };
      }),
    };
  }

  async sync(
    tenantId: string,
    campaigns: SyncCampaign[],
    workspace: BufferWorkspace,
    request: BufferRequest,
  ) {
    if (!campaigns.length)
      throw new BadRequestException('Aucune campagne à synchroniser.');
    // A database lock serializes syncs across instances. Fetch again only after acquiring it.
    return this.prisma.$transaction(
      async (tx) => {
        const lock = await tx.$queryRaw<
          Array<{ locked: boolean }>
        >`SELECT pg_try_advisory_xact_lock(hashtext(${`buffer-sync:${tenantId}`})) AS locked`;
        if (!lock[0]?.locked)
          throw new ConflictException(
            'Une synchronisation Buffer est déjà en cours.',
          );
        const posts = await this.posts(workspace.organization.id, request);
        const links = await tx.bufferPostLink.findMany({
          where: { tenantId, organizationId: workspace.organization.id },
        });
        const claimed = new Set(links.map((link) => link.postId));
        const processed = new Set<string>();
        const results: Array<{
          eventId: string;
          channelId: string;
          postId?: string;
          action: string;
          status?: string;
          message?: string;
        }> = [];
        for (const campaign of campaigns)
          for (const event of campaign.events)
            for (const channel of workspace.channels) {
              const key = `${event.id}:${channel.id}`;
              if (processed.has(key)) continue;
              processed.add(key);
              const result = { eventId: event.id, channelId: channel.id };
              const link = links.find(
                (item) =>
                  item.eventId === event.id && item.channelId === channel.id,
              );
              let post = link
                ? posts.find((item) => item.id === link.postId)
                : undefined;
              try {
                // Losing an existing remote post is a conflict, never an excuse to repost it.
                if (link && !post)
                  throw new Error(
                    'Post supprimé dans Buffer ; recréation automatique désactivée.',
                  );
                if (!link) {
                  const period = event.sortDate?.slice(0, 7);
                  const candidates = posts.filter(
                    (item) =>
                      !claimed.has(item.id) &&
                      item.channelId === channel.id &&
                      !!event.url &&
                      item.text.includes(event.url) &&
                      item.text.startsWith(event.title) &&
                      !!period &&
                      item.dueAt?.slice(0, 7) === period,
                  );
                  if (candidates.length > 1)
                    throw new Error(
                      'Plusieurs posts Buffer correspondent ; vérifiez les doublons dans Buffer.',
                    );
                  post = candidates[0];
                  // An undated existing draft cannot safely be assigned to one of several monthly editions.
                  if (
                    !post &&
                    posts.some(
                      (item) =>
                        !claimed.has(item.id) &&
                        item.channelId === channel.id &&
                        !!event.url &&
                        item.text.includes(event.url) &&
                        item.text.startsWith(event.title) &&
                        !item.dueAt,
                    )
                  ) {
                    throw new Error(
                      'Un brouillon Buffer sans date correspond ; attribuez-lui son mois dans Buffer puis réessayez.',
                    );
                  }
                }
                const desiredHash = crmHash(event);
                let action = post ? 'linked' : 'created';
                if (post) {
                  const remoteChanged =
                    !!link && remoteHash(post) !== link.remoteHash;
                  const crmChanged = !link || desiredHash !== link.crmHash;
                  if (remoteChanged && crmChanged)
                    throw new Error(
                      'Texte modifié dans le CRM et dans Buffer ; réconciliez les versions avant de synchroniser.',
                    );
                  if (remoteChanged) {
                    results.push({
                      ...result,
                      postId: post.id,
                      action: 'remote_changed',
                      status: post.status,
                      message:
                        'Modification Buffer conservée ; consultez le texte synchronisé.',
                    });
                    continue;
                  }
                  if (crmChanged && post.status !== 'draft') {
                    results.push({
                      ...result,
                      postId: post.id,
                      action: 'protected',
                      status: post.status,
                      message:
                        'Publication programmée, publiée ou en erreur conservée.',
                    });
                    // Track the association without marking the new CRM content as synchronized.
                    if (!link)
                      await tx.bufferPostLink.create({
                        data: {
                          tenantId,
                          organizationId: workspace.organization.id,
                          campaignId: campaign.id,
                          eventId: event.id,
                          channelId: channel.id,
                          postId: post.id,
                          crmHash: '',
                          remoteHash: remoteHash(post),
                        },
                      });
                    claimed.add(post.id);
                    continue;
                  }
                  if (crmChanged) {
                    const assets = event.imageUrl
                      ? `assets: [{ image: { url: ${JSON.stringify(event.imageUrl)} } }]`
                      : 'assets: []';
                    const data = await request<{
                      editPost: { post?: RemotePost; message?: string };
                    }>(
                      `mutation SyncDraft { editPost(input: { id: ${JSON.stringify(post.id)}, text: ${JSON.stringify(socialTextForEvent(event))}, ${assets} }) { ... on PostActionSuccess { post { ${postFields} } } ... on MutationError { message } } }`,
                    );
                    if (!data.editPost.post)
                      throw new Error(
                        data.editPost.message || 'Modification Buffer refusée.',
                      );
                    post = data.editPost.post;
                    action = 'updated';
                  } else action = 'unchanged';
                } else {
                  if (!event.imageUrl && channel.service === 'instagram')
                    throw new Error('Une image est requise pour Instagram.');
                  if (
                    !event.sortDate ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(event.sortDate)
                  )
                    throw new Error('La date de cet événement est requise.');
                  const service = channel.service.toLowerCase();
                  const metadata =
                    service === 'instagram'
                      ? 'metadata: { instagram: { type: post, shouldShareToFeed: true } }'
                      : ['facebook', 'threads'].includes(service)
                        ? `metadata: { ${service}: { type: post } }`
                        : '';
                  const assets = event.imageUrl
                    ? `assets: [{ image: { url: ${JSON.stringify(event.imageUrl)} } }]`
                    : '';
                  const data = await request<{
                    createPost: { post?: RemotePost; message?: string };
                  }>(
                    `mutation SyncDraft { createPost(input: { channelId: ${JSON.stringify(channel.id)}, text: ${JSON.stringify(socialTextForEvent(event))}, schedulingType: automatic, mode: customScheduled, dueAt: ${JSON.stringify(`${event.sortDate}T15:00:00.000Z`)}, saveToDraft: true, ${metadata} ${assets} }) { ... on PostActionSuccess { post { ${postFields} } } ... on MutationError { message } } }`,
                  );
                  if (!data.createPost.post)
                    throw new Error(
                      data.createPost.message || 'Création Buffer refusée.',
                    );
                  post = data.createPost.post;
                  posts.push(post);
                }
                claimed.add(post.id);
                await tx.bufferPostLink.upsert({
                  where: {
                    tenantId_organizationId_eventId_channelId: {
                      tenantId,
                      organizationId: workspace.organization.id,
                      eventId: event.id,
                      channelId: channel.id,
                    },
                  },
                  create: {
                    tenantId,
                    organizationId: workspace.organization.id,
                    campaignId: campaign.id,
                    eventId: event.id,
                    channelId: channel.id,
                    postId: post.id,
                    crmHash: desiredHash,
                    remoteHash: remoteHash(post),
                  },
                  update: {
                    postId: post.id,
                    crmHash: desiredHash,
                    remoteHash: remoteHash(post),
                    syncedAt: new Date(),
                  },
                });
                results.push({
                  ...result,
                  postId: post.id,
                  action,
                  status: post.status,
                });
              } catch (error) {
                results.push({
                  ...result,
                  postId: post?.id,
                  action: 'conflict',
                  message:
                    error instanceof Error ? error.message : 'Échec Buffer',
                });
              }
            }
        return {
          ok: !results.some((item) =>
            ['conflict', 'remote_changed', 'protected'].includes(item.action),
          ),
          checkedAt: new Date().toISOString(),
          results,
        };
      },
      { timeout: 180000, maxWait: 10000 },
    );
  }

  async importPost(
    tenantId: string,
    postId: string,
    workspace: BufferWorkspace,
    request: BufferRequest,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const lock = await tx.$queryRaw<
          Array<{ locked: boolean }>
        >`SELECT pg_try_advisory_xact_lock(hashtext(${`buffer-sync:${tenantId}`})) AS locked`;
        if (!lock[0]?.locked)
          throw new ConflictException(
            'Une synchronisation Buffer est déjà en cours.',
          );
        const link = await tx.bufferPostLink.findFirst({
          where: {
            tenantId,
            organizationId: workspace.organization.id,
            postId,
          },
        });
        if (!link)
          throw new BadRequestException(
            'Ce post n’est pas relié à ce workspace CRM.',
          );
        const post = (
          await this.posts(workspace.organization.id, request)
        ).find((item) => item.id === postId);
        if (!post)
          throw new BadRequestException('Ce post a été supprimé de Buffer.');
        const tenant = await tx.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          select: { marketingSetup: true },
        });
        const setup = tenant.marketingSetup as unknown as {
          newsletterCampaigns?: SyncCampaign[];
        };
        const campaign = setup?.newsletterCampaigns?.find(
          (item) => item.id === link.campaignId,
        );
        const event = campaign?.events.find((item) => item.id === link.eventId);
        if (!event)
          throw new BadRequestException(
            'L’événement source n’existe plus dans le CRM.',
          );
        const imageUrl = post.assets[0]?.source || '';
        if (
          post.text.length > 5000 ||
          (imageUrl && !imageUrl.startsWith('https://'))
        )
          throw new BadRequestException(
            'Contenu Buffer incompatible avec cet événement CRM.',
          );
        event.socialText = post.text;
        event.imageUrl = imageUrl;
        await tx.tenant.update({
          where: { id: tenantId },
          data: { marketingSetup: setup as any },
        });
        await tx.bufferPostLink.update({
          where: { id: link.id },
          data: {
            crmHash: crmHash(event),
            remoteHash: remoteHash(post),
            syncedAt: new Date(),
          },
        });
        return {
          eventId: event.id,
          socialText: event.socialText,
          imageUrl: event.imageUrl,
        };
      },
      { timeout: 60000, maxWait: 10000 },
    );
  }
}
