import type { Metadata } from 'next'
import { LegalShell, TERMS_EN, TERMS_AR } from '../legal-shared'

export const metadata: Metadata = {
  title: 'Terms of Service — Growva',
  description: 'Terms of Service for Growva: plans and payment, cancellation, refund policy, acceptable use.',
  alternates: { canonical: 'https://www.growva.live/terms' },
}

export default function TermsPage() {
  return <LegalShell title="Terms of Service" titleAr="شروط الخدمة" en={TERMS_EN} ar={TERMS_AR} />
}
