import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { CreateBlindkampForm } from './CreateBlindkampForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Skapa blindkamp — Vinakademin' }

export default async function SkapaBlindkampPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>
}) {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/blindkamp/skapa')
  const sp = await searchParams
  const clubId = sp.club ? parseInt(sp.club, 10) : null

  let clubMembers: Array<{ id: number; name: string }> = []
  if (clubId && !Number.isNaN(clubId)) {
    const payload = await getPayloadClient()
    try {
      const club = (await payload.findByID({
        collection: 'wine-clubs',
        id: clubId,
        depth: 2,
        overrideAccess: true,
      })) as any
      clubMembers = (club.members ?? [])
        .map((m: any) => {
          const u = typeof m.user === 'object' ? m.user : null
          const uid = u?.id ?? m.user
          if (uid === user.id) return null // host plays automatically
          const name = u?.firstName || u?.email || `Medlem #${uid}`
          return { id: uid, name }
        })
        .filter(Boolean) as Array<{ id: number; name: string }>
    } catch {
      // Club not found — fall through with empty members list
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Skapa blindkamp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {clubId
            ? 'För en av dina vinklubbar.'
            : 'Pop-up — bjud in via länk efter att kampen är skapad.'}
        </p>
      </header>
      <CreateBlindkampForm clubId={clubId} clubMembers={clubMembers} />
    </div>
  )
}
