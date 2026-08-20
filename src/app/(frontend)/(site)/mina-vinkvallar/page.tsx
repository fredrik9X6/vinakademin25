import type { Metadata } from 'next'
import { MinaProvningarPage } from '@/components/mina-provningar/MinaProvningarPage'

export const metadata: Metadata = {
  title: 'Mina vinkvällar — Vinakademin',
  description: 'Dina köpta vinkvällar och dina framsteg.',
}

export default function MinaVinkvallarRoute() {
  return <MinaProvningarPage />
}
