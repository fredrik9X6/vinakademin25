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
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Inbjudan
        </span>
        <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl">
          {battle.title || 'Blindkamp'}
        </h1>
        {battle.themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>
        )}
      </header>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <JoinGuestClient battleId={battleId} inviteCode={code} />
      </div>
    </div>
  )
}
