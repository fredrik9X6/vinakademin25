import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { getSiteURL } from '@/lib/site-url'
import { MembersClient } from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function MedlemmarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/medlemmar`)
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
  if (!myMembership) redirect(`/vinklubbar/${slug}/anslut/${club.inviteCode}`)
  const siteUrl = getSiteURL()
  const inviteUrl = `${siteUrl}/vinklubbar/${slug}/anslut/${club.inviteCode}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={`/vinklubbar/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till {club.name}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Medlemmar</h1>
      </header>

      <MembersClient
        clubId={club.id}
        members={club.members ?? []}
        viewerRole={myMembership.role}
        viewerId={user.id as number}
        inviteUrl={inviteUrl}
      />
    </div>
  )
}
