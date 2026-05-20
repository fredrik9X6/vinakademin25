import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function InstallningarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/installningar`)
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const club = found.docs[0] as any
  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    redirect(`/vinklubbar/${slug}`)
  }
  const isOwner = myMembership.role === 'owner'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={`/vinklubbar/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till {club.name}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Inställningar</h1>
      </header>
      <SettingsClient
        clubId={club.id}
        clubName={club.name}
        clubDescription={club.description ?? ''}
        isOwner={isOwner}
      />
    </div>
  )
}
