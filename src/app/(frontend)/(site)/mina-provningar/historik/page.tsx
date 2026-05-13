import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import {
  SessionHistoryList,
  type SessionHistoryRow,
} from '@/components/session-history/SessionHistoryList'

export const metadata: Metadata = {
  title: 'Historik — Vinakademin',
}
export const dynamic = 'force-dynamic'

export default async function HistorikPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/mina-provningar/historik')

  const payload = await getPayload({ config })

  // Sessions the user hosted
  const hostedRes = await payload.find({
    collection: 'course-sessions',
    where: { host: { equals: user.id } },
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })

  // Sessions the user participated in (as guest, authed)
  const partsRes = await payload.find({
    collection: 'session-participants',
    where: { user: { equals: user.id } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  const guestSessionIds = (partsRes.docs as any[])
    .map((p) => (typeof p.session === 'object' ? p.session.id : p.session))
    .filter((id): id is number => typeof id === 'number')

  const hostedIds = new Set((hostedRes.docs as any[]).map((s) => s.id))
  const guestOnlyIds = guestSessionIds.filter((id) => !hostedIds.has(id))

  let guestSessions: any[] = []
  if (guestOnlyIds.length > 0) {
    const guestRes = await payload.find({
      collection: 'course-sessions',
      where: { id: { in: guestOnlyIds } },
      limit: 200,
      depth: 1,
      overrideAccess: true,
    })
    guestSessions = guestRes.docs as any[]
  }

  const rows: SessionHistoryRow[] = [
    ...(hostedRes.docs as any[]).map((session) => ({ session, isHost: true })),
    ...guestSessions.map((session) => ({ session, isHost: false })),
  ].sort((a, b) => {
    const aIso = a.session.completedAt || a.session.expiresAt || a.session.createdAt
    const bIso = b.session.completedAt || b.session.expiresAt || b.session.createdAt
    return new Date(bIso || 0).getTime() - new Date(aIso || 0).getTime()
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Historik</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alla provningar du har varit med på.
        </p>
      </header>
      <SessionHistoryList rows={rows} />
    </div>
  )
}
