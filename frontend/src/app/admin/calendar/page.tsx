'use client';

import { AppShell } from '../../../components/AppShell';
import { Guard } from '../../../components/Guard';

const days = [
  {
    day: 'Mon 20',
    events: [
      { time: '09:30', title: 'Review spa newsletter audience', type: 'Marketing', guest: 'Repeat leisure segment' },
      { time: '15:00', title: 'Call Nadia for suite dates', type: 'Sales', guest: 'Nadia Benali' },
    ],
  },
  {
    day: 'Tue 21',
    events: [
      { time: '10:00', title: 'Send July Spa Return Offer', type: 'Newsletter', guest: '1,240 guests' },
      { time: '17:30', title: 'Arrival note for Jonas', type: 'Service', guest: 'Jonas Weber' },
    ],
  },
  {
    day: 'Wed 22',
    events: [{ time: '11:00', title: 'Family Summer Week draft', type: 'Newsletter', guest: 'Family segment' }],
  },
  {
    day: 'Thu 23',
    events: [
      { time: '12:00', title: 'Corporate rate follow-up', type: 'Sales', guest: 'Mateo Rodriguez' },
      { time: '16:00', title: 'Post-stay survey review', type: 'Marketing', guest: 'Last week checkouts' },
    ],
  },
  {
    day: 'Fri 24',
    events: [{ time: '14:30', title: 'Weekend occupancy campaign', type: 'Revenue', guest: 'Local subscribers' }],
  },
];

const priorities = [
  'Confirm spa campaign subject line before Tuesday 10:00.',
  'Move warm corporate prospects into Stay follow-up after call.',
  'Prepare weekend occupancy email if forecast stays below 72%.',
];

export default function AdminCalendarPage() {
  return (
    <Guard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Planning</p>
            <h1 className="text-3xl font-semibold">Marketing Calendar</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Simulated weekly calendar for newsletters, guest follow-ups, arrival moments and revenue campaigns.
            </p>
          </div>
          <button className="btn-primary w-fit">Add event</button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-5">
            {days.map((day) => (
              <div key={day.day} className="card min-h-[430px] p-4">
                <p className="text-sm font-semibold">{day.day}</p>
                <div className="mt-4 space-y-3">
                  {day.events.map((event) => (
                    <div key={`${day.day}-${event.time}-${event.title}`} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[color:var(--accent)]">{event.time}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">{event.type}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{event.guest}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">This week</p>
              <p className="mt-2 text-3xl font-semibold">8 events</p>
              <p className="mt-1 text-sm text-slate-400">3 newsletters, 3 guest follow-ups, 2 revenue actions</p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Priorities</p>
              <div className="mt-4 space-y-3">
                {priorities.map((item) => (
                  <div key={item} className="rounded-xl bg-white/5 p-3 text-sm text-slate-200 ring-1 ring-white/10">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Next send</p>
              <p className="mt-2 text-lg font-semibold">July Spa Return Offer</p>
              <p className="mt-2 text-sm text-slate-400">Audience: 1,240 repeat leisure guests. Expected opens: 520.</p>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
