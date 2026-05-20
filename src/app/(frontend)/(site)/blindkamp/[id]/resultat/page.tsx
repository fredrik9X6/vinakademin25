import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RevealCard } from '@/components/blindkamp/RevealCard'
import { computeBattleResult } from '@/lib/blindkamp/compute-battle-result'

export const dynamic = 'force-dynamic'

export default async function ResultatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) notFound()
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}/resultat`)

  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({
      collection: 'blind-battles',
      id: battleId,
      depth: 2,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  const { rows } = await computeBattleResult(payload, battleId)
  const clubSlug =
    typeof battle.club === 'object' ? (battle.club as any)?.slug : null
  const backHref = clubSlug ? `/vinklubbar/${clubSlug}?tab=historik` : '/vinklubbar'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          &larr; Tillbaka
        </Link>
        <h1 className="text-2xl font-heading mt-2">
          {battle.title || 'Blindkamp'} — Resultat
        </h1>
      </header>

      <div className="space-y-3">
        {rows.map((r) => (
          <RevealCard
            key={r.submissionId}
            slot={r.slot}
            wineTitle={r.wineTitle}
            producer={r.producer}
            vintage={r.vintage}
            imageUrl={r.imageUrl}
            submitterName={r.submitterName}
            averageRating={r.averageRating}
            isWinner={r.isWinner}
          />
        ))}
      </div>

      {!battle.club && (
        <Card>
          <CardContent className="p-5 space-y-3 text-center">
            <p className="font-medium">Vill ni göra det här igen?</p>
            <p className="text-sm text-muted-foreground">
              Skapa en vinklubb och kör flera blindkampar med samma grupp.
            </p>
            <Button asChild>
              <Link href="/vinklubbar/skapa">Skapa vinklubb</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
