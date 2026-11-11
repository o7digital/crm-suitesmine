import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';
import { allowedImageUrl } from './website-agenda-data';

@Injectable()
export class WebsiteAgendaImagesService {
  private cache = new Map<string, Buffer>();
  private pending = new Map<string, Promise<Buffer>>();

  async image(source: string, siteKey: string) {
    const initial = allowedImageUrl(source, siteKey);
    const key = initial.href;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.pending.has(key)) return this.pending.get(key)!;
    const promise = this.convert(initial, siteKey).then(buffer => {
      this.cache.set(key, buffer);
      while (this.cache.size > 100) this.cache.delete(this.cache.keys().next().value!);
      return buffer;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  private async convert(initial: URL, siteKey: string) {
    let url = initial;
    try {
      for (let redirect = 0; redirect < 4; redirect++) {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Suites-Monthly-Agenda/1.0' } });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location) throw new Error();
          url = allowedImageUrl(new URL(location, url).href, siteKey);
          continue;
        }
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/') || Number(response.headers.get('content-length')) > 5_000_000 || !response.body) {
          await response.body?.cancel(); throw new Error();
        }
        const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read(); if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 5_000_000) throw new BadRequestException('Visuel trop volumineux.');
            chunks.push(chunk.value);
          }
        } finally { await reader.cancel(); }
        return await sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000 }).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      }
    } catch (error) { if (error instanceof BadRequestException) throw error; }
    throw new ServiceUnavailableException('Le visuel officiel est temporairement indisponible.');
  }
}
