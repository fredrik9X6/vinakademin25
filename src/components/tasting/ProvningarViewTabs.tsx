'use client'

import Link from 'next/link'
import { buildProvningarHref, type ProvningarFilterState, type ProvningarView } from '@/lib/provningar-view'
import { trackEvent } from '@/components/analytics'
import { cn } from '@/lib/utils'

const TABS: Array<{ view: ProvningarView; label: string }> = [
  { view: 'alla', label: 'Alla' },
  { view: 'mina', label: 'Mina' },
  { view: 'mallar', label: 'Från Vinakademin' },
]

export interface ProvningarViewTabsProps {
  current: ProvningarFilterState
}

export function ProvningarViewTabs({ current }: ProvningarViewTabsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Visa">
      {TABS.map((tab) => {
        const isActive = current.view === tab.view
        return (
          <Link
            key={tab.view}
            href={buildProvningarHref(current, { view: tab.view })}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => trackEvent('provningar_view_changed', { view: tab.view })}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors',
              isActive
                ? 'border-brand-400 bg-brand-400 text-white'
                : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
