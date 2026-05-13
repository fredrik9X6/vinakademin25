import Link from 'next/link'
import type { User, TastingPlan } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Wine as WineIcon } from 'lucide-react'

export interface PublicHostProfileProps {
  user: User
  plans: TastingPlan[]
}

export function PublicHostProfile({ user, plans }: PublicHostProfileProps) {
  const displayName =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email?.split('@')[0] ||
    user.handle ||
    'Värd'
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-heading">{displayName}</h1>
        {user.bio && (
          <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">{user.bio}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">@{user.handle}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-4">Publicerade provningar</h2>
        {plans.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Den här värden har inga publicerade provningar än.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {plans.map((p) => (
              <Link key={p.id} href={`/v/${user.handle}/${p.id}`} className="block">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-400/10 text-brand-400 flex items-center justify-center">
                      <WineIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[p.occasion, `${p.wines?.length ?? 0} viner`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
