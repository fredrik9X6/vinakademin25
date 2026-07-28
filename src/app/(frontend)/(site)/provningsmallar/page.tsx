import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { TagFilter, type TagCount } from '@/components/tasting-template/TagFilter'
import { PlanCard } from '@/components/tasting-plan/PlanCard'
import { ProvningarViewTabs } from '@/components/tasting/ProvningarViewTabs'
import { SkapaEgenButton } from '@/components/tasting/SkapaEgenButton'
import { Button } from '@/components/ui/button'
import { Plus, Wine } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { cn } from '@/lib/utils'
import {
  buildProvningarHref,
  parseProvningarFilters,
  viewIncludesPlans,
  viewIncludesTemplates,
} from '@/lib/provningar-view'
import type { TastingPlan, TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Vinprovningar — Vinakademin',
  description:
    'Färdiga vinprovningar från Vinakademin — eller bygg din egen. Planera, bjud in vänner och håll provningen live.',
}

export const dynamic = 'force-dynamic'

export default async function ProvningarListing({
  searchParams,
}: {
  searchParams: Promise<{
    visa?: string
    tag?: string
    access?: string
    status?: string
    showArchived?: string
  }>
}) {
  const sp = await searchParams
  const filters = parseProvningarFilters(sp)

  const user = await getUser()
  const isAdmin = user?.role === 'admin'
  const wantsTemplates = viewIncludesTemplates(filters.view)
  // Admin-only: ?status=draft flips the template list to utkast. Non-admins
  // always see published — the query is silently ignored for them. Scoped to
  // views that include templates, else `?visa=mina&status=draft` would flip
  // the heading to "Utkast" over a plans-only list.
  const showDrafts = isAdmin && filters.status === 'draft' && wantsTemplates
  // The draft flag is template-only — suppress plans while reviewing drafts
  // so the admin's own plans don't bleed into the "Utkast" surface.
  const wantsPlans = viewIncludesPlans(filters.view) && !showDrafts

  const payload = await getPayload({ config })

  // --- Plans (only for a signed-in user, only when the view includes them) ---
  let plans: TastingPlan[] = []
  if (wantsPlans && user) {
    const planWhere: Where[] = [{ owner: { equals: user.id } }]
    if (!filters.showArchived) {
      planWhere.push({ status: { not_equals: 'archived' } })
    }
    const res = await payload.find({
      collection: 'tasting-plans',
      where: { and: planWhere },
      sort: '-updatedAt',
      limit: 100,
      depth: 0,
    })
    plans = res.docs as TastingPlan[]
  }

  // --- Templates ---
  let templates: TastingTemplate[] = []
  let tagCounts: TagCount[] = []
  let draftCount = 0
  if (wantsTemplates) {
    const whereAnd: any[] = [
      { publishedStatus: { equals: showDrafts ? 'draft' : 'published' } },
    ]
    if (filters.tag) whereAnd.push({ tags: { contains: filters.tag } })
    if (filters.access) whereAnd.push({ accessLevel: { equals: filters.access } })

    if (isAdmin) {
      const draftsRes = await payload.find({
        collection: 'tasting-templates',
        where: { publishedStatus: { equals: 'draft' } } as any,
        limit: 0,
        depth: 0,
      })
      draftCount = draftsRes.totalDocs
    }

    const { docs } = await payload.find({
      collection: 'tasting-templates',
      where: { and: whereAnd } as any,
      sort: '-publishedAt',
      limit: 60,
      depth: 1,
    })
    templates = docs as TastingTemplate[]

    // Tag-count union, queried separately so the chips don't vanish when a tag
    // is active.
    const allRes = await payload.find({
      collection: 'tasting-templates',
      where: { publishedStatus: { equals: 'published' } },
      limit: 200,
      depth: 0,
    })
    const tagMap = new Map<string, number>()
    for (const t of allRes.docs as TastingTemplate[]) {
      const arr = (t as any).tags as string[] | undefined
      if (!Array.isArray(arr)) continue
      for (const tag of arr) {
        const norm = String(tag).trim()
        if (!norm) continue
        tagMap.set(norm, (tagMap.get(norm) ?? 0) + 1)
      }
    }
    tagCounts = Array.from(tagMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }

  const accessPills: Array<{ key: string; label: string; href: string; active: boolean }> = [
    {
      key: 'all',
      label: 'Alla',
      href: buildProvningarHref(filters, { access: null }),
      active: filters.access == null,
    },
    {
      key: 'free',
      label: 'Fri',
      href: buildProvningarHref(filters, { access: 'free' }),
      active: filters.access === 'free',
    },
    {
      key: 'paid',
      label: 'Betald',
      href: buildProvningarHref(filters, { access: 'paid' }),
      active: filters.access === 'paid',
    },
  ]

  const isEmpty = plans.length === 0 && templates.length === 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading">{showDrafts ? 'Utkast' : 'Vinprovningar'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showDrafts
              ? 'Mallar du har sparat som utkast. Bara du som admin ser dessa.'
              : 'Färdiga upplägg från Vinakademin — eller bygg din egen.'}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <SkapaEgenButton isAuthenticated={Boolean(user)} />
          {isAdmin && (
            <Button asChild size="sm" variant="outline">
              <Link href="/provningsmallar/ny">
                <Plus className="h-4 w-4 mr-1" />
                Skapa ny mall
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Logged out, every item on the page is a template, so a "Mina" chip
          would filter to a guaranteed-empty result. The header CTA carries the
          message instead. */}
      {user && <ProvningarViewTabs current={filters} />}

      {wantsTemplates && (
        <div className="mb-4 flex flex-wrap gap-2">
          {accessPills.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
                p.active
                  ? 'border-brand-400 bg-brand-400 text-white'
                  : 'border-border bg-card hover:bg-muted/40',
              )}
            >
              {p.label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
              {showDrafts ? (
                <Link
                  href={buildProvningarHref(filters, { status: null })}
                  className="inline-flex items-center rounded-full border border-border bg-card hover:bg-muted/40 px-3 py-1 text-xs transition-colors"
                >
                  Visa publicerade
                </Link>
              ) : (
                <Link
                  href={buildProvningarHref(filters, { status: 'draft', view: 'mallar' })}
                  className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-100/40 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs transition-colors hover:bg-amber-100/70"
                >
                  Visa utkast ({draftCount})
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* Gated on wantsPlans rather than view === 'mina': showArchived can
          stay set (and plans stay visible) after switching mina → alla, since
          alla includes plans too. Gating this on 'mina' only would leave
          archived plans visible with no control to turn them back off. */}
      {wantsPlans && user && (
        <div className="mb-4">
          <Link
            href={buildProvningarHref(filters, { showArchived: !filters.showArchived })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {filters.showArchived ? '← Dölj arkiverade' : 'Visa arkiverade'}
          </Link>
        </div>
      )}

      {wantsTemplates && <TagFilter tags={tagCounts} current={filters} />}

      {/* An old /mina-provningar/planer bookmark 301s here before the auth
          gate, so a signed-out visitor can land on visa=mina directly. */}
      {filters.view === 'mina' && !user ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wine className="h-12 w-12 mx-auto text-brand-400/60" />
          <h2 className="mt-4 font-heading text-xl">Logga in för att se dina vinprovningar</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Dina egna vinprovningar sparas på ditt konto.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href={`/logga-in?from=${encodeURIComponent('/provningsmallar?visa=mina')}`}>
                Logga in
              </Link>
            </Button>
          </div>
        </div>
      ) : isEmpty && filters.view === 'mina' ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wine className="h-12 w-12 mx-auto text-brand-400/60" />
          <h2 className="mt-4 font-heading text-xl">Inga vinprovningar än</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            En provning är 3–6 viner du planerar att smaka tillsammans med vänner — från
            start till klart i en samlad plan.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <SkapaEgenButton isAuthenticated />
            <Button asChild variant="outline">
              <Link href={buildProvningarHref(filters, { view: 'mallar' })}>Utforska mallar</Link>
            </Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {filters.tag || filters.access
            ? 'Inga vinprovningar matchar filtret.'
            : 'Inga vinprovningar än — kom tillbaka snart.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Plans first: the user's own drafts are the higher-intent, smaller
              set, and burying them under 60 templates defeats the change. */}
          {plans.map((plan) => (
            <PlanCard key={`plan-${plan.id}`} plan={plan} />
          ))}
          {templates.map((t) => (
            <TemplateCard
              key={`tpl-${t.id}`}
              template={t}
              href={showDrafts ? `/provningsmallar/redigera/${t.id}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
