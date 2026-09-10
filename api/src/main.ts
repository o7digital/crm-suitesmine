import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SchemaUpgraderService } from './prisma/schema-upgrader.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const explicitOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const allowlist = new Set<string>(explicitOrigins);
  if (process.env.NODE_ENV !== 'production') allowlist.add('http://localhost:3000');
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowlist.has(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // Avoid stale data when routed through CDNs/proxies (Vercel/Railway).
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: false,
      transform: true,
    }),
  );

  if (process.env.RUN_LEGACY_SCHEMA_UPGRADER === 'true') {
  try {
    await app.get(SchemaUpgraderService).run();
    // eslint-disable-next-line no-console
    console.log('[db] schema upgrade ok');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[db] schema upgrade skipped', err instanceof Error ? err.message : err);
  }

  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // Helps debugging on Railway/Vercel when routing issues happen.
  // eslint-disable-next-line no-console
  console.log(`[api] listening on port ${port}`);
}
bootstrap();
