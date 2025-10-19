import { Metadata } from 'next'
import { HelpPageClient } from './HelpPageClient'

export const metadata: Metadata = {
  title: 'Hjälpcenter | Vinakademin',
  description:
    'Hitta svar på vanliga frågor om konto, vinprovningar, betalning och teknisk support. Kontakta oss om du behöver mer hjälp.',
}

export default function HjalpPage() {
  return <HelpPageClient />
}
