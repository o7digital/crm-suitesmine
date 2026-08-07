'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { Guard } from '../../../components/Guard';
import { useApi, useAuth } from '../../../contexts/AuthContext';
import seed from '../../../lib/newsletterCampaigns.json';

type MailchimpSetup = typeof seed.mailchimp;
type NewsletterCampaign = (typeof seed.campaigns)[number];

type TenantSettingsResponse = {
  settings: {
    marketingSetup?: MailchimpSetup | null;
  };
};

const emptyMailchimp: MailchimpSetup = seed.mailchimp;

export default function AdminMailPage() {
  const { token } = useAuth();
  const api = useApi(token);
  const [campaignId, setCampaignId] = useState(seed.campaigns[0].id);
  const [setup, setSetup] = useState<MailchimpSetup>(emptyMailchimp);
  const [subject, setSubject] = useState(seed.campaigns[0].subject);
  const [preheader, setPreheader] = useState(seed.campaigns[0].preheader);
  const [body, setBody] = useState(seed.campaigns[0].body);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => seed.campaigns.find((campaign) => campaign.id === campaignId) ?? seed.campaigns[0],
    [campaignId],
  );

  useEffect(() => {
    setSubject(selected.subject);
    setPreheader(selected.preheader);
    setBody(selected.body);
  }, [selected]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await api<TenantSettingsResponse>('/tenant/settings');
        const marketingSetup = response.settings.marketingSetup;
        if (!cancelled && marketingSetup?.provider === 'MAILCHIMP') {
          setSetup({
            ...emptyMailchimp,
            ...marketingSetup,
            mailchimp: {
              ...emptyMailchimp.mailchimp,
              ...(marketingSetup.mailchimp ?? {}),
            },
          });
        }
      } catch (err) {
        if (!cancelled) setStatus(err instanceof Error ? err.message : 'Impossible de charger Mailchimp.');
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const payload = useMemo(
    () => buildMailchimpPayload(selected, setup, subject, preheader, body),
    [body, preheader, selected, setup, subject],
  );

  const jsonPayload = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const saveMailchimp = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await api('/tenant/settings', {
        method: 'PATCH',
        body: JSON.stringify({ marketingSetup: setup }),
      });
      setStatus('Configuration Mailchimp sauvegardee en JSON.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sauvegarde impossible.');
    } finally {
      setSaving(false);
    }
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonPayload);
    setStatus('Payload JSON copie.');
  };

  return (
    <Guard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Marketing</p>
            <h1 className="text-3xl font-semibold">Mailing Mailchimp</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Interface prete pour le compte Mailchimp client, avec 5 newsletters en JSON: Marzo, Abril, Junio,
              Agosto et Septiembre.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-sm" type="button" onClick={copyJson}>
              Copier JSON
            </button>
            <button className="btn-primary text-sm" type="button" onClick={saveMailchimp} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauver Mailchimp'}
            </button>
          </div>
        </div>

        {status ? <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{status}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Campagnes annoncees</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                {seed.campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setCampaignId(campaign.id)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      campaign.id === campaignId
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-slate-950'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {campaign.month}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Configuration Mailchimp</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Nom compte" value={setup.accountLabel ?? ''} onChange={(accountLabel) => setSetup((prev) => ({ ...prev, accountLabel }))} />
                <Field label="From name" value={setup.fromName ?? ''} onChange={(fromName) => setSetup((prev) => ({ ...prev, fromName }))} />
                <Field label="From email" value={setup.fromEmail ?? ''} onChange={(fromEmail) => setSetup((prev) => ({ ...prev, fromEmail }))} />
                <Field label="Reply-to" value={setup.replyTo ?? ''} onChange={(replyTo) => setSetup((prev) => ({ ...prev, replyTo }))} />
                <Field label="Server prefix" value={setup.mailchimp.serverPrefix} onChange={(serverPrefix) => setSetup((prev) => ({ ...prev, mailchimp: { ...prev.mailchimp, serverPrefix } }))} placeholder="us21" />
                <Field label="Audience ID" value={setup.mailchimp.audienceId} onChange={(audienceId) => setSetup((prev) => ({ ...prev, mailchimp: { ...prev.mailchimp, audienceId } }))} />
                <Field label="API key" value={setup.mailchimp.apiKey} onChange={(apiKey) => setSetup((prev) => ({ ...prev, mailchimp: { ...prev.mailchimp, apiKey } }))} placeholder="a renseigner cote client" />
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Edition newsletter</p>
              <div className="mt-4 space-y-3">
                <Field label="Objet" value={subject} onChange={setSubject} />
                <Field label="Preheader" value={preheader} onChange={setPreheader} />
                <label className="block text-sm text-slate-300">
                  Corps
                  <textarea
                    className="mt-2 min-h-56 w-full rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none focus:border-[color:var(--accent)]"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="card p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Info label="Fenetre" value={selected.sendWindow} />
                <Info label="Segment" value={selected.segment} />
                <Info label="Objectif" value={selected.goal} />
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Apercu email</p>
              <div className="mt-4 overflow-hidden rounded-lg border border-[#d8dee9] bg-[#f8fafc] text-[#111827]">
                <div className="bg-[#0f766e] px-6 py-5 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#ccfbf1]">Suites Mine</p>
                  <p className="mt-2 text-sm">{preheader}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#0f766e]">{selected.month}</p>
                  <h2 className="mt-2 text-3xl font-semibold leading-tight">{selected.headline}</h2>
                  <div className="mt-5 space-y-4 text-sm leading-7 text-[#374151]">
                    {body.split(/\n{2,}/).map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <button className="mt-6 rounded-lg bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white" type="button">
                    {selected.cta}
                  </button>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">JSON Mailchimp pret</p>
              <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg bg-slate-950/70 p-4 text-xs leading-5 text-slate-200">
                {jsonPayload}
              </pre>
            </div>
          </section>
        </div>
      </AppShell>
    </Guard>
  );
}

function buildMailchimpPayload(
  campaign: NewsletterCampaign,
  setup: MailchimpSetup,
  subject: string,
  preheader: string,
  body: string,
) {
  return {
    provider: 'MAILCHIMP',
    status: 'READY_FOR_CLIENT_ACCOUNT',
    account: setup,
    campaign: {
      id: campaign.id,
      month: campaign.month,
      sendWindow: campaign.sendWindow,
      segment: campaign.segment,
      goal: campaign.goal,
      type: campaign.mailchimp.campaignType,
      tags: campaign.mailchimp.tags,
      settings: {
        subject_line: subject,
        preview_text: preheader,
        title: `${campaign.month} - ${campaign.headline}`,
        from_name: setup.fromName,
        reply_to: setup.replyTo || setup.fromEmail,
        campaign_title: campaign.id,
      },
      recipients: {
        list_id: setup.mailchimp.audienceId,
        segment_text: campaign.segment,
      },
      tracking: {
        opens: true,
        html_clicks: true,
        text_clicks: true,
        goal_tracking: true,
        ecomm360: false,
        google_analytics: campaign.mailchimp.utmCampaign,
      },
      content: {
        headline: campaign.headline,
        body,
        cta: campaign.cta,
        mergeTags: campaign.mailchimp.mergeTags,
      },
    },
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-[color:var(--accent)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}
