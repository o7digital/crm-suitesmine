import { newsletterBackend } from '@/lib/newsletterBackend';

export const dynamic = 'force-dynamic';

async function proxy(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer \S+$/.test(authorization)) return Response.json({ message: 'Connectez-vous pour gérer les agendas.' }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const id = query.get('agendaId'); const month = query.get('month'); const action = query.get('action');
  if ((id || month || action) && (!id || !/^[\da-f-]{36}$/i.test(id) || !month || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month) || (action && action !== 'approve'))) {
    return Response.json({ message: 'Adresse d’agenda invalide.' }, { status: 400 });
  }
  const suffix = id ? `/${id}/months/${month}${action === 'approve' ? '/approve' : ''}` : '';
  const headers = { Authorization: authorization, 'Content-Type': 'application/json' };
  try {
    const bootstrap = await fetch(`${newsletterBackend()}/bootstrap`, { method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!bootstrap.ok) return new Response(await bootstrap.text(), { status: bootstrap.status, headers: { 'Content-Type': 'application/json' } });
    const response = await fetch(`${newsletterBackend()}/tenant/website-agendas${suffix}`, {
      method: request.method, headers, cache: 'no-store', signal: AbortSignal.timeout(25000),
      ...(request.method === 'GET' ? {} : { body: JSON.stringify(await request.json()) }),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ message: 'Le serveur des agendas est indisponible. Réessayez dans un instant.' }, { status: 503 }); }
}

export const GET = proxy;
export const PUT = proxy;
export const POST = proxy;
