'use client';

import { AppShell } from '../../../components/AppShell';
import { Guard } from '../../../components/Guard';

const segments = [
  { name: 'Repeat leisure guests', count: 1240, tone: 'Spa / weekend' },
  { name: 'Family summer guests', count: 860, tone: 'School holidays' },
  { name: 'Corporate long stay', count: 312, tone: 'Invoice-ready stays' },
  { name: 'Restaurant loyal guests', count: 540, tone: 'Dinner credit' },
];

const campaigns = [
  { title: 'July Spa Return Offer', status: 'Scheduled', audience: 'Repeat leisure guests', date: 'Jul 18', open: '42%' },
  { title: 'Family Summer Week', status: 'Draft', audience: 'Family summer guests', date: 'Jul 22', open: '-' },
  { title: 'Corporate Autumn Rates', status: 'Review', audience: 'Corporate long stay', date: 'Jul 25', open: '-' },
];

export default function AdminMailPage() {
  return (
    <Guard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Marketing</p>
            <h1 className="text-3xl font-semibold">Newsletter Studio</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Simulated hotel mailing workspace for guest segmentation, newsletter preview and campaign planning.
            </p>
          </div>
          <button className="btn-primary w-fit">Schedule campaign</button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Subscribers" value="2,952" hint="+184 this month" />
          <Metric label="Avg. open rate" value="41.8%" hint="Last 5 campaigns" />
          <Metric label="Return bookings" value="38" hint="From newsletter" />
          <Metric label="Projected revenue" value="$31.4k" hint="Next 30 days" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Campaign Preview</p>
                <h2 className="mt-1 text-2xl font-semibold">Your private spa weekend is waiting</h2>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                Ready
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#f8f2e7] text-[#1f2933]">
              <div className="bg-[#c9a66b] px-5 py-4 text-lg font-bold text-[#24180d]">Suites Mine</div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8a6b3d]">Members only</p>
                <h3 className="mt-2 text-3xl font-semibold">A quiet suite, breakfast included, spa credit ready.</h3>
                <p className="mt-4 text-sm leading-6 text-[#48515c]">
                  Camille, your last stay was in our garden wing. This July, return for two nights with late checkout
                  and a $120 spa credit reserved for returning guests.
                </p>
                <button className="mt-5 rounded-lg bg-[#1f2933] px-4 py-2 text-sm font-semibold text-white">
                  Reserve my weekend
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Segments</p>
              <div className="mt-4 space-y-3">
                {segments.map((segment) => (
                  <div key={segment.name} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{segment.name}</p>
                      <p className="text-sm text-slate-300">{segment.count.toLocaleString()}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{segment.tone}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 card overflow-hidden">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.5fr_0.4fr] gap-3 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.12em] text-slate-400">
            <span>Campaign</span>
            <span>Audience</span>
            <span>Date</span>
            <span>Status</span>
            <span>Open</span>
          </div>
          {campaigns.map((campaign) => (
            <div key={campaign.title} className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.5fr_0.4fr] gap-3 px-5 py-4 text-sm">
              <span className="font-medium">{campaign.title}</span>
              <span className="text-slate-300">{campaign.audience}</span>
              <span className="text-slate-300">{campaign.date}</span>
              <span className="text-slate-300">{campaign.status}</span>
              <span className="text-slate-300">{campaign.open}</span>
            </div>
          ))}
        </div>
      </AppShell>
    </Guard>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
