import type { Metadata } from 'next'
import { MinaProvningarPage } from '@/components/mina-provningar/MinaProvningarPage'

export const metadata: Metadata = {
  title: 'Mina vinkurser — Vinakademin',
  description: 'Dina köpta vinkurser och dina framsteg.',
}

export default function MinaVinkurserRoute() {
  return <MinaProvningarPage />
}
