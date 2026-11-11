import { Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';
import { InstagramImagesService } from './instagram-images.service';

@Controller('public/instagram-images')
export class InstagramImagesController {
  constructor(private readonly images: InstagramImagesService) {}

  @Get('v1/:signature.jpg')
  @Header('Cache-Control', 'public, max-age=86400')
  async image(@Param('signature') signature: string, @Query('source') source: string) {
    return new StreamableFile(await this.images.read(signature, source), { type: 'image/jpeg' });
  }
}
