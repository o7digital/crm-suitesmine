import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/user.decorator';
import type { RequestUser } from '../common/user.decorator';
import { NewsletterPublicationsService } from './newsletter-publications.service';
import { PublishNewsletterDto } from './dto/publish-newsletter.dto';

@UseGuards(JwtAuthGuard)
@Controller('tenant/newsletter/publications')
export class NewsletterPublicationsController {
  constructor(private readonly publications: NewsletterPublicationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) { return this.publications.list(user); }

  @Post()
  publish(@Body() dto: PublishNewsletterDto, @CurrentUser() user: RequestUser) {
    return this.publications.publish(dto, user);
  }
}

@Controller('public/newsletters')
export class PublicNewslettersController {
  constructor(private readonly publications: NewsletterPublicationsService) {}

  @Get(':id')
  read(@Param('id', new ParseUUIDPipe()) id: string) { return this.publications.read(id); }
}
