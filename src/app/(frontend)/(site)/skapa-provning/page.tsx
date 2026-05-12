import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUser } from '@/lib/get-user'
import { TastingPlanForm } from '@/components/tasting-plan/TastingPlanForm'

export const metadata: Metadata = {
  title: 'Skapa provning — Vinakademin',
}

export default async function SkapaProvningPage() {
  const user = await getUser()
  if (!user) {
    redirect('/logga-in?from=/skapa-provning')
  }
  return <TastingPlanForm />
}
