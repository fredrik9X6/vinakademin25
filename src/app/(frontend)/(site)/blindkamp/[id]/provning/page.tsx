import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { ProvningClient } from './ProvningClient'

export const dynamic = 'force-dynamic'

export default async function ProvningPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) notFound()
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}/provning`)

  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({
      collection: 'blind-battles',
      id: battleId,
      depth: 2,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  const mySubmission = (subs.docs as any[]).find((s) => {
    const uid = typeof s.user === 'object' ? s.user?.id : s.user
    return uid === user.id
  })
  if (!mySubmission) redirect(`/blindkamp/${battleId}`)

  const wineLabel =
    mySubmission.systembolagetProduct?.productNameBold ||
    mySubmission.customWine?.name ||
    'Ditt vin'
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  const isHost = hostId === user.id
  const sessionId =
    typeof battle.currentSession === 'object'
      ? battle.currentSession?.id
      : battle.currentSession

  let joinCode: string | null = null
  if (typeof sessionId === 'number') {
    try {
      const session = (await payload.findByID({
        collection: 'course-sessions',
        id: sessionId,
        overrideAccess: true,
      })) as any
      joinCode = session?.joinCode ?? null
    } catch {
      // session vanished; redirect back to battle home
    }
  }
  if (!joinCode) redirect(`/blindkamp/${battleId}`)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <ProvningClient
        battleId={battleId}
        joinCode={joinCode}
        mySlot={mySubmission.pourOrder}
        myWineLabel={wineLabel}
        isHost={isHost}
        totalSlots={subs.docs.length}
      />
    </div>
  )
}
