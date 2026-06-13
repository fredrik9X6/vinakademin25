'use client'

import posthog from 'posthog-js'

interface Props {
  href: string
  title: string
  archetypeKey: string
  vinkursSlug: string
}

export function VinkursCard({ href, title, archetypeKey, vinkursSlug }: Props) {
  return (
    <a
      href={href}
      onClick={() =>
        posthog?.capture?.('vinkompass_vinkurs_clicked', {
          archetype: archetypeKey,
          vinkursSlug,
        })
      }
      className="mt-10 flex flex-col gap-2 rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:border-brand-400"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Vinkurs för din typ
      </span>
      <h3 className="font-heading text-2xl tracking-[-0.015em]">{title}</h3>
      <span className="text-sm font-medium text-brand-400">Se vinkursen →</span>
    </a>
  )
}
