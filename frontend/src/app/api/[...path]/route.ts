import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function normalizeApiOrigin(raw?: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

function apiOrigin(): string {
  const origin = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_ROOT || process.env.NEXT_PUBLIC_API_URL);
  if (!origin) {
    throw new Error('Missing NEXT_PUBLIC_API_ROOT or NEXT_PUBLIC_API_URL');
  }
  return origin;
}

function proxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function responseHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      nextHeaders.set(key, value);
    }
  });
  nextHeaders.set('cache-control', 'no-store');
  return nextHeaders;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const targetUrl = new URL(`/api/${path.join('/')}`, apiOrigin());
  targetUrl.search = request.nextUrl.search;

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders(request),
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers),
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
