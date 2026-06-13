import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Sparkles, Wine as WineIcon } from 'lucide-react'
import { StarsDisplay } from '@/components/ui/stars-display'
import type { RecapHeadline } from '@/lib/session-recap'

export interface SessionRecapHeaderProps {
  headline: RecapHeadline
}

export function SessionRecapHeader({ headline }: SessionRecapHeaderProps) {
  const { topWine, mostDivisive, topGroupFlavours } = headline

  // Hide the whole strip if nothing meaningful to show
  const showAny =
    topWine != null || mostDivisive != null || topGroupFlavours.length > 0
  if (!showAny) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Inga betyg ännu — sammanfattningen växer fram när fler skickar in
          recensioner.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            <Trophy className="h-3.5 w-3.5 text-brand-400" />
            Veckans favorit
          </div>
          {topWine ? (
            <>
              <p className="text-base font-medium truncate">{topWine.title}</p>
              <p className="flex items-center gap-2 text-sm">
                <StarsDisplay value={topWine.avgRating} size="sm" />
                <span className="text-muted-foreground">
                  {topWine.avgRating.toFixed(1)} · {topWine.ratingCount} betyg
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">För få betyg</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            Mest delande
          </div>
          {mostDivisive ? (
            <>
              <p className="text-base font-medium truncate">{mostDivisive.title}</p>
              <p className="text-sm text-muted-foreground">
                Spridning ±{mostDivisive.ratingStdDev.toFixed(1)} betyg
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">För få betyg</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            <WineIcon className="h-3.5 w-3.5 text-brand-400" />
            Smaker rummet pratade om
          </div>
          {topGroupFlavours.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topGroupFlavours.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  <span className="capitalize">{f.label}</span>
                  <span className="text-muted-foreground">({f.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inga smaker ännu</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
