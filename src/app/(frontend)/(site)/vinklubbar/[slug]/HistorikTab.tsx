import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { Card, CardContent } from '@/components/ui/card'

export async function HistorikTab({ clubId }: { clubId: number }) {
  const payload = await getPayloadClient()
  const battles = await payload.find({
    collection: 'blind-battles',
    where: { and: [{ club: { equals: clubId } }, { status: { equals: 'completed' } }] },
    sort: '-updatedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  if (battles.docs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Inga avslutade blindkampar än.
        </CardContent>
      </Card>
    )
  }
  return (
    <ul className="space-y-2">
      {battles.docs.map((b: any) => (
        <li key={b.id}>
          <Link
            href={`/blindkamp/${b.id}/resultat`}
            className="block rounded-md border border-border p-4 hover:border-brand-400/50 transition-colors"
          >
            <p className="font-medium">{b.title || `Blindkamp #${b.id}`}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(b.updatedAt).toLocaleDateString('sv-SE')}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
