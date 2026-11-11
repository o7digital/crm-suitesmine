import { auth } from '@clerk/nextjs/server';
import { newsletterBackend } from '@/lib/newsletterBackend';

export const dynamic = 'force-dynamic';

async function proxy(request: Request) {
  const session = await auth();
  if (!session.userId) return Response.json({ message: 'Connectez-vous pour publier une page.' }, { status: 401 });
  const token = await session.getToken();
  if (!token) return Response.json({ message: 'Votre session a expiré.' }, { status: 401 });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
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
