import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Button } from '@/components/ui/button'
import { PlanCard } from '@/components/tasting-plan/PlanCard'
import { Plus, Wine } from 'lucide-react'
import type { TastingPlan } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Mina planer — Vinakademin',
  description: 'Dina egna provningsplaner.',
}

export const dynamic = 'force-dynamic'

export default async function MinaPlanerPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-provningar/planer')

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-plans',
    where: {
      and: [
        { owner: { equals: user.id } },
        { status: { not_equals: 'archived' } },
      ],
    },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
  })
  const plans = docs as TastingPlan[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading">Mina planer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provningar du har planerat. Skapa nya och starta sessioner härifrån.
          </p>
        </div>
        <Button asChild>
          <Link href="/skapa-provning">
            <Plus className="h-4 w-4 mr-2" />
            Ny provning
          </Link>
        </Button>
      </header>

      {plans.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <Wine className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Inga planer än</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Skapa din första provning för att komma igång.
          </p>
          <Button asChild className="mt-4">
            <Link href="/skapa-provning">
              <Plus className="h-4 w-4 mr-2" />
              Skapa din första provning
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}
