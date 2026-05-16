import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Star } from 'lucide-react'
import type { Review } from '@/payload-types'
import { WineReviewListItem } from '@/components/wine-review/WineReviewListItem'

export const metadata: Metadata = {
  title: 'Mina recensioner — Vinakademin',
  description: 'Dina vinrecensioner.',
}

export const dynamic = 'force-dynamic'

export default async function MinaRecensionerPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-recensioner')

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'reviews',
    where: { user: { equals: user.id } },
    sort: '-createdAt',
    limit: 200,
    depth: 2, // resolve wine + media for thumbnails
  })
  const reviews = docs as Review[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading">Mina recensioner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dina vinrecensioner. Privata som standard — publicera enskilda till din profil.
          </p>
        </div>
        <Button asChild>
          <Link href="/recensera-vin">
            <Plus className="h-4 w-4 mr-2" />
            Recensera vin
          </Link>
        </Button>
      </header>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-brand-400/60" />
            <h2 className="mt-4 font-heading text-xl">Inga recensioner än</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Skriv ner intrycket direkt efter en provning — färska anteckningar är
              guld när du står med nästa flaska om en månad.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild>
                <Link href="/recensera-vin">
                  <Plus className="h-4 w-4 mr-2" />
                  Recensera ett vin
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/vinlistan">Bläddra i Vinlistan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <WineReviewListItem review={r} href={`/mina-recensioner/${r.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
