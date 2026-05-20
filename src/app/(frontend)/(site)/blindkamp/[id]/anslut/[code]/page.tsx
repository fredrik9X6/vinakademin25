import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { JoinGuestClient } from './JoinGuestClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gå med i blindkamp — Vinakademin' }

export default async function BlindkampAnslutPage({
  params,
}: {
  params: Promise<{ id: string; code: string }>
}) {
  const { id, code } = await params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) notFound()
  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({
      collection: 'blind-battles',
      id: battleId,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }
  if (battle.inviteCode !== code) notFound()

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">{battle.title || 'Blindkamp'}</h1>
        {battle.themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>
        )}
      </header>
      <JoinGuestClient battleId={battleId} inviteCode={code} />
    </div>
  )
}
