import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { newsletterBackend } from '@/lib/newsletterBackend';
import type { PublicNewsletter } from '@/lib/newsletterPublications';
import styles from './publication.module.css';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ month: string; id: string }> };

const getPublication = cache(async (month: string, id: string): Promise<PublicNewsletter> => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) notFound();
  const response = await fetch(`${newsletterBackend()}/public/newsletters/${id}`, {
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Publication unavailable');
  const publication = await response.json() as PublicNewsletter;
  if (publication.monthKey !== month) notFound();
  return publication;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month, id } = await params;
  const { snapshot: { campaign } } = await getPublication(month, id);
  return {
    title: `${campaign.month} ${campaign.year} · Suites Mine`,
    description: campaign.preheader,
    robots: { index: false, follow: false },
    openGraph: {
      title: campaign.headline, description: campaign.preheader, type: 'article', locale: 'es_MX',
      ...(campaign.heroImage ? { images: [{ url: campaign.heroImage, alt: 'Suites Mine · Ciudad de México' }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: campaign.headline, description: campaign.preheader },
  };
}

export default async function PublicNewsletterPage({ params }: Props) {
  const { month, id } = await params;
  const { snapshot: { campaign, branding } } = await getPublication(month, id);
  return (
    <div className={styles.page} lang="es">
      <a className={styles.skip} href="#contenido">Saltar al contenido</a>
      <header className={styles.header}>
        <span className={styles.logo}>Suites Mine<span>Apart hotel · Ciudad de México</span></span>
        <a className={styles.headerLink} href="#eventos">Ver la agenda ↓</a>
      </header>
      <main id="contenido" className={styles.content}>
        <section className={styles.hero} aria-labelledby="publication-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{campaign.month} {campaign.year} · CDMX</p>
            <h1 id="publication-title">{campaign.headline}</h1>
            <p className={styles.preheader}>{campaign.preheader}</p>
            {campaign.ctaUrl ? <a className={styles.button} href={campaign.ctaUrl}>{campaign.cta || 'Consultar disponibilidad'} <span aria-hidden="true">↗</span></a> : null}
          </div>
          {campaign.heroImage ? <div className={styles.heroImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={campaign.heroImage} alt="Una estancia en Suites Mine, cerca de Reforma" fetchPriority="high" />
            <p>{campaign.eyebrow || `Agenda Suites Mine · ${campaign.month} ${campaign.year}`}</p>
          </div> : null}
        </section>
        <section className={styles.story} aria-labelledby="story-title">
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>Tu próxima escapada</p>
            <h2 id="story-title">{campaign.subject}</h2>
            {campaign.bodyHtml ? <div className={styles.rich} dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }} /> :
              <div className={styles.rich}>{campaign.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          </div>
          {campaign.highlights.length ? <aside className={styles.highlights}>
            <p className={styles.eyebrow}>Tu estancia en Suites Mine</p>
            <ul>{campaign.highlights.map((highlight, index) => <li key={index}><span aria-hidden="true">✦</span> {highlight}</li>)}</ul>
          </aside> : null}
        </section>
        <section id="eventos" className={styles.events} aria-labelledby="events-title">
          <p className={styles.eyebrow}>Qué hacer en Ciudad de México</p>
          <h2 id="events-title">La agenda de {campaign.month.toLowerCase()}</h2>
          <p className={styles.eventsIntro}>Música, cultura y experiencias para preparar tu visita. Consulta fechas y disponibilidad con cada organizador.</p>
          <div className={styles.eventGrid}>
            {campaign.events.map((event, index) => <article className={styles.event} key={`${event.id}-${index}`}>
              {event.imageUrl ? <div className={styles.eventImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.imageUrl} alt={event.title} loading="lazy" />
              </div> : null}
              <div className={styles.eventCopy}>
                <p className={styles.eyebrow}>{event.category}</p>
                <h3>{event.title}</h3>
                <p className={styles.date}>{event.date}</p>
                <p className={styles.venue}>{event.venue}</p>
                <p className={styles.description}>{event.description}</p>
                {event.url ? <a className={styles.source} href={event.url} target="_blank" rel="noopener noreferrer">Consultar {event.sourceLabel || 'el sitio oficial'} <span aria-hidden="true">↗</span></a> : null}
              </div>
            </article>)}
          </div>
        </section>
        {branding.gallery.length ? <section className={styles.gallery} aria-label="Descubre Suites Mine">
          {branding.gallery.map((image, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${image}-${index}`} src={image} alt={`Suites Mine · espacios del hotel ${index + 1}`} loading="lazy" />
          ))}
        </section> : null}
        {campaign.ctaUrl ? <section className={styles.reservation}>
          <p className={styles.eyebrow}>Conciertos, ciudad y descanso</p>
          <h2>Tu escapada empieza aquí.</h2>
          <a className={styles.button} href={campaign.ctaUrl}>{campaign.cta || 'Consultar disponibilidad'} <span aria-hidden="true">↗</span></a>
        </section> : null}
      </main>
      <footer className={styles.footer}>
        <div><p className={styles.footerBrand}>Suites Mine</p><p>{branding.address}</p></div>
        <div>{branding.phone ? <p><a href={`tel:${branding.phone.replace(/[^+\d]/g, '')}`}>{branding.phone}</a></p> : null}
          {branding.websiteUrl ? <a href={branding.websiteUrl} target="_blank" rel="noopener noreferrer">Visita nuestro sitio ↗</a> : null}</div>
      </footer>
    </div>
  );
}
