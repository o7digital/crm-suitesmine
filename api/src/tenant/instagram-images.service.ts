import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { allowedImageUrl } from './website-agenda-data';

@Injectable()
export class InstagramImagesService {
  private cache = new Map<string, Buffer>();
  private pending = new Map<string, Promise<Buffer>>();
  private active = 0;
  private waiting: Array<() => void> = [];
  private bytes = 0;

  private secret() {
    const key = process.env.INSTAGRAM_IMAGE_SIGNING_KEY;
    if (!key || key.length < 32) throw new ServiceUnavailableException('La préparation des visuels Instagram est indisponible.');
    return key;
  }

  private canonical(source: string) {
    if (typeof source !== 'string' || source.length > 2000) throw new BadRequestException('Adresse du visuel invalide.');
    const origin = (process.env.PUBLIC_API_ORIGIN || 'https://api-suitesmine-production.up.railway.app').replace(/\/$/, '');
    if (source.startsWith(`${origin}/api/public/instagram-images/v1/`)) {
      const url = new URL(source);
      const signature = url.pathname.match(/\/([a-f0-9]{64})\.jpg$/)?.[1] || '';
      source = this.decode(signature, url.searchParams.get('source') || '');
    }
    return allowedImageUrl(source, 'suitesmine').href;
  }

  private signature(source: string) {
    return createHmac('sha256', this.secret()).update(`instagram-v1\0${source}`).digest('hex');
  }

  publicUrl(source: string) {
    const canonical = this.canonical(source);
    const origin = (process.env.PUBLIC_API_ORIGIN || 'https://api-suitesmine-production.up.railway.app').replace(/\/$/, '');
    return `${origin}/api/public/instagram-images/v1/${this.signature(canonical)}.jpg?source=${Buffer.from(canonical).toString('base64url')}`;
  }

  async prepare(source: string) {
    const url = this.publicUrl(source);
    // Prepare before Buffer reads the asset; conversion errors must not create broken drafts.
    await this.render(this.canonical(source));
    return url;
  }

  private decode(signature: string, encoded: string) {
    if (typeof encoded !== 'string' || !/^[a-zA-Z0-9_-]{1,2700}$/.test(encoded) || !/^[a-f0-9]{64}$/.test(signature)) throw new NotFoundException();
    const source = Buffer.from(encoded, 'base64url').toString('utf8');
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(this.signature(source), 'hex'))) throw new NotFoundException();
    return source;
  }

  async read(signature: string, encoded: string) {
    return this.render(this.canonical(this.decode(signature, encoded)));
  }

  private async render(source: string) {
    if (this.cache.has(source)) return this.cache.get(source)!;
    if (this.pending.has(source)) return this.pending.get(source)!;
    if (this.waiting.length >= 40) throw new ServiceUnavailableException('Réessayez la préparation du visuel dans un instant.');
    const promise = (async () => {
      if (this.active >= 2) await new Promise<void>(resolve => this.waiting.push(resolve));
      else this.active++;
      try {
        const image = await this.convert(source);
        this.cache.set(source, image); this.bytes += image.length;
        while (this.cache.size > 100 || this.bytes > 30_000_000) {
          const first = this.cache.keys().next().value!;
          this.bytes -= this.cache.get(first)!.length; this.cache.delete(first);
        }
        return image;
      } finally {
        const next = this.waiting.shift();
        if (next) next(); else this.active--;
      }
    })().finally(() => this.pending.delete(source));
    this.pending.set(source, promise);
    return promise;
  }

  private async convert(source: string) {
    let url = new URL(source);
    try {
      for (let redirects = 0; redirects < 4; redirects++) {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Suites-Instagram-Images/1.0' } });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location'); await response.body?.cancel();
          if (!location) throw new Error();
          url = allowedImageUrl(new URL(location, url).href, 'suitesmine'); continue;
        }
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/') || Number(response.headers.get('content-length')) > 12_000_000 || !response.body) {
          await response.body?.cancel(); throw new Error();
        }
        const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
        try {
          while (true) {
            const chunk = await reader.read(); if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > 12_000_000) throw new Error();
            chunks.push(chunk.value);
          }
        } finally { await reader.cancel(); }
        const image = sharp(Buffer.concat(chunks), { limitInputPixels: 64_000_000 });
        const metadata = await image.metadata();
        const rotated = [5, 6, 7, 8].includes(metadata.orientation || 0);
        const width = (rotated ? metadata.height : metadata.width) || 0;
        const height = (rotated ? metadata.width : metadata.height) || 0;
        if (!width || !height) throw new Error();
        const targetWidth = Math.min(1080, Math.max(320, width));
        const ratio = Math.min(1.91, Math.max(0.8, width / height));
        const targetHeight = Math.ceil(targetWidth / ratio);
        // Retain the photograph's proportions; pad only unsupported aspect ratios.
        return await image.rotate().resize({ width: targetWidth, height: targetHeight, fit: 'contain', background: '#f7f5ef' })
          .flatten({ background: '#f7f5ef' }).toColourspace('srgb').jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      }
    } catch { /* Fail before sending unusable media to Buffer. */ }
    throw new BadRequestException('Impossible de préparer ce visuel Instagram. Vérifiez son adresse et sa disponibilité.');
  }
}
