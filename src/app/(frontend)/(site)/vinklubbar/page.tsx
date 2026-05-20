import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Vinklubbar — Vinakademin' }

export default async function VinklubbarPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/vinklubbar')

  const payload = await getPayloadClient()
  const clubs = await payload.find({
    collection: 'wine-clubs',
    where: { 'members.user': { equals: user.id } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
    sort: '-updatedAt',
  })

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-6 py-8 sm:py-12 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ditt konto
          </span>
          <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl">
            Mina vinklubbar
          </h1>
        </div>
        <Button asChild>
          <Link href="/vinklubbar/skapa">
            <Plus className="h-4 w-4 mr-1.5" /> Ny vinklubb
          </Link>
        </Button>
      </header>

      {clubs.docs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400 mx-auto">
            <Users className="h-5 w-5" />
          </div>
          <p className="font-medium">Du är inte med i någon vinklubb ännu</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Skapa din egen klubb och bjud in dina vänner att köra blindkampar tillsammans.
          </p>
          <Button asChild>
            <Link href="/vinklubbar/skapa">Skapa en vinklubb</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {clubs.docs.map((club: any) => (
            <li key={club.id}>
              <Link
                href={`/vinklubbar/${club.slug}`}
                className="block rounded-2xl border border-border bg-card hover:border-brand-400/50 hover:shadow-sm transition-all p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{club.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(club.members ?? []).length} medlemmar
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400 flex-shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
