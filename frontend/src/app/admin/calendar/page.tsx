'use client';

import Link from 'next/link';
import { AppShell } from '../../../components/AppShell';
import { Guard } from '../../../components/Guard';

type CalendarItem = {
  time: string;
  title: string;
  type: string;
  detail: string;
  href?: string;
};

const days: Array<{ day: string; date: string; events: CalendarItem[] }> = [
  { day: 'Lunes', date: '14 sept.', events: [] },
  {
    day: 'Martes',
    date: '15 sept.',
    events: [
      {
        time: '17:15',
        title: 'Ceremonia del Grito de Independencia',
        type: 'Fiestas Patrias',
        detail: 'Zócalo de la Ciudad de México',
        href: 'https://mexicocity.cdmx.gob.mx/capital-nocturna/festivales-y-celebraciones/',
      },
    ],
  },
  {
    day: 'Miércoles',
    date: '16 sept.',
    events: [
      {
        time: '09:00',
        title: 'Publicación · Desfile del 16 de septiembre',
        type: 'Buffer',
        detail: 'Instagram, Facebook y LinkedIn',
        href: 'https://publish.buffer.com/schedule/calendar/week',
      },
      {
        time: '10:00',
        title: 'Desfile Cívico Militar',
        type: 'Celebración nacional',
        detail: 'Centro Histórico · Reforma · Campo Marte',
        href: 'https://www.gob.mx/cjef/articulos/16-de-septiembre-desfile-militar',
      },
    ],
  },
  { day: 'Jueves', date: '17 sept.', events: [] },
  { day: 'Viernes', date: '18 sept.', events: [] },
];

const priorities = [
  'Confirmar que los tres borradores del 16 de septiembre aparecen en Buffer.',
  'Revisar el texto y la imagen antes de aprobar la publicación.',
  'Controlar cierres viales y avisos oficiales antes de orientar a los huéspedes.',
];

export default function AdminCalendarPage() {
  const eventCount = days.reduce((total, day) => total + day.events.length, 0);

  return (
    <Guard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Planificación · Semana del 14 al 18 de septiembre</p>
            <h1 className="text-3xl font-semibold">Calendario de marketing</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Fiestas Patrias, publicaciones sociales y acciones de comunicación de Suites Mine.
            </p>
          </div>
          <Link href="/admin/mail" className="btn-primary w-fit">Abrir el estudio marketing</Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-5">
            {days.map((day) => (
              <div key={day.date} className="card min-h-[430px] p-4">
                <p className="text-sm font-semibold">{day.day}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{day.date}</p>
                <div className="mt-4 space-y-3">
                  {day.events.map((event) => (
                    <a
                      key={`${day.date}-${event.time}-${event.title}`}
                      href={event.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[color:var(--accent)]">{event.time}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{event.type}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{event.detail}</p>
                    </a>
                  ))}
                  {!day.events.length ? <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">Sin acción programada</p> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Esta semana</p>
              <p className="mt-2 text-3xl font-semibold">{eventCount} acciones</p>
              <p className="mt-1 text-sm text-slate-400">2 celebraciones y 1 publicación Buffer.</p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Prioridades</p>
              <div className="mt-4 space-y-3">
                {priorities.map((item) => (
                  <div key={item} className="rounded-xl bg-white/5 p-3 text-sm text-slate-200 ring-1 ring-white/10">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Próxima publicación</p>
              <p className="mt-2 text-lg font-semibold">Desfile del 16 de septiembre</p>
              <p className="mt-2 text-sm text-slate-400">Miércoles 16 · 09:00 · Instagram, Facebook y LinkedIn.</p>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
