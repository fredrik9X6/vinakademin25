import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User, Subscriber, Event as EventDoc } from '@/payload-types'
import { Search } from 'lucide-react'
import { effectiveSource } from '@/lib/subscribers'

interface PageProps {
  searchParams: Promise<{
    q?: string
    has_account?: string
    has_paid?: string
    page?: string
  }>
}

interface ContactRow {
  email: string
  name: string | null
  hasAccount: boolean
  hasPaid: boolean
  source: string | null
  createdAt: string | null
  lastEventAt: string | null
  lastEventLabel: string | null
  marketingOptIn: boolean | null
  subscriberStatus: string | null
}

const PAGE_SIZE = 50

export default async function InterntListPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (sp.q || '').trim().toLowerCase()
  const onlyHasAccount = sp.has_account === '1'
  const onlyHasPaid = sp.has_paid === '1'
  const currentPage = Math.max(1, parseInt(sp.page || '1') || 1)

  const payload = await getPayload({ config })

  // Pull recent users + all subscribers. We dedupe by email after fetching.
  const [usersRes, subscribersRes, paidOrders, recentEvents] = await Promise.all([
    payload.find({
      collection: 'users',
      limit: 1000,
      sort: '-createdAt',
      depth: 0,
    }),
    payload.find({
      collection: 'subscribers',
      limit: 2000,
      sort: '-updatedAt',
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { status: { equals: 'completed' } },
      limit: 5000,
      depth: 1,
    }),
    payload.find({
      collection: 'events',
      limit: 5000,
      sort: '-createdAt',
      depth: 0,
    }),
  ])

  // Build a map from userId → email so we can resolve paid Orders to emails.
  const userIdToEmail = new Map<number, string>()
  for (const u of usersRes.docs as User[]) {
    userIdToEmail.set(u.id, u.email.toLowerCase())
  }

  const paidEmails = new Set<string>()
  for (const o of paidOrders.docs as any[]) {
    const userRef = o.user
    let email: string | null = null
    if (typeof userRef === 'object' && userRef?.email) {
      email = userRef.email
    } else if (typeof userRef === 'number' || typeof userRef === 'string') {
      email = userIdToEmail.get(Number(userRef)) || null
    }
    if (email) paidEmails.add(email.toLowerCase())
    const guestEmail = o?.metadata?.guestEmail
    if (typeof guestEmail === 'string') paidEmails.add(guestEmail.toLowerCase())
  }

  // Build the master contact map keyed by lower-cased email.
  const contacts = new Map<string, ContactRow>()

  for (const u of usersRes.docs as User[]) {
    const email = u.email.toLowerCase()
    contacts.set(email, {
      email,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null,
      hasAccount: true,
      hasPaid: paidEmails.has(email),
      source: (u as any)?.onboarding?.source || 'registration',
      createdAt: u.createdAt,
      lastEventAt: null,
      lastEventLabel: null,
      marketingOptIn: (u as any)?.notifications?.email?.newsletter ?? null,
      subscriberStatus: null,
    })
  }

  for (const s of subscribersRes.docs as Subscriber[]) {
    const email = s.email.toLowerCase()
    const subscriberSource = effectiveSource({ source: s.source, leadMagnet: s.leadMagnet })
    const existing = contacts.get(email)
    if (existing) {
      existing.subscriberStatus = s.status
      if (existing.marketingOptIn === null) {
        existing.marketingOptIn = s.status === 'subscribed'
      }
      // Prefer the subscriber's effective source (which surfaces lead-magnet
      // identity) over the registration-time onboarding source. Marketing
      // attribution beats account-creation attribution for ops-side reporting.
      if (s.leadMagnet?.type && s.leadMagnet?.slug) {
        existing.source = subscriberSource
      }
    } else {
      contacts.set(email, {
        email,
        name: null,
        hasAccount: false,
        hasPaid: paidEmails.has(email),
        source: subscriberSource,
        createdAt: s.createdAt,
        lastEventAt: null,
        lastEventLabel: null,
        marketingOptIn: s.status === 'subscribed',
        subscriberStatus: s.status,
      })
    }
  }

  // Stitch in latest event per contact.
  for (const ev of recentEvents.docs as EventDoc[]) {
    const email = (ev.contactEmail || '').toLowerCase()
    if (!email) continue
    const row = contacts.get(email)
    if (!row) continue
    if (!row.lastEventAt) {
      row.lastEventAt = ev.createdAt
      row.lastEventLabel = ev.label
    }
  }

  // Filter + search.
  let rows = Array.from(contacts.values())
  if (q) {
    rows = rows.filter(
      (r) =>
        r.email.includes(q) ||
        (r.name && r.name.toLowerCase().includes(q)),
    )
  }
  if (onlyHasAccount) rows = rows.filter((r) => r.hasAccount)
  if (onlyHasPaid) rows = rows.filter((r) => r.hasPaid)

  // Sort by last activity (event > createdAt fallback).
  rows.sort((a, b) => {
    const ta = a.lastEventAt || a.createdAt || ''
    const tb = b.lastEventAt || b.createdAt || ''
    return tb.localeCompare(ta)
  })

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl">Kontakter</h1>
        <p className="text-sm text-muted-foreground">
          Sammanslagen vy över registrerade användare och nyhetsbrevsprenumeranter, sorterade efter
          senaste aktivitet.
        </p>
      </div>

      <ContactFilters q={q} onlyHasAccount={onlyHasAccount} onlyHasPaid={onlyHasPaid} total={total} />

      <div className="overflow-hidden rounded-md border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">E-post</th>
              <th className="px-4 py-3 font-medium">Namn</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Källa</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Senaste händelse</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Inga kontakter matchar dina filter.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <ContactRowView key={row.email} row={row} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <Pagination currentPage={currentPage} totalPages={totalPages} q={q} onlyHasAccount={onlyHasAccount} onlyHasPaid={onlyHasPaid} />
      ) : null}
    </div>
  )
}

function ContactFilters({
  q,
  onlyHasAccount,
  onlyHasPaid,
  total,
}: {
  q: string
  onlyHasAccount: boolean
  onlyHasPaid: boolean
  total: number
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
    >
      <div className="flex flex-1 items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Sök på e-post eller namn..."
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="has_account"
          value="1"
          defaultChecked={onlyHasAccount}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Endast användare
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="has_paid"
          value="1"
          defaultChecked={onlyHasPaid}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Endast betalat
      </label>
      <button type="submit" className="btn-brand h-9 px-3 text-xs">
        Filtrera
      </button>
      <span className="ml-auto text-xs text-muted-foreground">{total} kontakter</span>
    </form>
  )
}

function ContactRowView({ row }: { row: ContactRow }) {
  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="px-4 py-3 align-top">
        <Link
          href={`/internt/${encodeURIComponent(row.email)}`}
          className="font-medium text-foreground hover:underline underline-offset-2"
        >
          {row.email}
        </Link>
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">{row.name || '—'}</td>
      <td className="hidden px-4 py-3 align-top text-muted-foreground md:table-cell">
        {row.source || '—'}
      </td>
      <td className="hidden px-4 py-3 align-top sm:table-cell">
        <div className="flex flex-wrap gap-1">
          {row.hasAccount ? <Pill tone="brand">Konto</Pill> : null}
          {row.hasPaid ? <Pill tone="green">Betalat</Pill> : null}
          {row.subscriberStatus === 'subscribed' ? <Pill tone="brand">Nyhetsbrev</Pill> : null}
          {row.subscriberStatus === 'unsubscribed' ? <Pill tone="muted">Avregistrerad</Pill> : null}
          {row.marketingOptIn === false && row.subscriberStatus === null ? (
            <Pill tone="muted">Ej opt-in</Pill>
          ) : null}
        </div>
      </td>
      <td className="hidden px-4 py-3 align-top text-muted-foreground lg:table-cell">
        {row.lastEventAt ? (
          <div>
            <div className="text-xs">{relative(row.lastEventAt)}</div>
            {row.lastEventLabel ? (
              <div className="line-clamp-1 text-xs text-foreground/80">{row.lastEventLabel}</div>
            ) : null}
          </div>
        ) : row.createdAt ? (
          <span className="text-xs">Skapad {relative(row.createdAt)}</span>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'brand' | 'green' | 'muted' }) {
  const cls =
    tone === 'brand'
      ? 'bg-brand-300/15 text-brand-400 border border-brand-400/30'
      : tone === 'green'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
        : 'bg-muted text-muted-foreground border border-border'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  )
}

function Pagination({
  currentPage,
  totalPages,
  q,
  onlyHasAccount,
  onlyHasPaid,
}: {
  currentPage: number
  totalPages: number
  q: string
  onlyHasAccount: boolean
  onlyHasPaid: boolean
}) {
  const buildHref = (page: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (onlyHasAccount) params.set('has_account', '1')
    if (onlyHasPaid) params.set('has_paid', '1')
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return `/internt${qs ? `?${qs}` : ''}`
  }
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalPages }, (_, i) => {
        const p = i + 1
        const active = p === currentPage
        return (
          <Link
            key={p}
            href={buildHref(p)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              active
                ? 'bg-brand-400 text-white'
                : 'border border-border text-foreground hover:bg-muted'
            }`}
          >
            {p}
          </Link>
        )
      })}
    </div>
  )
}

function relative(input: string): string {
  const d = new Date(input)
  const diffMs = Date.now() - d.getTime()
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / min))} min sedan`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h sedan`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} d sedan`
  return d.toLocaleDateString('sv-SE')
}
