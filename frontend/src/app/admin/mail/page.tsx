'use client';

import { AppShell } from '../../../components/AppShell';
import { Guard } from '../../../components/Guard';
import { useI18n } from '../../../contexts/I18nContext';
import type { LanguageCode } from '../../../i18n/types';

type NewsletterCopy = {
  pageKicker: string;
  pageTitle: string;
  pageSubtitle: string;
  action: string;
  metrics: { label: string; value: string; hint: string }[];
  sheetTitle: string;
  subjectLabel: string;
  preheaderLabel: string;
  audienceLabel: string;
  goalLabel: string;
  subject: string;
  preheader: string;
  audience: string;
  goal: string;
  emailKicker: string;
  emailTitle: string;
  greeting: string;
  body: string[];
  cta: string;
  signature: string;
  segmentsTitle: string;
  segments: { name: string; count: string; note: string }[];
  socialTitle: string;
  socialIntro: string;
  socialPosts: { channel: string; copy: string; date: string }[];
  checklistTitle: string;
  checklist: string[];
};

const copyByLanguage: Partial<Record<LanguageCode, NewsletterCopy>> = {
  en: {
    pageKicker: 'Marketing',
    pageTitle: 'Hotel Newsletter Sheet',
    pageSubtitle: 'A complete guest newsletter draft, ready for email and later repurposed for social media.',
    action: 'Approve send',
    metrics: [
      { label: 'Audience', value: '2,952', hint: 'Qualified hotel contacts' },
      { label: 'Main segment', value: '1,240', hint: 'Returning leisure guests' },
      { label: 'Expected opens', value: '520', hint: 'Based on 42% open rate' },
      { label: 'Booking target', value: '$31.4k', hint: 'Projected 30-day revenue' },
    ],
    sheetTitle: 'Campaign Brief',
    subjectLabel: 'Subject',
    preheaderLabel: 'Preheader',
    audienceLabel: 'Audience',
    goalLabel: 'Goal',
    subject: 'Your summer return to Suites Mine starts with a quieter weekend',
    preheader: 'A suite upgrade, breakfast and spa credit for returning guests.',
    audience: 'Returning guests who stayed in the last 18 months and engaged with wellness or weekend offers.',
    goal: 'Drive direct weekend bookings for July and August without discounting the room rate.',
    emailKicker: 'Returning guest invitation',
    emailTitle: 'A quieter weekend at Suites Mine',
    greeting: 'Hello Camille,',
    body: [
      'We remember your last stay in the garden wing and the quiet morning breakfast you preferred.',
      'This summer, we are opening a limited return-guest package: two nights in a suite, breakfast included, late checkout and a spa credit reserved before arrival.',
      'If you are planning a pause before the season gets busy, our team can hold your preferred dates and prepare the room exactly as you like it.',
    ],
    cta: 'Reserve my summer weekend',
    signature: 'The Suites Mine guest relations team',
    segmentsTitle: 'Audience segments',
    segments: [
      { name: 'Returning leisure guests', count: '1,240', note: 'Spa, suite and weekend intent' },
      { name: 'Family summer guests', count: '860', note: 'School holiday package follow-up' },
      { name: 'Corporate long stay', count: '312', note: 'Invoice-ready repeat travelers' },
      { name: 'Restaurant loyal guests', count: '540', note: 'Dinner credit and local stays' },
    ],
    socialTitle: 'Social republishing plan',
    socialIntro: 'After the email send, the same offer becomes short posts for Instagram, Facebook and LinkedIn.',
    socialPosts: [
      { channel: 'Instagram', date: 'Jul 19', copy: 'A quiet suite, late checkout and a spa credit. Summer weekends at Suites Mine are made for returning guests.' },
      { channel: 'Facebook', date: 'Jul 20', copy: 'Our return-guest summer package is now open: breakfast included, suite upgrade options and a reserved spa moment.' },
      { channel: 'LinkedIn', date: 'Jul 22', copy: 'Direct booking campaign focused on loyalty, wellness and premium weekend occupancy at Suites Mine.' },
    ],
    checklistTitle: 'Before sending',
    checklist: ['Validate room availability for the next 4 weekends.', 'Confirm spa credit capacity.', 'Add direct booking UTM links.', 'Prepare follow-up task for clicked guests.'],
  },
  fr: {
    pageKicker: 'Marketing',
    pageTitle: 'Feuille Newsletter Hotel',
    pageSubtitle: 'Un vrai brouillon de newsletter client, pret pour email puis declinaison reseaux sociaux.',
    action: 'Valider l envoi',
    metrics: [
      { label: 'Audience', value: '2 952', hint: 'Contacts hotel qualifies' },
      { label: 'Segment principal', value: '1 240', hint: 'Hotes loisirs recurrents' },
      { label: 'Ouvertures prevues', value: '520', hint: 'Base taux ouverture 42%' },
      { label: 'Objectif booking', value: '$31.4k', hint: 'CA projete 30 jours' },
    ],
    sheetTitle: 'Brief de campagne',
    subjectLabel: 'Objet',
    preheaderLabel: 'Preheader',
    audienceLabel: 'Audience',
    goalLabel: 'Objectif',
    subject: 'Votre retour estival a Suites Mine commence par un week-end plus calme',
    preheader: 'Surclassement suite, petit-dejeuner et credit spa pour nos hotes fideles.',
    audience: 'Hotes revenus dans les 18 derniers mois et interesses par les offres bien-etre ou week-end.',
    goal: 'Generer des reservations directes en juillet/aout sans baisser le prix chambre.',
    emailKicker: 'Invitation hote fidele',
    emailTitle: 'Un week-end plus calme a Suites Mine',
    greeting: 'Bonjour Camille,',
    body: [
      'Nous nous souvenons de votre dernier sejour cote jardin et du petit-dejeuner tranquille que vous aviez apprecie.',
      'Cet ete, nous ouvrons une offre limitee pour nos hotes fideles: deux nuits en suite, petit-dejeuner inclus, depart tardif et credit spa reserve avant votre arrivee.',
      'Si vous souhaitez faire une pause avant la haute saison, notre equipe peut bloquer vos dates preferees et preparer la chambre selon vos habitudes.',
    ],
    cta: 'Reserver mon week-end d ete',
    signature: 'L equipe relation hotes de Suites Mine',
    segmentsTitle: 'Segments audience',
    segments: [
      { name: 'Hotes loisirs recurrents', count: '1 240', note: 'Intentions spa, suite, week-end' },
      { name: 'Familles ete', count: '860', note: 'Relance vacances scolaires' },
      { name: 'Long sejour corporate', count: '312', note: 'Voyageurs repetes avec facture' },
      { name: 'Clients restaurant fideles', count: '540', note: 'Credit diner et sejour local' },
    ],
    socialTitle: 'Plan de republication reseaux',
    socialIntro: 'Apres l email, la meme offre est transformee en posts Instagram, Facebook et LinkedIn.',
    socialPosts: [
      { channel: 'Instagram', date: '19 juil.', copy: 'Une suite calme, depart tardif et credit spa. Les week-ends d ete Suites Mine sont penses pour nos hotes fideles.' },
      { channel: 'Facebook', date: '20 juil.', copy: 'Notre offre ete hotes fideles est ouverte: petit-dejeuner inclus, options suite et moment spa reserve.' },
      { channel: 'LinkedIn', date: '22 juil.', copy: 'Campagne reservation directe axee fidelite, bien-etre et occupation premium week-end pour Suites Mine.' },
    ],
    checklistTitle: 'Avant envoi',
    checklist: ['Valider les disponibilites des 4 prochains week-ends.', 'Confirmer la capacite spa.', 'Ajouter les liens UTM reservation directe.', 'Preparer les taches de relance pour les clics.'],
  },
  es: {
    pageKicker: 'Marketing',
    pageTitle: 'Hoja de Newsletter del Hotel',
    pageSubtitle: 'Borrador completo para email, listo para enviar y luego adaptar a redes sociales.',
    action: 'Aprobar envio',
    metrics: [
      { label: 'Audiencia', value: '2,952', hint: 'Contactos hoteleros calificados' },
      { label: 'Segmento principal', value: '1,240', hint: 'Huespedes leisure recurrentes' },
      { label: 'Aperturas esperadas', value: '520', hint: 'Con tasa de apertura 42%' },
      { label: 'Objetivo reservas', value: '$31.4k', hint: 'Ingresos proyectados 30 dias' },
    ],
    sheetTitle: 'Brief de campana',
    subjectLabel: 'Asunto',
    preheaderLabel: 'Preheader',
    audienceLabel: 'Audiencia',
    goalLabel: 'Objetivo',
    subject: 'Tu regreso de verano a Suites Mine empieza con un fin de semana mas tranquilo',
    preheader: 'Upgrade a suite, desayuno y credito de spa para huespedes recurrentes.',
    audience: 'Huespedes que se alojaron en los ultimos 18 meses e interactuaron con ofertas wellness o weekend.',
    goal: 'Impulsar reservas directas de julio y agosto sin bajar la tarifa de habitacion.',
    emailKicker: 'Invitacion para huesped recurrente',
    emailTitle: 'Un fin de semana mas tranquilo en Suites Mine',
    greeting: 'Hola Camille,',
    body: [
      'Recordamos tu ultima estancia en el ala jardin y ese desayuno tranquilo que preferiste.',
      'Este verano abrimos una oferta limitada para huespedes recurrentes: dos noches en suite, desayuno incluido, late checkout y credito de spa reservado antes de tu llegada.',
      'Si quieres hacer una pausa antes de la temporada alta, nuestro equipo puede bloquear tus fechas preferidas y preparar la habitacion como te gusta.',
    ],
    cta: 'Reservar mi weekend de verano',
    signature: 'Equipo de relacion con huespedes de Suites Mine',
    segmentsTitle: 'Segmentos de audiencia',
    segments: [
      { name: 'Huespedes leisure recurrentes', count: '1,240', note: 'Interes en spa, suite y weekend' },
      { name: 'Familias de verano', count: '860', note: 'Seguimiento vacaciones escolares' },
      { name: 'Corporate long stay', count: '312', note: 'Viajeros repetidos con factura' },
      { name: 'Clientes fieles del restaurante', count: '540', note: 'Credito cena y estancia local' },
    ],
    socialTitle: 'Plan para redes sociales',
    socialIntro: 'Despues del envio por email, la misma oferta se convierte en publicaciones para Instagram, Facebook y LinkedIn.',
    socialPosts: [
      { channel: 'Instagram', date: '19 jul.', copy: 'Una suite tranquila, late checkout y credito de spa. Los weekends de verano en Suites Mine son para volver.' },
      { channel: 'Facebook', date: '20 jul.', copy: 'Ya esta abierta nuestra oferta de verano para huespedes recurrentes: desayuno incluido, opciones de suite y spa reservado.' },
      { channel: 'LinkedIn', date: '22 jul.', copy: 'Campana de reserva directa enfocada en fidelizacion, wellness y ocupacion premium de weekend en Suites Mine.' },
    ],
    checklistTitle: 'Antes del envio',
    checklist: ['Validar disponibilidad para los proximos 4 weekends.', 'Confirmar capacidad del spa.', 'Agregar links UTM de reserva directa.', 'Crear tareas de follow-up para huespedes que hagan click.'],
  },
};

function getCopy(language: LanguageCode) {
  return copyByLanguage[language] ?? copyByLanguage.en!;
}

export default function AdminMailPage() {
  const { language } = useI18n();
  const copy = getCopy(language);

  return (
    <Guard>
      <AppShell>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{copy.pageKicker}</p>
            <h1 className="text-3xl font-semibold">{copy.pageTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{copy.pageSubtitle}</p>
          </div>
          <button className="btn-primary w-fit">{copy.action}</button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {copy.metrics.map((metric) => (
            <Metric key={metric.label} {...metric} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-4">
            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{copy.sheetTitle}</p>
              <BriefRow label={copy.subjectLabel} value={copy.subject} />
              <BriefRow label={copy.preheaderLabel} value={copy.preheader} />
              <BriefRow label={copy.audienceLabel} value={copy.audience} />
              <BriefRow label={copy.goalLabel} value={copy.goal} />
            </div>

            <div className="card p-6">
              <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{copy.segmentsTitle}</p>
              <div className="mt-4 space-y-3">
                {copy.segments.map((segment) => (
                  <div key={segment.name} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{segment.name}</p>
                      <p className="text-sm text-slate-300">{segment.count}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{segment.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-6">
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">Email</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-[#e2d4bd] bg-[#fbf4e8] text-[#1f2933] shadow-2xl shadow-black/20">
              <div className="border-b border-[#e2d4bd] bg-[#123832] px-6 py-5 text-[#f8ead0]">
                <p className="text-xs uppercase tracking-[0.24em] text-[#d8b36a]">Suites Mine</p>
                <p className="mt-1 text-sm">{copy.preheader}</p>
              </div>
              <div className="p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8a6b3d]">{copy.emailKicker}</p>
                <h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">{copy.emailTitle}</h2>
                <p className="mt-6 text-base font-semibold">{copy.greeting}</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#4b5563]">
                  {copy.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <button className="mt-7 rounded-lg bg-[#123832] px-5 py-3 text-sm font-semibold text-white">
                  {copy.cta}
                </button>
                <p className="mt-8 text-sm text-[#6b5d49]">{copy.signature}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-6">
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{copy.socialTitle}</p>
            <p className="mt-2 text-sm text-slate-300">{copy.socialIntro}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {copy.socialPosts.map((post) => (
                <div key={post.channel} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{post.channel}</p>
                    <p className="text-xs text-slate-400">{post.date}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{post.copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <p className="text-sm uppercase tracking-[0.15em] text-slate-400">{copy.checklistTitle}</p>
            <div className="mt-4 space-y-3">
              {copy.checklist.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200 ring-1 ring-white/10">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-[color:var(--accent)] text-center text-xs font-bold text-[#1f2933]">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
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

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-100">{value}</p>
    </div>
  );
}
