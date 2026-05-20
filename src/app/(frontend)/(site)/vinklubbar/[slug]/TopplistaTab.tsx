import { getPayloadClient } from '@/lib/payload'
import { computeClubLeaderboard } from '@/lib/blindkamp/compute-leaderboard'

export async function TopplistaTab({ clubId }: { clubId: number }) {
  const payload = await getPayloadClient()
  const entries = await computeClubLeaderboard(payload, clubId, 'all')

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center text-sm text-muted-foreground">
        Inga slutförda blindkampar ännu. Topplistan visas efter första klara kampen.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-3 w-10 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Medlem
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Vinster
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Snitt
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Bidrag
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const rank = e.isRookie ? null : i + 1
            return (
              <tr key={e.userId} className="border-t border-border">
                <td className="px-4 py-3">
                  {rank ? (
                    <span
                      className={
                        rank === 1
                          ? 'text-[#FB914C] font-semibold'
                          : rank === 2
                            ? 'text-zinc-400 font-semibold'
                            : rank === 3
                              ? 'text-[#FDBA75] font-semibold'
                              : 'text-muted-foreground'
                      }
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Ny
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{e.displayName}</td>
                <td className="px-4 py-3 text-right tabular-nums">{e.wins}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {e.averageRating?.toFixed(2) ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{e.submissionsCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
