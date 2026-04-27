import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Revenue Engine',
  description: 'Autonomous Revenue Layer for Internet Products',
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
