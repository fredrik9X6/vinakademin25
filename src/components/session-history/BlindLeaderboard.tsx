import { Card, CardContent } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import type { BlindLeaderboardEntry } from '@/lib/session-recap'

export interface BlindLeaderboardProps {
  entries: BlindLeaderboardEntry[]
}

const MEDALS = ['🥇', '🥈', '🥉']

export function BlindLeaderboard({ entries }: BlindLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Inga gissningar — vi var alla för tysta i kväll.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-brand-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Bästa gissare
          </h3>
        </div>
        <ol className="space-y-1.5">
          {entries.map((entry, idx) => {
            const medal = MEDALS[idx] ?? String(idx + 1)
            return (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded-md border bg-card/30 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-base w-7 flex-shrink-0 text-center"
                    aria-hidden
                  >
                    {medal}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {entry.displayName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-baseline gap-2 flex-shrink-0">
                  <span className="text-foreground font-medium text-sm">
                    {entry.totalPoints} p
                  </span>
                  <span className="hidden sm:inline">
                    ({entry.correctCountries} land · {entry.correctGrapes} druva ·{' '}
                    {entry.correctPrices} pris)
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          1 poäng per rätt: land, druva, prisintervall.
        </p>
      </CardContent>
    </Card>
  )
}
