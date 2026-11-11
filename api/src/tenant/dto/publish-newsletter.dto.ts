import { IsObject, IsString, MaxLength } from 'class-validator';

export class PublishNewsletterDto {
  @IsString()
  @MaxLength(120)
  campaignId: string;

  @IsObject()
  campaign: Record<string, unknown>;

  @IsObject()
  branding: Record<string, unknown>;
}
