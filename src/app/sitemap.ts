import type { MetadataRoute } from 'next'

const SITE = 'https://www.growva.live'

// Public, indexable pages only — never the gated app surfaces
// (/dashboard, /products, /admin, /api).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
