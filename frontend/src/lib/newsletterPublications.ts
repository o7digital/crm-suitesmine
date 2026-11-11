export type PublicationSummary = {
  id: string;
  campaignId: string;
  monthKey: string;
  updatedAt: string;
};

export type PublicNewsletter = {
  id: string;
  monthKey: string;
  updatedAt: string;
  snapshot: {
    campaign: {
      month: string; year: number; headline: string; subject: string; preheader: string;
      eyebrow: string; heroImage: string; body: string; bodyHtml: string;
      cta: string; ctaUrl: string; highlights: string[];
      events: Array<{
        id: string; title: string; category: string; date: string; venue: string;
        description: string; url: string; sourceLabel: string; imageUrl: string;
      }>;
    };
    branding: { address: string; phone: string; websiteUrl: string; gallery: string[] };
  };
};

export function publicationPath(publication: Pick<PublicationSummary, 'id' | 'monthKey'>) {
  return `/agenda/${encodeURIComponent(publication.monthKey)}/${encodeURIComponent(publication.id)}`;
}
