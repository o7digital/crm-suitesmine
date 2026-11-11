import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/user.decorator';
import { NewsletterPublicationsService, newsletterSnapshot } from './newsletter-publications.service';
import { ApproveWebsiteAgendaDto, SaveWebsiteAgendaDto } from './dto/website-agenda.dto';
import { agendaIssues, agendaStatus, cleanWebsiteEvents, validMonth, websiteMonth, websiteSites, type WebsiteEvent } from './website-agenda-data';

@Injectable()
export class WebsiteAgendasService {
  constructor(private readonly prisma: PrismaService, private readonly publications: NewsletterPublicationsService) {}

  private async publisher(user: RequestUser) {
    const member = await this.prisma.user.findFirst({ where: { id: user.userId, tenantId: user.tenantId }, select: { role: true } });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) throw new ForbiddenException('Accès administrateur requis.');
  }

  private async owned(id: string, user: RequestUser) {
    await this.publisher(user);
    const agenda = await this.prisma.websiteAgenda.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!agenda || !websiteSites[agenda.siteKey]) throw new NotFoundException('Ce site n’est pas relié à votre workspace.');
    return agenda;
  }

  async list(user: RequestUser) {
    await this.publisher(user);
    const agendas = await this.prisma.websiteAgenda.findMany({ where: { tenantId: user.tenantId }, include: {
      months: { select: { monthKey: true, approvedAt: true, updatedAt: true }, orderBy: { monthKey: 'asc' } },
    } });
    return agendas.filter(a => websiteSites[a.siteKey]).map(a => ({
      id: a.id, siteKey: a.siteKey, ...websiteSites[a.siteKey],
      months: a.months.map(m => ({ ...m, status: agendaStatus(m.monthKey, m.approvedAt) })),
    }));
  }

  private view(row: any, monthKey: string, siteKey: string) {
    const events = row ? (row.draft as { events: WebsiteEvent[] }).events : [];
    return {
      monthKey, campaignId: row?.campaignId || '', events, updatedAt: row?.updatedAt || null,
      approvedAt: row?.approvedAt || null, status: agendaStatus(monthKey, row?.approvedAt || null),
      hasPendingChanges: !!row?.approvedAt && JSON.stringify(row.draft) !== JSON.stringify(row.approved),
      validation: agendaIssues(events, monthKey, siteKey),
    };
  }

  async readDraft(id: string, monthKey: string, user: RequestUser) {
    validMonth(monthKey);
    const agenda = await this.owned(id, user);
    const row = await this.prisma.websiteAgendaMonth.findUnique({ where: { agendaId_monthKey: { agendaId: id, monthKey } } });
    return this.view(row, monthKey, agenda.siteKey);
  }

  async save(id: string, monthKey: string, dto: SaveWebsiteAgendaDto, user: RequestUser) {
    validMonth(monthKey);
    const agenda = await this.owned(id, user);
    const events = cleanWebsiteEvents(dto.events);
    if (!dto.campaignId?.trim()) throw new BadRequestException('Choisissez une campagne.');
    const row = await this.prisma.websiteAgendaMonth.findUnique({ where: { agendaId_monthKey: { agendaId: id, monthKey } } });
    try {
      const result = await this.prisma.$transaction(async tx => {
        if (row) {
          if (!dto.expectedUpdatedAt || row.updatedAt.toISOString() !== dto.expectedUpdatedAt) throw new ConflictException('Cet agenda a changé. Rechargez sa dernière version avant de sauvegarder.');
          const update = await tx.websiteAgendaMonth.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: {
            campaignId: dto.campaignId.trim(), draft: { events } as Prisma.InputJsonValue,
          } });
          if (update.count !== 1) throw new ConflictException('Un autre changement vient d’être enregistré. Rechargez cet agenda.');
          return tx.websiteAgendaMonth.findUniqueOrThrow({ where: { id: row.id } });
        }
        return tx.websiteAgendaMonth.create({ data: { agendaId: id, monthKey, campaignId: dto.campaignId.trim(), draft: { events } as Prisma.InputJsonValue } });
      });
      return this.view(result, monthKey, agenda.siteKey);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Ce mois vient d’être créé. Rechargez sa dernière version.');
      throw error;
    }
  }

  async approve(id: string, monthKey: string, dto: ApproveWebsiteAgendaDto, user: RequestUser) {
    validMonth(monthKey);
    const agenda = await this.owned(id, user);
    const row = await this.prisma.websiteAgendaMonth.findUnique({ where: { agendaId_monthKey: { agendaId: id, monthKey } } });
    if (!row || row.updatedAt.toISOString() !== dto.expectedUpdatedAt) throw new ConflictException('Enregistrez et rechargez la préparation avant de la valider.');
    const events = cleanWebsiteEvents((row.draft as { events: unknown[] }).events);
    const validation = agendaIssues(events, monthKey, agenda.siteKey);
    if (validation.issues.length) throw new BadRequestException(validation.issues);
    if (dto.newsletter && (dto.newsletter.campaignId !== row.campaignId || newsletterSnapshot(dto.newsletter).monthKey !== monthKey)) {
      throw new BadRequestException('La campagne et le mois de l’agenda doivent correspondre.');
    }
    const result = await this.prisma.$transaction(async tx => {
      const update = await tx.websiteAgendaMonth.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: {
        approved: { events } as Prisma.InputJsonValue, approvedAt: new Date(), approvedBy: user.userId,
      } });
      if (update.count !== 1) throw new ConflictException('La préparation a changé pendant la validation. Rechargez-la.');
      if (dto.newsletter) await this.publications.publish(dto.newsletter, user, tx);
      return tx.websiteAgendaMonth.findUniqueOrThrow({ where: { id: row.id } });
    });
    return this.view(result, monthKey, agenda.siteKey);
  }

  // The server clock selects the month on every read. No job or open admin tab is required.
  async current(id: string, now = new Date()) {
    const agenda = await this.prisma.websiteAgenda.findUnique({ where: { id } });
    if (!agenda || !websiteSites[agenda.siteKey]) throw new NotFoundException('Agenda introuvable.');
    const monthKey = websiteMonth(now);
    const row = await this.prisma.websiteAgendaMonth.findUnique({ where: { agendaId_monthKey: { agendaId: id, monthKey } } });
    const available = !!row?.approvedAt && !!row.approved;
    const origin = (process.env.PUBLIC_API_ORIGIN || 'https://api-suitesmine-production.up.railway.app').replace(/\/$/, '');
    const version = row?.approvedAt?.getTime().toString() || '';
    const events = available ? cleanWebsiteEvents((row!.approved as { events: unknown[] }).events).map(event => ({
      ...event,
      imageUrl: event.imageUrl ? `${origin}/api/public/website-agendas/${id}/images/${monthKey}/${version}/${encodeURIComponent(event.id)}.webp` : '',
    })) : [];
    return { siteKey: agenda.siteKey, monthKey, available, approvedAt: available ? row!.approvedAt : null, events };
  }

  async imageSource(id: string, monthKey: string, version: string, eventId: string, now = new Date()) {
    validMonth(monthKey);
    if (monthKey > websiteMonth(now)) throw new NotFoundException('Ce mois n’est pas encore public.');
    const agenda = await this.prisma.websiteAgenda.findUnique({ where: { id } });
    if (!agenda || !websiteSites[agenda.siteKey]) throw new NotFoundException();
    const row = await this.prisma.websiteAgendaMonth.findUnique({ where: { agendaId_monthKey: { agendaId: id, monthKey } } });
    if (!row?.approvedAt || row.approvedAt.getTime().toString() !== version || !row.approved) throw new NotFoundException();
    const event = (row.approved as { events: WebsiteEvent[] }).events.find(e => e.id === eventId);
    if (!event?.imageUrl) throw new NotFoundException();
    return { siteKey: agenda.siteKey, imageUrl: event.imageUrl };
  }
}
