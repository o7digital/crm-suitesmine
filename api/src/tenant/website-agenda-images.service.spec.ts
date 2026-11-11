import sharp from 'sharp';
import { WebsiteAgendaImagesService } from './website-agenda-images.service';
describe('Website agenda images', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('converts to WebP and deduplicates concurrent requests', async () => {
    const png = await sharp({ create: { width: 32, height: 20, channels: 3, background: '#123456' } }).png().toBuffer();
    const fetcher = jest.fn(async () => new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } }));
    global.fetch = fetcher as any;
    const service = new WebsiteAgendaImagesService();
    const [first, second] = await Promise.all([service.image('https://media.ticketmaster.com/image.png', 'kepler'), service.image('https://media.ticketmaster.com/image.png', 'kepler')]);
    expect((await sharp(first).metadata()).format).toBe('webp');
    expect(second).toEqual(first); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('blocks internal redirects and oversized sources', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/' } })) as any;
    await expect(new WebsiteAgendaImagesService().image('https://media.ticketmaster.com/image.png', 'kepler')).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    global.fetch = jest.fn(async () => new Response('large', { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '6000000' } })) as any;
    await expect(new WebsiteAgendaImagesService().image('https://media.ticketmaster.com/image.png', 'kepler')).rejects.toThrow();
  });
});
