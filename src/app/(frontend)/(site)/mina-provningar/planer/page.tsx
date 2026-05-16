import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload, type Where } from 'payload'
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

export default async function MinaPlanerPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-provningar/planer')

  const sp = await searchParams
  const showArchived = sp.showArchived === '1'

  const payload = await getPayload({ config })
  const whereAnd: Where[] = [{ owner: { equals: user.id } }]
  if (!showArchived) {
    whereAnd.push({ status: { not_equals: 'archived' } })
  }
  const { docs } = await payload.find({
    collection: 'tasting-plans',
    where: { and: whereAnd },
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
        <div className="flex items-center gap-3">
          <Link
            href={
              showArchived
                ? '/mina-provningar/planer'
                : '/mina-provningar/planer?showArchived=1'
            }
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showArchived ? '← Dölj arkiverade' : 'Visa arkiverade'}
          </Link>
          <Button asChild>
            <Link href="/skapa-provning">
              <Plus className="h-4 w-4 mr-2" />
              Ny provning
            </Link>
          </Button>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wine className="h-12 w-12 mx-auto text-brand-400/60" />
          <h2 className="mt-4 font-heading text-xl">Inga planer än</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            En provning är 3–6 viner du planerar att smaka tillsammans med vänner —
            från start till klart i en samlad plan.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild>
              <Link href="/skapa-provning">
                <Plus className="h-4 w-4 mr-2" />
                Skapa från grunden
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/provningsmallar">Utforska mallar</Link>
            </Button>
          </div>
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
