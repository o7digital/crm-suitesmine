import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { BufferSyncService } from './buffer-sync.service';
import { NewsletterPublicationsController, PublicNewslettersController } from './newsletter-publications.controller';
import { NewsletterPublicationsService } from './newsletter-publications.service';
import { WebsiteAgendasController, PublicWebsiteAgendasController } from './website-agendas.controller';
import { WebsiteAgendasService } from './website-agendas.service';
import { WebsiteAgendaImagesService } from './website-agenda-images.service';

@Module({
  controllers: [TenantController, NewsletterPublicationsController, PublicNewslettersController, WebsiteAgendasController, PublicWebsiteAgendasController],
  providers: [TenantService, BufferSyncService, NewsletterPublicationsService, WebsiteAgendasService, WebsiteAgendaImagesService],
})
export class TenantModule {}

