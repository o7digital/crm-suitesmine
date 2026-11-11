import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/user.decorator';
import { PublishNewsletterDto } from './dto/publish-newsletter.dto';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const summaryFields = { id: true, campaignId: true, monthKey: true, updatedAt: true } as const;

function text(value: unknown, max = 300): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function url(value: unknown): string {
  const candidate = text(value, 2000);
  try {
    const parsed = new URL(candidate);
    return ['https:', 'http:'].includes(parsed.protocol) ? candidate : '';
  } catch { return ''; }
}

function publicCopy(value: unknown) {
  return text(value, 50000)
    .replace(/\{\{\s*(?:firstName|fullName)\s*\}\}|\*\|(?:FNAME|LNAME)\|\*/g, 'viajero')
    .replace(/\{\{\s*company\s*\}\}/g, 'tu empresa')
    .replace(/\{\{\s*email\s*\}\}/g, '');
}

// Only these explicitly public fields may cross the publication boundary.
// Workspace settings, credentials, targeting and social drafts are never copied.
export function newsletterSnapshot(dto: PublishNewsletterDto) {
  const campaign = dto.campaign;
  const branding = dto.branding;
  const month = months.indexOf(text(campaign.month).replace(/^\d+\s+/, ''));
  const year = Number(campaign.year);
  if (!text(dto.campaignId) || month < 0 || !Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new BadRequestException('Le mois et l’année de la campagne sont requis.');
  }
  const headline = text(campaign.headline);
  if (!headline) throw new BadRequestException('Ajoutez un titre avant de publier.');
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const events = (Array.isArray(campaign.events) ? campaign.events : []).slice(0, 150)
    .filter((event): event is Record<string, unknown> => !!event && typeof event === 'object')
    .map((event) => ({
      id: text(event.id, 120), title: text(event.title), category: text(event.category, 80),
      date: text(event.date), venue: text(event.venue), description: text(event.description, 2000),
      url: url(event.url), sourceLabel: text(event.sourceLabel, 120), imageUrl: url(event.imageUrl),
    }));
  const bodyHtml = sanitizeHtml(publicCopy(campaign.bodyHtml), {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
  });
  return {
    monthKey,
    campaign: {
      month: months[month], year, headline, subject: text(campaign.subject), preheader: text(campaign.preheader, 1000),
      eyebrow: text(campaign.eyebrow), heroImage: url(campaign.heroImage) || url(branding.heroImage),
      body: publicCopy(campaign.body), bodyHtml, cta: text(campaign.cta, 120),
      ctaUrl: url(campaign.ctaUrl) || url(branding.reservationUrl),
      highlights: (Array.isArray(campaign.highlights) ? campaign.highlights : []).slice(0, 12).map((item) => text(item)),
      events,
    },
    branding: {
      address: text(branding.address), phone: text(branding.phone, 80),
      websiteUrl: url(branding.websiteUrl),
      gallery: (Array.isArray(branding.gallery) ? branding.gallery : []).slice(0, 12).map(url).filter(Boolean),
    },
  };
}

@Injectable()
export class NewsletterPublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensurePublisher(user: RequestUser) {
    const member = await this.prisma.user.findFirst({
      where: { id: user.userId, tenantId: user.tenantId }, select: { role: true },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Seul un administrateur peut publier une page publique.');
    }
  }

  async list(user: RequestUser) {
    await this.ensurePublisher(user);
    return this.prisma.newsletterPublication.findMany({
      where: { tenantId: user.tenantId }, select: summaryFields, orderBy: { monthKey: 'asc' },
    });
  }

  async publish(dto: PublishNewsletterDto, user: RequestUser, db: Prisma.TransactionClient = this.prisma) {
    await this.ensurePublisher(user);
    const snapshot = newsletterSnapshot(dto);
    const existing = await db.newsletterPublication.findUnique({
      where: { tenantId_campaignId: { tenantId: user.tenantId, campaignId: dto.campaignId } },
      select: { monthKey: true },
    });
    if (existing && existing.monthKey !== snapshot.monthKey) {
      throw new BadRequestException('Créez une autre campagne pour publier un autre mois. Le lien existant est conservé.');
    }
    return db.newsletterPublication.upsert({
      where: { tenantId_campaignId: { tenantId: user.tenantId, campaignId: dto.campaignId } },
      create: { tenantId: user.tenantId, campaignId: dto.campaignId, monthKey: snapshot.monthKey, snapshot: snapshot as Prisma.InputJsonValue },
      // Stable identifiers keep already shared links working after updates.
      update: { snapshot: snapshot as Prisma.InputJsonValue },
      select: summaryFields,
    });
  }

  async read(id: string) {
    const publication = await this.prisma.newsletterPublication.findUnique({
      where: { id }, select: { id: true, monthKey: true, snapshot: true, updatedAt: true },
    });
    if (!publication) throw new NotFoundException('Cette page n’a pas été publiée.');
    return publication;
  }
}
