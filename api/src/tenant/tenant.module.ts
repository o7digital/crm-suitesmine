import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { BufferSyncService } from './buffer-sync.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, BufferSyncService],
})
export class TenantModule {}

