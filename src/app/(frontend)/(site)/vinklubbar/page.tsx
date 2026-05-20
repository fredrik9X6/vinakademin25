import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-heading">Mina vinklubbar</h1>
        <Button asChild>
          <Link href="/vinklubbar/skapa">
            <Plus className="h-4 w-4 mr-1.5" /> Ny vinklubb
          </Link>
        </Button>
      </header>

      {clubs.docs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Du är inte med i någon vinklubb ännu</p>
            <p className="text-sm text-muted-foreground">
              Skapa din egen klubb och bjud in dina vänner att köra blindkampar tillsammans.
            </p>
            <Button asChild>
              <Link href="/vinklubbar/skapa">Skapa en vinklubb</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {clubs.docs.map((club: any) => (
            <li key={club.id}>
              <Link
                href={`/vinklubbar/${club.slug}`}
                className="block rounded-lg border border-border bg-card hover:border-brand-400/50 transition-colors p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{club.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(club.members ?? []).length} medlemmar
                    </p>
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
