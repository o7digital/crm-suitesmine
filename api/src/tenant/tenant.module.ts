import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { BufferSyncService } from './buffer-sync.service';
import { NewsletterPublicationsController, PublicNewslettersController } from './newsletter-publications.controller';
import { NewsletterPublicationsService } from './newsletter-publications.service';

@Module({
  controllers: [TenantController, NewsletterPublicationsController, PublicNewslettersController],
  providers: [TenantService, BufferSyncService, NewsletterPublicationsService],
})
export class TenantModule {}

