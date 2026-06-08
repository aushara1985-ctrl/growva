import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Growva — Decision infrastructure for solo founders',
  description: 'Stop wasting weeks on experiments that should have died in days. Growva turns your growth experiments into clear decisions — what to test, stop, continue, and scale — using real signals, not gut feeling.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#080808' }}>
        {children}
      </body>
    </html>
  )
}
