import type { Metadata } from 'next'
import './globals.css'

const SITE = 'https://www.growva.live'
const DESCRIPTION =
  'Stop wasting weeks on experiments that should have died in days. Growva turns your growth experiments into clear decisions — what to test, stop, continue, and scale — using real signals, not gut feeling.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Growva — Decision infrastructure for solo founders',
    template: '%s · Growva',
  },
  description: DESCRIPTION,
  applicationName: 'Growva',
  keywords: [
    'growth experiments',
    'startup validation',
    'solo founder',
    'indie hacker',
    'product validation',
    'experiment decision',
    'when to kill an experiment',
  ],
  authors: [{ name: 'Growva' }],
  alternates: { canonical: SITE },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Growva',
    title: 'Growva — Decision infrastructure for solo founders',
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Growva — Decision infrastructure for solo founders',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Growva',
      url: SITE,
      logo: `${SITE}/icon`,
      email: 'hello@growva.co',
      description: 'Decision infrastructure for solo founders.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Growva',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE,
      description: DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free during private beta',
      },
      publisher: { '@id': `${SITE}/#organization` },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#080808' }}>
        {children}
      </body>
    </html>
  )
}
