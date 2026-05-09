import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ArrowLeft } from 'lucide-react'
import type { User, Subscriber, Event as EventDoc } from '@/payload-types'
import { effectiveSource } from '@/lib/subscribers'

interface PageProps {
  params: Promise<{ email: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { email: encoded } = await params
  const email = decodeURIComponent(encoded).trim().toLowerCase()
  if (!email || !email.includes('@')) {
    notFound()
  }

  const payload = await getPayload({ config })

  const [usersRes, subscribersRes, eventsRes, ordersRes] = await Promise.all([
    payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'events',
      where: { contactEmail: { equals: email } },
      limit: 200,
      sort: '-createdAt',
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { status: { equals: 'completed' } },
      limit: 100,
      depth: 1,
    }),
  ])

  const user = (usersRes.docs[0] as User | undefined) || null
  const subscriber = (subscribersRes.docs[0] as Subscriber | undefined) || null

  if (!user && !subscriber) {
    notFound()
  }

  // Filter orders matching this email (either by linked user or guestEmail).
  const userId = user?.id
  const orders = (ordersRes.docs as any[]).filter((o) => {
    if (typeof o.user === 'object' && o.user?.email === email) return true
    if (typeof o.user === 'number' && userId && o.user === userId) return true
    if (o?.metadata?.guestEmail === email) return true
    return false
  })

  const events = eventsRes.docs as EventDoc[]
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null
    : null

  return (
    <div className="space-y-8">
      <Link
        href="/internt"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till kontakter
      </Link>

      <header className="rounded-md border border-border bg-background p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl">{fullName || email}</h1>
            {fullName ? (
              <div className="text-sm text-muted-foreground">{email}</div>
            ) : null}
          </div>
          {user ? (
            <Link
              href={`/admin/collections/users/${user.id}`}
              target="_blank"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:border-brand-400/50 hover:bg-brand-300/5"
            >
              Öppna i Payload
            </Link>
          ) : null}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Field label="Användare" value={user ? 'Ja' : 'Nej'} />
          <Field
            label="Källa"
            value={
              // Prefer the subscriber's effective source (surfaces lead-magnet)
              // over the user's onboarding source. Marketing attribution wins
              // here — onboarding tells us how they made an account, not what
              // brought them in.
              (subscriber
                ? effectiveSource({
                    source: subscriber.source,
                    leadMagnet: subscriber.leadMagnet,
                  })
                : (user as any)?.onboarding?.source) || '—'
            }
          />
          <Field
            label="Marknadsföring"
            value={
              subscriber
                ? subscriber.status === 'subscribed'
                  ? 'Prenumerant'
                  : 'Avregistrerad'
                : (user as any)?.notifications?.email?.newsletter
                  ? 'Opt-in'
                  : 'Ej opt-in'
            }
          />
          <Field
            label="Senast aktiv"
            value={events.length > 0 ? relative(events[0].createdAt) : '—'}
          />
        </dl>

        {orders.length > 0 ? (
          <div className="mt-6 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Köp ({orders.length})
            </div>
            <ul className="space-y-1 text-sm">
              {orders.map((o) => {
                const courseTitle =
                  Array.isArray(o.items) && o.items.length > 0
                    ? typeof o.items[0].course === 'object'
                      ? o.items[0].course.title
                      : '—'
                    : '—'
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{courseTitle}</span>
                    <span className="text-muted-foreground">
                      {formatSEK(o.amount)} · {new Date(o.paidAt || o.createdAt).toLocaleDateString('sv-SE')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Tidslinje</h2>
        {events.length === 0 ? (
          <div className="rounded-md border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            Inga händelser registrerade för den här kontakten ännu.
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {events.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  )
}

function EventRow({ event }: { event: EventDoc }) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-brand-300 ring-4 ring-background"
      />
      <div className="rounded-md border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EventTypeChip type={event.type} />
              <span className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString('sv-SE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="text-sm">{event.label}</div>
            {event.metadata && Object.keys(event.metadata as any).length > 0 ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Visa metadata
                </summary>
                <pre className="mt-2 max-w-full overflow-x-auto rounded bg-muted/40 p-2 text-[11px] leading-snug text-foreground">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {event.source}
          </span>
        </div>
      </div>
    </li>
  )
}

function EventTypeChip({ type }: { type: EventDoc['type'] }) {
  const tone = chipTone(type)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}
    >
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function chipTone(type: EventDoc['type']): string {
  switch (type) {
    case 'order_paid':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'order_refunded':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'newsletter_subscribed':
    case 'marketing_opt_in_changed':
      return 'bg-brand-300/15 text-brand-400 border border-brand-400/30'
    case 'newsletter_unsubscribed':
      return 'bg-muted text-muted-foreground border border-border'
    default:
      return 'bg-muted text-muted-foreground border border-border'
  }
}

function formatSEK(amount?: number | null): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount)
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
