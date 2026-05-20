import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPayloadClient } from '@/lib/payload'
import { Trophy, Wine, Plus, Users } from 'lucide-react'
import { computeClubLeaderboard } from '@/lib/blindkamp/compute-leaderboard'

export async function OversiktTab({ club, canManage }: { club: any; canManage: boolean }) {
  const payload = await getPayloadClient()
  const battlesRes = await payload.find({
    collection: 'blind-battles',
    where: { club: { equals: club.id } },
    limit: 5,
    sort: '-updatedAt',
    depth: 0,
    overrideAccess: true,
  })
  const completedCount = (
    await payload.count({
      collection: 'blind-battles',
      where: { and: [{ club: { equals: club.id } }, { status: { equals: 'completed' } }] },
      overrideAccess: true,
    })
  ).totalDocs
  const upcoming = battlesRes.docs.find(
    (b: any) =>
      b.status === 'submissions_open' || b.status === 'draft' || b.status === 'in_session',
  ) as any

  const leaderboard = await computeClubLeaderboard(payload, club.id, 'all')
  const champion = leaderboard.find((e) => !e.isRookie) ?? null

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-brand-400 mb-2" />
            <p className="text-2xl font-heading">{(club.members ?? []).length}</p>
            <p className="text-xs text-muted-foreground">medlemmar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wine className="h-5 w-5 mx-auto text-brand-400 mb-2" />
            <p className="text-2xl font-heading">{completedCount}</p>
            <p className="text-xs text-muted-foreground">blindkampar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-brand-400 mb-2" />
            <p className="text-lg font-medium truncate">{champion?.displayName ?? '—'}</p>
            <p className="text-xs text-muted-foreground">nuvarande mästare</p>
          </CardContent>
        </Card>
      </div>

      {upcoming ? (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pågående</p>
              <p className="font-medium mt-1">{upcoming.title || 'Nästa blindkamp'}</p>
            </div>
            <Button asChild>
              <Link href={`/blindkamp/${upcoming.id}`}>Visa</Link>
            </Button>
          </CardContent>
        </Card>
      ) : canManage ? (
        <Card>
          <CardContent className="p-5 space-y-3 text-center">
            <p className="font-medium">Inga blindkampar igång</p>
            <p className="text-sm text-muted-foreground">Starta nästa.</p>
            <Button asChild>
              <Link href={`/blindkamp/skapa?club=${club.id}`}>
                <Plus className="h-4 w-4 mr-1.5" /> Skapa blindkamp
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
