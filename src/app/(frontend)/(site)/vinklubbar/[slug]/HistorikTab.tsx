import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'

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
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center text-sm text-muted-foreground">
        Inga avslutade blindkampar än.
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {battles.docs.map((b: any) => (
        <li key={b.id}>
          <Link
            href={`/blindkamp/${b.id}/resultat`}
            className="block rounded-2xl border border-border bg-card p-5 hover:border-brand-400/50 hover:shadow-sm transition-all"
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
