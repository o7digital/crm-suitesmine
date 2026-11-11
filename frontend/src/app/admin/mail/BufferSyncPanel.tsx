'use client';

import { useCallback, useEffect, useState } from 'react';
import { bufferSyncBatches } from '@/lib/campaignWorkspace';

type ApiClient = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
type SyncPost = {
  campaignId: string; eventId: string; channelId: string; postId: string;
  status: string; service: string; dueAt: string | null; text: string; changedInBuffer: boolean; syncedAt: string;
};
type SyncResult = { eventId: string; channelId: string; postId?: string; action: string; status?: string; message?: string };
export type SyncResponse = { ok: boolean; checkedAt: string; results: SyncResult[] };
const statusLabels: Record<string, string> = { draft: 'Brouillon', scheduled: 'Programmé', buffer: 'Programmé', sent: 'Publié', error: 'Erreur Buffer', missing: 'Supprimé dans Buffer' };
const actionLabels: Record<string, string> = { created: 'créés', updated: 'mis à jour', unchanged: 'déjà à jour', linked: 'reliés', protected: 'protégés', conflict: 'à vérifier', remote_changed: 'modifiés dans Buffer' };
export function syncSummary(response: SyncResponse) {
  const counts = response.results.reduce<Record<string, number>>((all, item) => ({ ...all, [item.action]: (all[item.action] || 0) + 1 }), {});
  return Object.entries(counts).map(([action, count]) => `${count} ${actionLabels[action] || action}`).join(' · ');
}

export function BufferSyncPanel({ api, campaigns, configured, beforeSync, onImported, revision }: {
  api: ApiClient;
  campaigns: Array<{ id: string; month: string; year: number; events: Array<{ id: string; title: string }> }>;
  configured: boolean;
  beforeSync: () => Promise<void>;
  onImported: (post: { eventId: string; socialText: string; imageUrl: string }) => void;
  revision: number;
}) {
  const [posts, setPosts] = useState<SyncPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState<SyncResult[]>([]);
  const [checkedAt, setCheckedAt] = useState('');
  const load = useCallback(async () => {
    const response = await api<{ posts: SyncPost[]; checkedAt: string }>('/tenant/social/buffer/sync');
    setPosts(response.posts); setCheckedAt(response.checkedAt);
  }, [api]);
  useEffect(() => {
    if (!configured) return;
    const refresh = () => { if (document.visibilityState === 'visible') void load().catch((error) => setNotice(error instanceof Error ? error.message : 'Lecture Buffer impossible.')); };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [configured, load, revision]);
  const sync = async (campaignIds: string[]) => {
    setBusy(true); setNotice(''); setResults([]);
    try {
      await beforeSync();
      const response: SyncResponse = { ok: true, checkedAt: '', results: [] };
      for (const batch of bufferSyncBatches(campaignIds)) {
        const result = await api<SyncResponse>('/tenant/social/buffer/sync', { method: 'POST', body: JSON.stringify({ campaignIds: batch }) });
        response.ok = response.ok && result.ok;
        response.checkedAt = result.checkedAt;
        response.results.push(...result.results);
        setResults([...response.results]);
      }
      setNotice(syncSummary(response));
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Synchronisation impossible.'); }
    finally { setBusy(false); }
  };
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const importPost = async (postId: string) => {
    setBusy(true); setNotice('');
    try {
      await beforeSync();
      const post = await api<{ eventId: string; socialText: string; imageUrl: string }>('/tenant/social/buffer/sync/import', { method: 'POST', body: JSON.stringify({ postId }) });
      onImported(post);
      setNotice('Le texte et le visuel Buffer sont maintenant la version source dans le CRM.');
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Import Buffer impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="card mb-6 p-5" aria-label="Synchronisation Buffer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">CRM Mailing ↔ Buffer</h2>
          <p className="mt-1 text-sm text-slate-300">Le mois courant et les mois suivants alimentent les brouillons Facebook et Instagram. Les statuts et modifications Buffer remontent ici.</p>
          <p className="mt-1 text-xs text-slate-400">La synchronisation conserve les dates des brouillons existants et les publications programmées. Les nouveaux posts restent en brouillon.</p>
        </div>
        <button type="button" disabled={!configured || busy || !campaigns.length} onClick={() => void sync(campaigns.map((campaign) => campaign.id))} className="btn-primary text-sm">
          {busy ? 'Synchronisation…' : 'Synchroniser les mois affichés'}
        </button>
      </div>
      {!configured ? <p className="mt-3 text-sm text-amber-200">Connecte Buffer dans « Réseaux · Buffer » pour synchroniser les campagnes.</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-lg bg-white/5 p-3 text-sm">{notice}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {campaigns.map((campaign) => {
          const linked = posts.filter((post) => post.campaignId === campaign.id);
          const counts = linked.reduce<Record<string, number>>((all, post) => ({ ...all, [post.status]: (all[post.status] || 0) + 1 }), {});
          return <div key={campaign.id} className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold">{campaign.month} {campaign.year}</p>
            <p className="mt-1 text-xs text-slate-400">{campaign.events.length} événements · {linked.length} posts reliés</p>
            <p className="mt-2 text-sm text-slate-300">{Object.entries(counts).map(([status, count]) => `${count} ${statusLabels[status] || status}`).join(' · ') || 'À synchroniser'}</p>
            <button type="button" disabled={!configured || busy} className="btn-secondary mt-3 text-xs" onClick={() => void sync([campaign.id])}>Synchroniser ce mois</button>
          </div>;
        })}
      </div>
      {results.filter((result) => result.message).map((result) => <p key={`${result.eventId}-${result.channelId}`} className="mt-2 text-xs text-amber-200">{campaigns.flatMap((campaign) => campaign.events).find((event) => event.id === result.eventId)?.title}: {result.message}</p>)}
      {posts.length ? <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-300">Voir les posts et leur état dans Buffer</summary>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {posts.filter((post) => campaignById.has(post.campaignId)).map((post) => {
            const campaign = campaignById.get(post.campaignId);
            return <details key={post.postId} className="rounded-lg border border-white/10 p-3 text-sm">
              <summary className="cursor-pointer">{campaign?.month} · {post.service} · {campaign?.events.find((event) => event.id === post.eventId)?.title} · {statusLabels[post.status] || post.status}{post.changedInBuffer ? ' · modifié dans Buffer' : ''}</summary>
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-300">{post.text}</p>
              <p className="mt-2 text-xs text-slate-400">{post.dueAt ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(post.dueAt)) + ' · Mexico' : 'Sans date'}</p>
              <a href="https://publish.buffer.com" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Ouvrir Buffer</a>
              {post.changedInBuffer ? <button type="button" disabled={busy} onClick={() => void importPost(post.postId)} className="btn-secondary ml-3 mt-2 text-xs">Importer cette version dans le CRM</button> : null}
            </details>;
          })}
        </div>
      </details> : null}
      {checkedAt ? <p className="mt-3 text-xs text-slate-500">Statuts actualisés à {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }).format(new Date(checkedAt))} · Mexico</p> : null}
    </section>
  );
}
