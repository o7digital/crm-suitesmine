import { newsletterBackend } from '@/lib/newsletterBackend';

export const dynamic = 'force-dynamic';

async function proxy(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer \S+$/.test(authorization)) {
    return Response.json({ message: 'Connectez-vous pour publier une page.' }, { status: 401 });
  }
  // The API's JWT guard verifies the Clerk token and workspace membership.
  // Forward the token explicitly so this also works with legacy Vercel routing.
  const headers = { Authorization: authorization, 'Content-Type': 'application/json' };
  try {
    const boot = await fetch(`${newsletterBackend()}/bootstrap`, {
      method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
    if (!boot.ok) return new Response(await boot.text(), { status: boot.status, headers: { 'Content-Type': 'application/json' } });
    const response = await fetch(`${newsletterBackend()}/tenant/newsletter/publications`, {
      method: request.method, headers, cache: 'no-store', signal: AbortSignal.timeout(20000),
      ...(request.method === 'POST' ? { body: JSON.stringify(await request.json()) } : {}),
    });
    return new Response(await response.text(), {
      status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ message: 'Le serveur de publication est indisponible. Réessayez dans un instant.' }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
