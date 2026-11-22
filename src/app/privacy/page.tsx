import type { Metadata } from 'next'
import { LegalShell, PRIVACY_EN, PRIVACY_AR } from '../legal-shared'

export const metadata: Metadata = {
  title: 'Privacy Policy — Growva',
  description: 'How Growva handles your data, and your right to access, correct and delete it.',
  alternates: { canonical: 'https://www.growva.live/privacy' },
}

export default function PrivacyPage() {
  return <LegalShell title="Privacy Policy" titleAr="سياسة الخصوصية" en={PRIVACY_EN} ar={PRIVACY_AR} />
}
