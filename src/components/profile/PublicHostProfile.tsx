import Link from 'next/link'
import type { Review, TastingPlan, User, Media } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Wine as WineIcon, Star, ClipboardList, Users } from 'lucide-react'
import { WineReviewListItem } from '@/components/wine-review/WineReviewListItem'

export interface PublicHostProfileProps {
  user: User
  plans: TastingPlan[]
  reviews?: Review[]
  reviewTotal?: number
  publicReviewCount?: number
  publicPlanCount?: number
  participatedCount?: number
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-400/10 text-brand-400 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-heading tabular-nums leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </div>
    </Card>
  )
}

export function PublicHostProfile({
  user,
  plans,
  reviews = [],
  reviewTotal = 0,
  publicReviewCount = 0,
  publicPlanCount = 0,
  participatedCount = 0,
}: PublicHostProfileProps) {
  const displayName =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email?.split('@')[0] ||
    user.handle ||
    'Värd'
  const fallbackInitial = displayName.charAt(0).toUpperCase()
  const avatarUrl =
    typeof user.avatar === 'object' && user.avatar
      ? (user.avatar as Media).sizes?.thumbnail?.url ??
        (user.avatar as Media).url ??
        undefined
      : undefined
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-start gap-5">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-full flex-shrink-0 border border-border">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-brand-300/15 text-2xl font-medium text-brand-400">
            {fallbackInitial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-heading">{displayName}</h1>
          {user.bio && (
            <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">{user.bio}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">@{user.handle}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={<Star className="h-4 w-4" />}
          value={publicReviewCount}
          label={publicReviewCount === 1 ? 'recension' : 'recensioner'}
        />
        <StatCard
          icon={<ClipboardList className="h-4 w-4" />}
          value={publicPlanCount}
          label={publicPlanCount === 1 ? 'publicerad provning' : 'publicerade provningar'}
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          value={participatedCount}
          label={participatedCount === 1 ? 'provning deltagit i' : 'provningar deltagit i'}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Publicerade provningar</h2>
        {plans.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Den här värden har inga publicerade provningar än.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {plans.map((p) => (
              <Link key={p.id} href={`/profil/${user.handle}/${p.id}`} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-400/10 text-brand-400 flex items-center justify-center">
                      <WineIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.wines?.length ?? 0} viner
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Recensioner</h2>
          {reviewTotal > reviews.length && (
            <Link
              href={`/profil/${user.handle}/recensioner`}
              className="text-sm text-brand-400 hover:underline"
            >
              Visa alla ({reviewTotal})
            </Link>
          )}
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Den här värden har inga publicerade recensioner än.
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <WineReviewListItem
                  review={r}
                  href={`/profil/${user.handle}/recension/${r.id}`}
                  showPublishedBadge={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
