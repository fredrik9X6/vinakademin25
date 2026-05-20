import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { getSiteURL } from '@/lib/site-url'
import { BattleStatusPanel } from './BattleStatusPanel'

export const dynamic = 'force-dynamic'

export default async function BlindkampHomePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) notFound()
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}`)

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

  const submissions = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  const mySubmission = (submissions.docs as any[]).find((s) => {
    const uid = typeof s.user === 'object' ? s.user?.id : s.user
    return uid === user.id
  })
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  const isHost = hostId === user.id
  const submittedCount = (submissions.docs as any[]).filter((s) => s.status === 'submitted').length
  const totalCount = submissions.docs.length
  const siteUrl = getSiteURL()
  const popupInviteUrl = `${siteUrl}/blindkamp/${battleId}/anslut/${battle.inviteCode}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Blindkamp
        </span>
        <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl">
          {battle.title || 'Blindkamp'}
        </h1>
        {battle.themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>
        )}
      </header>

      <BattleStatusPanel
        battleId={battleId}
        status={battle.status}
        submittedCount={submittedCount}
        totalCount={totalCount}
        isHost={isHost}
        mySubmissionToken={mySubmission?.submissionToken ?? null}
        mySubmissionStatus={mySubmission?.status ?? null}
        popupInviteUrl={battle.club ? null : popupInviteUrl}
      />
    </div>
  )
}
