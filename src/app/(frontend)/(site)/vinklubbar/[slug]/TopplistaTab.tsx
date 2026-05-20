import { getPayloadClient } from '@/lib/payload'
import { computeClubLeaderboard } from '@/lib/blindkamp/compute-leaderboard'
import { Card, CardContent } from '@/components/ui/card'

export async function TopplistaTab({ clubId }: { clubId: number }) {
  const payload = await getPayloadClient()
  const entries = await computeClubLeaderboard(payload, clubId, 'all')

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Inga slutförda blindkampar ännu. Topplistan visas efter första klara kampen.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-2 w-10">#</th>
            <th className="text-left px-4 py-2">Medlem</th>
            <th className="text-right px-4 py-2">Vinster</th>
            <th className="text-right px-4 py-2">Snitt</th>
            <th className="text-right px-4 py-2">Bidrag</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const rank = e.isRookie ? null : i + 1
            return (
              <tr key={e.userId} className="border-t border-border">
                <td className="px-4 py-2">
                  {rank ? (
                    <span
                      className={
                        rank === 1
                          ? 'text-amber-500 font-medium'
                          : rank === 2
                            ? 'text-zinc-400 font-medium'
                            : rank === 3
                              ? 'text-orange-400 font-medium'
                              : ''
                      }
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ny</span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium">{e.displayName}</td>
                <td className="px-4 py-2 text-right">{e.wins}</td>
                <td className="px-4 py-2 text-right">{e.averageRating?.toFixed(2) ?? '—'}</td>
                <td className="px-4 py-2 text-right">{e.submissionsCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
