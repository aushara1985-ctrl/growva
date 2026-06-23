import type { MetadataRoute } from 'next'

const SITE = 'https://www.growva.live'

// Public marketing pages are indexable. Authenticated/app surfaces are not.
const DISALLOW = ['/dashboard', '/products', '/admin', '/api']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // Explicitly welcome AI/search crawlers (same public-only policy) for GEO.
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Google-Extended'],
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
