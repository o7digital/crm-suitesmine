'use client';

import { useCallback, useEffect, useState } from 'react';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { publicationPath, type PublicationSummary } from '@/lib/newsletterPublications';

type Campaign = { id: string; month: string; year: number; headline: string };

async function publicationRequest<T>(token: string | null, init?: RequestInit): Promise<T> {
  if (!token) throw new Error('Connectez-vous pour publier une page.');
  const response = await fetch('/api/newsletter/publications', {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(' · ') : data.message || 'Publication impossible.');
  return data;
}

export function PublicSharingPanel({ selected, campaigns, branding }: {
  selected: Campaign;
  campaigns: Campaign[];
  branding: object;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [publications, setPublications] = useState<PublicationSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [canShare, setCanShare] = useState(false);
  const current = publications.find((item) => item.campaignId === selected.id);
  const currentUrl = current && origin ? `${origin}${publicationPath(current)}` : '';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setPublications(await publicationRequest<PublicationSummary[]>(await getToken()));
      setLoaded(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Lecture des publications impossible.'); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (isSignedIn) void load();
    else { setPublications([]); setLoaded(false); }
  }, [isSignedIn, load]);

  const publish = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const publication = await publicationRequest<PublicationSummary>(await getToken(), {
        method: 'POST', body: JSON.stringify({ campaignId: selected.id, campaign: selected, branding }),
      });
      setPublications((items) => [...items.filter((item) => item.campaignId !== publication.campaignId), publication]);
      setNotice(`${selected.month} ${selected.year} : page publique ${current ? 'mise à jour. Le lien reste identique.' : 'publiée. Le lien est prêt à partager.'}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Publication impossible.'); }
    finally { setBusy(false); }
  };

  const copy = async (value: string) => {
    setError(''); setNotice('');
    try { await navigator.clipboard.writeText(value); setNotice(value.includes('\n') ? 'Liens copiés. Tu peux les transmettre à Herman.' : 'Lien copié. Tu peux le transmettre à Herman.'); }
    catch { setError('Copie automatique indisponible : sélectionne le lien ci-dessous pour le copier.'); }
  };

  const share = async () => {
    try { await navigator.share({ title: `Suites Mine · ${selected.month} ${selected.year}`, url: currentUrl }); }
    catch (err) { if (!(err instanceof Error && err.name === 'AbortError')) setError('Partage indisponible. Utilise « Copier le lien ».'); }
  };

  return (
    <section className="card mb-6 min-w-0 p-4 sm:p-5" aria-labelledby="public-sharing-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#dfb85f]">Liens à partager avec Herman</p>
          <h2 id="public-sharing-title" className="mt-2 text-xl font-semibold">Page publique · {selected.month} {selected.year}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Accessible sans compte, sur ordinateur, iPhone et Android. Les modifications du brouillon restent privées jusqu’à la prochaine publication.</p>
        </div>
        {isLoaded && isSignedIn ? (
          <button type="button" className="btn-primary min-h-11 shrink-0 text-sm" onClick={publish} disabled={busy || loading || !loaded}>
            {busy ? 'Publication…' : current ? 'Mettre à jour la page publique' : 'Publier la page du mois'}
          </button>
        ) : isLoaded ? (
          <SignInButton mode="modal"><button type="button" className="btn-primary min-h-11 shrink-0 text-sm">Se connecter pour publier</button></SignInButton>
        ) : <p className="text-sm text-slate-400">Chargement…</p>}
      </div>
      {isLoaded && !isSignedIn ? <p className="mt-3 text-sm text-slate-400">La connexion sert uniquement à publier et gérer tes liens. Herman n’aura pas besoin de se connecter.</p> : null}
      {currentUrl ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 sm:p-4">
          <p className="text-xs text-emerald-200">En ligne · Mise à jour le {new Date(current!.updatedAt).toLocaleString('fr-FR')}</p>
          <label className="mt-3 block text-xs text-slate-300" htmlFor="public-newsletter-url">Lien public</label>
          <input id="public-newsletter-url" readOnly value={currentUrl} onFocus={(event) => event.target.select()} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 text-base text-white" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary min-h-11 text-sm" onClick={() => copy(currentUrl)}>Copier le lien</button>
            <a href={currentUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex min-h-11 items-center text-sm">Ouvrir la page publique ↗</a>
            {canShare ? <button type="button" className="btn-secondary min-h-11 text-sm" onClick={share}>Partager…</button> : null}
          </div>
        </div>
      ) : null}
      {publications.length > 0 ? (
        <details className="mt-4 border-t border-white/10 pt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-200">Tous les liens publiés ({publications.length})</summary>
          <button type="button" className="btn-secondary mb-3 min-h-11 text-sm" onClick={() => copy(publications.map((item) => {
            const campaign = campaigns.find((campaign) => campaign.id === item.campaignId);
            return `${campaign ? `${campaign.month} ${campaign.year}` : item.monthKey}\n${origin}${publicationPath(item)}`;
          }).join('\n\n'))}>Copier tous les liens</button>
          <ul className="space-y-3">
            {publications.map((item) => {
              const campaign = campaigns.find((campaign) => campaign.id === item.campaignId);
              const url = `${origin}${publicationPath(item)}`;
              return <li key={item.id} className="flex flex-col gap-2 rounded-lg bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <a href={url} target="_blank" rel="noreferrer" className="min-w-0 break-words text-sm font-medium underline underline-offset-4">{campaign ? `${campaign.month} ${campaign.year} · ${campaign.headline}` : item.monthKey} ↗</a>
                <button type="button" className="btn-secondary min-h-11 shrink-0 text-sm" onClick={() => copy(url)}>Copier le lien</button>
              </li>;
            })}
          </ul>
        </details>
      ) : null}
      {notice ? <p role="status" className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
      {error ? <div role="alert" className="mt-3 text-sm text-rose-200">{error} {isSignedIn && !loaded ? <button type="button" className="min-h-11 underline" onClick={load} disabled={loading}>Réessayer</button> : null}</div> : null}
    </section>
  );
}
