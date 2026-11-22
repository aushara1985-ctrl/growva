import { permanentRedirect } from 'next/navigation'

export default function ContactPage() {
  permanentRedirect('/terms#contact')
}
