'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SignInButton, useAuth } from '@clerk/nextjs';
import { campaignMonthKey, type NewsletterCampaign } from '@/lib/campaignWorkspace';
import { agendaFields, agendaFieldLabels, agendaLanguages, agendaStatuses, draftIssues, importCampaignEvents, newWebsiteEvent, type AgendaDraft, type AgendaLanguage, type WebsiteAgenda, type WebsiteEvent } from '@/lib/websiteAgenda';

export function WebsiteAgendaPanel({ selected, branding, beforeApprove, onApproved }: {
  selected: NewsletterCampaign; branding: object; beforeApprove: () => Promise<void>; onApproved: () => void;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [sites, setSites] = useState<WebsiteAgenda[]>([]);
  const [agendaId, setAgendaId] = useState('');
  const [record, setRecord] = useState<AgendaDraft | null>(null);
  const [events, setEvents] = useState<WebsiteEvent[]>([]);
  const [baseline, setBaseline] = useState('[]');
  const [eventIndex, setEventIndex] = useState(0);
  const [language, setLanguage] = useState<AgendaLanguage>('es');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const monthKey = campaignMonthKey(selected);
  const site = sites.find(item => item.id === agendaId);
  const event = events[eventIndex];
  const validation = draftIssues(events, monthKey);
  const dirty = JSON.stringify(events) !== baseline;
  const context = `${agendaId}:${monthKey}:${selected.id}`;
  const activeContext = useRef(context); activeContext.current = context;
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const generation = useRef(0);

  const request = useCallback(async <T,>(query = '', init?: RequestInit): Promise<T> => {
    const token = await getToken();
    if (!token) throw new Error('Connectez-vous pour gérer les agendas.');
    const response = await fetch(`/api/website-agendas${query}`, {
      ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(' · ') : data.message || 'Agenda indisponible.');
    return data as T;
  }, [getToken]);

  const loadSites = useCallback(async () => {
    const response = await request<WebsiteAgenda[]>();
    setSites(response); setAgendaId(current => response.some(s => s.id === current) ? current : response[0]?.id || '');
  }, [request]);

  useEffect(() => {
    if (isSignedIn) void loadSites().catch(error => setError(error.message));
    else { setSites([]); setAgendaId(''); setRecord(null); }
  }, [isSignedIn, loadSites]);

  const query = useCallback((id: string, key: string, action?: string) => `?${new URLSearchParams({ agendaId: id, month: key, ...(action ? { action } : {}) })}`, []);

  const load = useCallback(async () => {
    const run = ++generation.current;
    if (!agendaId || !monthKey || !isSignedIn) return;
    setLoading(true); setRecord(null); setEvents([]); setError(''); setNotice('');
    try {
      const value = await request<AgendaDraft>(query(agendaId, monthKey));
      if (run !== generation.current) return;
      const next = value.updatedAt ? value.events : importCampaignEvents(selectedRef.current, monthKey);
      setRecord(value); setEvents(next); setBaseline(JSON.stringify(next)); setEventIndex(0);
    } catch (error) { if (run === generation.current) setError(error instanceof Error ? error.message : 'Lecture impossible.'); }
    finally { if (run === generation.current) setLoading(false); }
  }, [agendaId, monthKey, isSignedIn, query, request]);

  useEffect(() => { void load(); return () => { generation.current++; }; }, [load, selected.id]);

  const save = async (): Promise<AgendaDraft> => {
    const captured = context;
    const result = await request<AgendaDraft>(query(agendaId, monthKey), {
      method: 'PUT', body: JSON.stringify({ campaignId: selected.id, events, expectedUpdatedAt: record?.updatedAt || undefined }),
    });
    if (activeContext.current === captured) { setRecord(result); setEvents(result.events); setBaseline(JSON.stringify(result.events)); }
    return result;
  };

  const run = async (approve: boolean) => {
    setBusy(true); setNotice(''); setError(''); const captured = context;
    try {
      if (approve) await beforeApprove();
      const saved = await save();
      if (approve) {
        const result = await request<AgendaDraft>(query(agendaId, monthKey, 'approve'), {
          method: 'POST', body: JSON.stringify({ expectedUpdatedAt: saved.updatedAt, newsletter: { campaignId: selected.id, campaign: selected, branding } }),
        });
        if (activeContext.current === captured) { setRecord(result); setEvents(result.events); setBaseline(JSON.stringify(result.events)); }
        onApproved();
        await loadSites();
        if (activeContext.current === captured) setNotice(result.status === 'SCHEDULED'
          ? `Agenda validé pour ${site?.name}. Il s’affichera automatiquement le 1er du mois à 00 h, heure de Mexico. Le lien de présentation est également prêt.`
          : `Agenda validé pour ${site?.name}. La version publique est mise à jour. Le lien de présentation est également prêt.`);
      } else if (activeContext.current === captured) setNotice('Préparation sauvegardée. La version publique est conservée jusqu’à votre validation.');
    } catch (error) { if (activeContext.current === captured) setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };

  const patch = (value: Partial<WebsiteEvent>) => setEvents(current => current.map((item, index) => index === eventIndex ? { ...item, ...value } : item));
  const input = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-base text-white';
  const disabled = busy || loading;

  return <section className="card mb-6 min-w-0 p-4 sm:p-5" aria-labelledby="website-agenda-title">
    <p className="text-xs uppercase tracking-[0.18em] text-[#dfb85f]">Publication automatique · Sites web</p>
    <h2 id="website-agenda-title" className="mt-2 text-xl font-semibold">Agenda des sites · {selected.month} {selected.year}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Préparez les trois langues puis validez chaque site. Le mois validé s’affichera automatiquement à sa date, à l’heure de Mexico, sans autre intervention. Les brouillons ne sont pas publics.</p>
    {!isLoaded ? <p className="mt-4 text-sm">Chargement…</p> : !isSignedIn ? <SignInButton mode="modal"><button type="button" className="btn-primary mt-4 min-h-11 text-sm">Se connecter pour programmer</button></SignInButton> : <>
      <div className="mt-4 flex flex-wrap gap-2">{sites.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => setAgendaId(item.id)} className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold ${item.id === agendaId ? 'border-[#dfb85f] bg-[#dfb85f] text-[#17231e]' : 'border-white/15 bg-white/5 text-slate-200'}`}>{item.name}</button>)}</div>
      {!sites.length && !error ? <p className="mt-4 text-sm text-slate-400">Aucun site n’est encore relié à ce workspace.</p> : null}
      {site ? <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-lg bg-white/5 px-3 py-2">{agendaStatuses[record?.status || 'DRAFT']}</span>
        <a className="inline-flex min-h-11 items-center text-[#dfb85f] underline underline-offset-4" href={`${site.origin}${site.path}`} target="_blank" rel="noreferrer">Ouvrir {site.name} ↗</a>
        {record?.approvedAt ? <span className="text-xs text-slate-400">Validé le {new Date(record.approvedAt).toLocaleString('fr-FR')}</span> : null}
      </div> : null}
      {loading ? <p className="mt-4 text-sm text-slate-400">Lecture de la préparation…</p> : site && record ? <fieldset disabled={disabled} className="mt-4 min-w-0 rounded-xl border border-white/10 p-3 sm:p-4">
        <legend className="px-2 text-sm text-slate-200">Événements et traductions</legend>
        {dirty || record.hasPendingChanges ? <p className="mb-3 text-sm text-amber-200">Modifications en attente : la dernière version validée reste publique.</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary min-h-11 text-sm" type="button" onClick={() => { setEvents(importCampaignEvents(selected, monthKey, events)); setEventIndex(0); setNotice('Événements de la campagne repris. Les traductions des textes modifiés sont à vérifier et compléter.'); }}>Reprendre les événements de la campagne</button>
          <button className="btn-secondary min-h-11 text-sm" type="button" onClick={() => { setEventIndex(events.length); setEvents(current => [...current, newWebsiteEvent(monthKey, `event-${crypto.randomUUID()}`)]); }}>Ajouter un événement</button>
        </div>
        {events.length ? <>
          <label className="mt-4 block text-sm text-slate-300">Événement ({events.length})<select className={input} value={eventIndex} onChange={e => setEventIndex(Number(e.target.value))}>{events.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title.es || 'Nouvel événement'}</option>)}</select></label>
          {event ? <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Date de classement<input type="date" className={input} value={event.sortDate} onChange={e => patch({ sortDate: e.target.value })} /></label><label className="text-sm text-slate-300">Heure locale de Mexico (facultative)<input type="time" className={input} value={event.sortTime} onChange={e => patch({ sortTime: e.target.value })} /></label></div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Langue des événements">{agendaLanguages.map(lang => <button type="button" key={lang} onClick={() => setLanguage(lang)} className={`min-h-11 rounded-lg border px-4 py-2 text-sm ${language === lang ? 'border-[#dfb85f] text-[#dfb85f]' : 'border-white/15 text-slate-300'}`}>{lang === 'zh' ? '中文' : lang.toUpperCase()} · {validation.languages[lang] ? 'Complet' : 'À compléter'}</button>)}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{agendaFields.map(field => <label key={field} className={`block text-sm text-slate-300 ${field === 'description' ? 'sm:col-span-2' : ''}`}>{agendaFieldLabels[field]} · {language === 'zh' ? '中文' : language.toUpperCase()}{field === 'description' ? <textarea rows={4} maxLength={2000} className={input} value={event[field][language]} onChange={e => patch({ [field]: { ...event[field], [language]: e.target.value } })} /> : <input maxLength={field === 'category' ? 80 : field === 'date' ? 200 : 300} className={input} value={event[field][language]} onChange={e => patch({ [field]: { ...event[field], [language]: e.target.value } })} />}</label>)}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Lien officiel HTTPS<input type="url" className={input} value={event.url} onChange={e => patch({ url: e.target.value })} /></label><label className="text-sm text-slate-300">URL de l’affiche officielle (facultative)<input className={input} value={event.imageUrl} onChange={e => patch({ imageUrl: e.target.value })} /></label></div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-11 text-sm" onClick={() => patch({ title: { es: event.title.es, en: event.title.es, zh: event.title.es } })}>Conserver ce nom officiel dans les trois langues</button><button type="button" className="min-h-11 rounded-lg border border-rose-300/20 px-4 py-2 text-sm text-rose-200" onClick={() => { setEvents(current => current.filter((_, index) => index !== eventIndex)); setEventIndex(0); }}>Retirer de la préparation</button></div>
          </> : null}
        </> : <p className="mt-4 text-sm text-slate-400">Reprenez les événements de la campagne ou ajoutez-en un pour préparer ce mois.</p>}
        {validation.issues.length ? <details className="mt-4 text-sm text-amber-200"><summary className="min-h-11 cursor-pointer">{validation.issues.length} points à compléter avant validation</summary><ul className="list-disc space-y-1 pl-5">{validation.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></details> : <p className="mt-4 text-sm text-emerald-200">ES · EN · 中文 : les trois versions sont complètes.</p>}
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-11 text-sm" onClick={() => run(false)}>Enregistrer la préparation</button><button type="button" className="btn-primary min-h-11 text-sm" disabled={validation.issues.length > 0} onClick={() => run(true)}>{record.status === 'LIVE' ? 'Valider et mettre à jour le site' : 'Valider et programmer ce mois'}</button><button type="button" className="min-h-11 px-3 text-sm text-slate-400 underline" onClick={load}>Recharger la préparation</button></div>
      </fieldset> : null}
      {site?.months.length ? <details className="mt-4 border-t border-white/10 pt-3"><summary className="min-h-11 cursor-pointer text-sm">Calendrier de {site.name} ({site.months.length} mois)</summary><ul className="space-y-2 text-sm">{site.months.map(item => <li key={item.monthKey} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"><span>{item.monthKey}</span><span>{agendaStatuses[item.status]}</span></li>)}</ul></details> : null}
    </>}
    {busy ? <p role="status" className="mt-3 text-sm text-slate-300">{site?.name} : enregistrement en cours…</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
    {error ? <div role="alert" className="mt-3 text-sm text-rose-200">{error} <button type="button" className="min-h-11 underline" onClick={() => { void (site ? load() : loadSites()).catch(error => setError(error.message)); }}>Réessayer</button></div> : null}
  </section>;
}
