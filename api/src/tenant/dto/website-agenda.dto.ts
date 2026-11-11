import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PublishNewsletterDto } from './publish-newsletter.dto';

export class SaveWebsiteAgendaDto {
  @IsString() @MaxLength(120)
  campaignId: string;

  @IsArray()
  events: unknown[];

  @IsOptional() @IsDateString()
  expectedUpdatedAt?: string;
}

export class ApproveWebsiteAgendaDto {
  @IsDateString()
  expectedUpdatedAt: string;

  @IsOptional() @ValidateNested() @Type(() => PublishNewsletterDto)
  newsletter?: PublishNewsletterDto;
}
