import sharp from 'sharp';
import { InstagramImagesService } from './instagram-images.service';

describe('Instagram image preparation', () => {
  const originalFetch = global.fetch;
  const key = process.env.INSTAGRAM_IMAGE_SIGNING_KEY;
  beforeEach(() => { process.env.INSTAGRAM_IMAGE_SIGNING_KEY = 'test-only-instagram-signing-key-1234567890'; });
  afterEach(() => { global.fetch = originalFetch; if (key === undefined) delete process.env.INSTAGRAM_IMAGE_SIGNING_KEY; else process.env.INSTAGRAM_IMAGE_SIGNING_KEY = key; });

  it('converts a 6000px photograph into a complete 1080px JPEG and caches it', async () => {
    const original = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: '#235679' } }).png().toBuffer();
    global.fetch = jest.fn(async () => new Response(new Uint8Array(original), { headers: { 'Content-Type': 'image/png' } })) as any;
    const service = new InstagramImagesService();
    const url = new URL(await service.prepare('https://cdn.prod.website-files.com/photo.jpg'));
    const signature = url.pathname.split('/').at(-1)!.replace('.jpg', '');
    const result = await service.read(signature, url.searchParams.get('source')!);
    expect(await sharp(result).metadata()).toMatchObject({ width: 1080, height: 720, format: 'jpeg', space: 'srgb' });
    expect(result.length).toBeLessThan(8_000_000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('pads an unsupported panoramic ratio while retaining the whole image', async () => {
    const original = await sharp({ create: { width: 2048, height: 864, channels: 3, background: '#123456' } }).png().toBuffer();
    global.fetch = jest.fn(async () => new Response(new Uint8Array(original), { headers: { 'Content-Type': 'image/png' } })) as any;
    const service = new InstagramImagesService();
    const url = new URL(await service.prepare('https://media.ticketmaster.com/panorama.jpg'));
    const result = await service.read(url.pathname.split('/').at(-1)!.replace('.jpg', ''), url.searchParams.get('source')!);
    const metadata = await sharp(result).metadata();
    expect(metadata.width! / metadata.height!).toBeLessThanOrEqual(1.91);
    expect(metadata.width! / metadata.height!).toBeGreaterThanOrEqual(0.8);
    expect(metadata.width).toBe(1080);
  });

  it('rejects unsigned requests, modified sources, private hosts and internal redirects', async () => {
    const service = new InstagramImagesService();
    global.fetch = jest.fn() as any;
    const url = new URL(service.publicUrl('https://media.ticketmaster.com/photo.jpg'));
    const signature = url.pathname.split('/').at(-1)!.replace('.jpg', '');
    await expect(service.read(signature, Buffer.from('https://169.254.169.254/photo.jpg').toString('base64url'))).rejects.toThrow();
    await expect(service.read('a'.repeat(64), url.searchParams.get('source')!)).rejects.toThrow();
    expect(() => service.publicUrl('http://localhost/private')).toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    global.fetch = jest.fn(async () => new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/' } })) as any;
    await expect(service.prepare('https://media.ticketmaster.com/photo.jpg')).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('accepts an image imported back from Buffer without nesting another proxy URL', () => {
    const service = new InstagramImagesService();
    const url = service.publicUrl('https://media.ticketmaster.com/photo.jpg');
    expect(service.publicUrl(url)).toBe(url);
    expect(() => service.publicUrl(url.replace('source=', 'source=modified'))).toThrow();
  });

  it('fails before creating a post when the image or signing key is unavailable', async () => {
    const service = new InstagramImagesService();
    global.fetch = jest.fn(async () => new Response('missing', { status: 404 })) as any;
    await expect(service.prepare('https://media.ticketmaster.com/photo.jpg')).rejects.toThrow();
    delete process.env.INSTAGRAM_IMAGE_SIGNING_KEY;
    expect(() => service.publicUrl('https://media.ticketmaster.com/photo.jpg')).toThrow();
  });
});
