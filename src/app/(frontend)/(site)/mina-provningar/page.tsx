import type { Metadata } from 'next'
import { MinaProvningarPage } from '@/components/mina-provningar/MinaProvningarPage'

export const metadata: Metadata = {
  title: 'Mina Provningar - Vinakademin',
  description: 'Dina kopta vinprovningar och framsteg.',
}

export default function MinaProvningarRoute() {
  return <MinaProvningarPage />
}
