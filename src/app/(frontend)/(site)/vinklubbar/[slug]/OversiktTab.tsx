import Link from 'next/link'
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
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col items-center gap-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-2xl font-heading tracking-[-0.015em]">{(club.members ?? []).length}</p>
          <p className="text-xs text-muted-foreground">medlemmar</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col items-center gap-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400">
            <Wine className="h-5 w-5" />
          </div>
          <p className="text-2xl font-heading tracking-[-0.015em]">{completedCount}</p>
          <p className="text-xs text-muted-foreground">blindkampar</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col items-center gap-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400">
            <Trophy className="h-5 w-5" />
          </div>
          <p className="text-lg font-medium truncate max-w-[10rem]">{champion?.displayName ?? '—'}</p>
          <p className="text-xs text-muted-foreground">nuvarande mästare</p>
        </div>
      </div>

      {/* Active battle — featured gradient-border card */}
      {upcoming ? (
        <div className="rounded-[20px] p-0.5 bg-gradient-to-r from-[#FB914C] to-[#FDBA75] shadow-[0_0_40px_-16px_rgba(251,145,76,0.20)]">
          <div className="rounded-[18px] bg-card p-6 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Pågående blindkamp
              </p>
              <p className="font-medium mt-1 text-lg font-heading tracking-[-0.015em]">
                {upcoming.title || 'Nästa blindkamp'}
              </p>
            </div>
            <Button asChild>
              <Link href={`/blindkamp/${upcoming.id}`}>Visa</Link>
            </Button>
          </div>
        </div>
      ) : canManage ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3 text-center">
          <p className="font-medium">Inga blindkampar igång</p>
          <p className="text-sm text-muted-foreground">Starta nästa.</p>
          <Button asChild>
            <Link href={`/blindkamp/skapa?club=${club.id}`}>
              <Plus className="h-4 w-4 mr-1.5" /> Skapa blindkamp
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
