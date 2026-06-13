import type { Metadata } from 'next'
import { MinaProvningarPage } from '@/components/mina-provningar/MinaProvningarPage'

export const metadata: Metadata = {
  title: 'Mina Vinkurser - Vinakademin',
  description: 'Dina kopta vinkurser och framsteg.',
}

export default function MinaProvningarRoute() {
  return <MinaProvningarPage />
}
