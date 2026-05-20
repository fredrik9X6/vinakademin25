import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { Button } from '@/components/ui/button'
import { Settings, Users } from 'lucide-react'
import { OversiktTab } from './OversiktTab'
import { TopplistaTab } from './TopplistaTab'
import { HistorikTab } from './HistorikTab'

export const dynamic = 'force-dynamic'

export default async function VinklubbHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab = 'oversikt' } = await searchParams
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}`)

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const club = found.docs[0] as any

  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership) {
    redirect(`/vinklubbar/${slug}/anslut/${club.inviteCode}`)
  }
  const canManage = myMembership.role === 'owner' || myMembership.role === 'admin'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading">{club.name}</h1>
          {club.description && (
            <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/vinklubbar/${slug}/medlemmar`}>
              <Users className="h-4 w-4 mr-1.5" />
              Medlemmar ({(club.members ?? []).length})
            </Link>
          </Button>
          {canManage && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/vinklubbar/${slug}/installningar`}>
                <Settings className="h-4 w-4 mr-1.5" /> Inställningar
              </Link>
            </Button>
          )}
        </div>
      </header>

      <nav className="flex border-b border-border">
        {[
          { key: 'oversikt', label: 'Översikt' },
          { key: 'topplista', label: 'Topplista' },
          { key: 'historik', label: 'Historik' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/vinklubbar/${slug}?tab=${t.key}`}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors text-sm font-medium ${
              tab === t.key
                ? 'border-brand-400 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'oversikt' && <OversiktTab club={club} canManage={canManage} />}
      {tab === 'topplista' && <TopplistaTab clubId={club.id} />}
      {tab === 'historik' && <HistorikTab clubId={club.id} />}
    </div>
  )
}
