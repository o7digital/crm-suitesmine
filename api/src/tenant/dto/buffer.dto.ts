import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBufferPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventId?: string;

  @IsString()
  @MaxLength(5000)
  text: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  channelIds: string[];

  @IsIn(['queue', 'custom'])
  mode: 'queue' | 'custom';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dueAt?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1200)
  imageUrl?: string;
}

export class SyncBufferDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  campaignIds: string[];
}

export class ImportBufferPostDto {
  @IsString()
  @MaxLength(100)
  postId: string;
}
