import Link from 'next/link'
import { buildProvningarHref, type ProvningarFilterState } from '@/lib/provningar-view'

export interface TagCount {
  label: string
  count: number
}

export interface TagFilterProps {
  tags: TagCount[]
  /** Full filter state — tag links must preserve the active view. */
  current: ProvningarFilterState
}

export function TagFilter({ tags, current }: TagFilterProps) {
  const activeTag = current.tag
  const visibleTags = tags.filter((t) => t.count >= 2).slice(0, 12)
  const hiddenCount = tags.filter((t) => t.count >= 2).length - visibleTags.length
  if (visibleTags.length === 0 && !activeTag) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {visibleTags.map((t) => {
        const isActive = activeTag === t.label
        return (
          <Link
            key={t.label}
            href={buildProvningarHref(current, { tag: isActive ? null : t.label })}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-400 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
            <span className="ml-1 opacity-70">({t.count})</span>
          </Link>
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+ {hiddenCount} fler</span>
      )}
      {activeTag && (
        <Link
          href={buildProvningarHref(current, { tag: null })}
          className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-medium hover:bg-destructive/20"
        >
          Rensa
        </Link>
      )}
    </div>
  )
}
