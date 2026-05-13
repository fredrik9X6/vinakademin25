import Link from 'next/link'

export interface WineTastingPlanLink {
  id: number
  title: string
  handle: string
}

export interface WineTastingsLinkProps {
  count: number
  plans: WineTastingPlanLink[]
}

/**
 * "Smakad i N provningar" cross-link block on the wine detail page.
 *
 * Renders nothing when count is 0. Lists up to 3 published plans
 * by name, each linking to /v/<handle>/<planId>.
 */
export function WineTastingsLink({ count, plans }: WineTastingsLinkProps) {
  if (count === 0) return null
  return (
    <section className="mt-4">
      <p className="text-sm text-muted-foreground">
        Smakad i {count} {count === 1 ? 'provning' : 'provningar'}
      </p>
      {plans.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2">
          {plans.slice(0, 3).map((p) => (
            <li key={p.id}>
              <Link
                href={`/v/${p.handle}/${p.id}`}
                className="text-sm text-brand-400 hover:underline"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
