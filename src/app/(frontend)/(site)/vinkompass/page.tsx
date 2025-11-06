import { Metadata } from 'next'
import VinkompassClient from './VinkompassClient'

export const metadata: Metadata = {
  title: 'Vinkompassen | Vinakademin',
  description:
    'Ta reda på vilken vinprofil du har och få personliga rekommendationer baserat på dina smakpreferenser. Gratis och tar bara några minuter.',
  keywords: 'vinkompass, vinprofil, vinrekommendationer, smakprofil, vin, vinakademin',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/vinkompass`,
  },
  openGraph: {
    type: 'website',
    title: 'Vinkompassen | Vinakademin',
    description:
      'Ta reda på vilken vinprofil du har och få personliga rekommendationer baserat på dina smakpreferenser.',
    url: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/vinkompass`,
    siteName: 'Vinakademin',
    locale: 'sv_SE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinkompassen | Vinakademin',
    description:
      'Ta reda på vilken vinprofil du har och få personliga rekommendationer baserat på dina smakpreferenser.',
    site: '@vinakademin',
  },
}

export default function VinkompassPage() {
  return <VinkompassClient />
}
