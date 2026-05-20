import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { SubmissionForm } from './SubmissionForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lämna in ditt vin — Vinakademin' }

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams
  if (!token) notFound()
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) notFound()
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { submissionToken: { equals: token } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const submission = found.docs[0] as any
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">{battle.title || 'Blindkamp'}</h1>
        {battle.themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Ditt val är hemligt. Inga andra deltagare ser vad du tar med.
        </p>
      </header>
      <SubmissionForm
        battleId={battleId}
        token={token}
        theme={battle.theme}
        initial={submission}
      />
    </div>
  )
}
