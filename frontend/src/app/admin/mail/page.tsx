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

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
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
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Apercu email premium</p>
              <NewsletterPreview campaign={selected} setup={setup} subject={subject} preheader={preheader} body={body} />
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
        eyebrow: campaign.eyebrow,
        heroImage: setup.heroImage,
        body,
        cta: campaign.cta,
        highlights: campaign.highlights,
        mergeTags: campaign.mailchimp.mergeTags,
        html: buildMailchimpHtml(campaign, setup, subject, preheader, body),
      },
    },
  };
}

function NewsletterPreview({
  campaign,
  setup,
  subject,
  preheader,
  body,
}: {
  campaign: NewsletterCampaign;
  setup: MailchimpSetup;
  subject: string;
  preheader: string;
  body: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[#d6c8ad] bg-[#efe7d8] p-3 text-[#1d1a16] shadow-2xl shadow-black/25">
      <div className="mx-auto max-w-[720px] overflow-hidden rounded-md bg-[#fbf8f1]">
        <div className="bg-[#18251f] px-6 py-3 text-center text-xs text-[#d7c6a3]">
          {preheader}
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-[#e3d7c3] px-7 py-5">
          <div>
            <p className="font-serif text-2xl font-semibold tracking-normal text-[#1f2f28]">Suites Mine</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#9c7a3f]">Apart hotel | CDMX</p>
          </div>
          <div className="text-right text-xs leading-5 text-[#6f6658]">
            <p>Rio Ebro 64</p>
            <p>Colonia Cuauhtemoc</p>
          </div>
        </div>

        <div className="relative">
          <div
            aria-label="Suites Mine"
            className="h-72 w-full bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${setup.heroImage})` }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-7 pb-7 pt-20 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-[#e6c77d]">{campaign.eyebrow}</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight tracking-normal">{campaign.headline}</h2>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_220px]">
          <div className="px-7 py-7">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9c7a3f]">{campaign.month}</p>
            <h3 className="mt-2 font-serif text-2xl leading-snug tracking-normal text-[#203229]">{subject}</h3>
            <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#4c453b]">
              {body.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <button className="mt-7 rounded-md bg-[#1f3a31] px-6 py-3 text-sm font-semibold text-white" type="button">
              {campaign.cta}
            </button>
          </div>

          <aside className="border-t border-[#e3d7c3] bg-[#f3ead9] px-6 py-7 md:border-l md:border-t-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[#9c7a3f]">Incluye</p>
            <div className="mt-4 space-y-3">
              {campaign.highlights.map((item) => (
                <div key={item} className="rounded-md border border-[#d8c8ad] bg-white/55 p-3 text-sm leading-5 text-[#3d382f]">
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="border-t border-[#e3d7c3] bg-[#18251f] px-7 py-6 text-sm text-[#f4ead7]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Suites Mine</p>
              <p className="mt-1 text-xs text-[#d7c6a3]">{setup.address}</p>
            </div>
            <div className="text-xs text-[#d7c6a3] md:text-right">
              <p>{setup.phone}</p>
              <p>{setup.replyTo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMailchimpHtml(
  campaign: NewsletterCampaign,
  setup: MailchimpSetup,
  subject: string,
  preheader: string,
  body: string,
) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 18px;color:#4c453b;font-size:15px;line-height:1.75;">${escapeHtml(paragraph)}</p>`)
    .join('');
  const highlights = campaign.highlights
    .map((item) => `<td style="padding:8px;"><div style="border:1px solid #d8c8ad;background:#fffaf0;padding:14px;border-radius:8px;color:#3d382f;font-size:14px;line-height:1.5;">${escapeHtml(item)}</div></td>`)
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#efe7d8;font-family:Arial,Helvetica,sans-serif;color:#1d1a16;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#efe7d8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;width:100%;background:#fbf8f1;border:1px solid #d6c8ad;border-radius:10px;overflow:hidden;">
            <tr><td style="background:#18251f;color:#d7c6a3;text-align:center;padding:12px 24px;font-size:12px;">${escapeHtml(preheader)}</td></tr>
            <tr>
              <td style="padding:24px 30px;border-bottom:1px solid #e3d7c3;">
                <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1f2f28;">Suites Mine</div>
                <div style="margin-top:6px;color:#9c7a3f;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Apart hotel | CDMX</div>
              </td>
            </tr>
            <tr><td><img src="${escapeHtml(setup.heroImage)}" alt="Suites Mine" width="680" style="display:block;width:100%;height:auto;border:0;" /></td></tr>
            <tr>
              <td style="padding:34px 34px 20px;">
                <div style="color:#9c7a3f;font-size:12px;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(campaign.eyebrow)}</div>
                <h1 style="margin:12px 0 8px;font-family:Georgia,serif;font-size:38px;line-height:1.12;color:#203229;">${escapeHtml(campaign.headline)}</h1>
                <h2 style="margin:0 0 24px;font-size:18px;line-height:1.45;color:#5b5348;font-weight:500;">${escapeHtml(subject)}</h2>
                ${paragraphs}
                <a href="${escapeHtml(setup.reservationUrl)}" style="display:inline-block;margin-top:8px;background:#1f3a31;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;font-size:14px;">${escapeHtml(campaign.cta)}</a>
              </td>
            </tr>
            <tr><td style="padding:0 26px 28px;"><table role="presentation" width="100%"><tr>${highlights}</tr></table></td></tr>
            <tr>
              <td style="background:#18251f;color:#f4ead7;padding:24px 30px;font-size:13px;line-height:1.6;">
                <strong>Suites Mine</strong><br />
                ${escapeHtml(setup.address)}<br />
                ${escapeHtml(setup.phone)} | ${escapeHtml(setup.replyTo)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
