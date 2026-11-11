import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/user.decorator';
import type { RequestUser } from '../common/user.decorator';
import { WebsiteAgendasService } from './website-agendas.service';
import { WebsiteAgendaImagesService } from './website-agenda-images.service';
import { ApproveWebsiteAgendaDto, SaveWebsiteAgendaDto } from './dto/website-agenda.dto';

@Controller('tenant/website-agendas')
@UseGuards(JwtAuthGuard)
export class WebsiteAgendasController {
  constructor(private readonly agendas: WebsiteAgendasService) {}

  @Get() list(@CurrentUser() user: RequestUser) { return this.agendas.list(user); }

  @Get(':id/months/:month')
  read(@Param('id', new ParseUUIDPipe()) id: string, @Param('month') month: string, @CurrentUser() user: RequestUser) {
    return this.agendas.readDraft(id, month, user);
  }

  @Put(':id/months/:month')
  save(@Param('id', new ParseUUIDPipe()) id: string, @Param('month') month: string, @Body() dto: SaveWebsiteAgendaDto, @CurrentUser() user: RequestUser) {
    return this.agendas.save(id, month, dto, user);
  }

  @Post(':id/months/:month/approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Param('month') month: string, @Body() dto: ApproveWebsiteAgendaDto, @CurrentUser() user: RequestUser) {
    return this.agendas.approve(id, month, dto, user);
  }
}

@Controller('public/website-agendas')
export class PublicWebsiteAgendasController {
  constructor(private readonly agendas: WebsiteAgendasService, private readonly images: WebsiteAgendaImagesService) {}

  @Get(':id/current')
  current(@Param('id', new ParseUUIDPipe()) id: string) { return this.agendas.current(id); }

  @Get(':id/images/:month/:version/:eventId.webp')
  async image(@Param('id', new ParseUUIDPipe()) id: string, @Param('month') month: string, @Param('version') version: string, @Param('eventId') eventId: string) {
    const source = await this.agendas.imageSource(id, month, version, eventId);
    return new StreamableFile(await this.images.image(source.imageUrl, source.siteKey), { type: 'image/webp' });
  }
}
