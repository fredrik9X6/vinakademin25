import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { RecenseraVinClient } from './RecenseraVinClient'

export const metadata = {
  title: 'Recensera vin — Vinakademin',
}

export const dynamic = 'force-dynamic'

export default async function RecenseraVinPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/recensera-vin')
  return <RecenseraVinClient />
}
