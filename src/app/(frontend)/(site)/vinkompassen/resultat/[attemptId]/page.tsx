import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type {
  VinkompassArchetype,
  VinkompassAttempt,
  Wine,
  Vinprovningar,
} from '@/payload-types'
import { getSiteURL } from '@/lib/site-url'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import type { QuadrantKey } from '@/lib/vinkompassen/types'
import { QuadrantMini } from '../../_components/QuadrantMini'
import { WineGrid } from '../../_components/WineGrid'
import { EmailGate } from './EmailGate'
import { ResultActions } from './ResultActions'
import { VinprovningCard } from './VinprovningCard'

interface PageProps {
  params: Promise<{ attemptId: string }>
}

async function loadAttempt(attemptId: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'vinkompass-attempts',
    where: { attemptId: { equals: attemptId } },
    limit: 1,
    depth: 2, // populate archetype + archetype.recommendedWines + recommendedVinprovning
  })
  return res.docs[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { attemptId } = await params
  const attempt = await loadAttempt(attemptId)
  const archetype = (attempt?.archetype as VinkompassArchetype | undefined) || null
  const title = archetype ? `${archetype.name} — Vinkompassen` : 'Vinkompassen'
  const description = archetype?.tagline || 'Hitta din vintyp på 90 sekunder.'
  const ogUrl = `${getSiteURL()}/api/vinkompassen/og/${attemptId}`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
  }
}

export default async function VinkompassenResultPage({ params }: PageProps) {
  const { attemptId } = await params
  const attempt = (await loadAttempt(attemptId)) as VinkompassAttempt | null
  if (!attempt) notFound()

  const archetype = attempt.archetype as VinkompassArchetype
  const recommendedWines: Wine[] = Array.isArray(archetype.recommendedWines)
    ? (archetype.recommendedWines as Wine[]).filter((w): w is Wine => typeof w === 'object')
    : []
  const recommendedVinprovning =
    archetype.recommendedVinprovning && typeof archetype.recommendedVinprovning === 'object'
      ? (archetype.recommendedVinprovning as Vinprovningar)
      : null

  const isGated = !attempt.email

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      {/* Top — always visible */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Din vintyp
      </span>
      <h1 className="mt-3 font-heading text-5xl leading-[1.05] tracking-[-0.015em] md:text-6xl">
        {archetype.name}
      </h1>
      <p className="mt-3 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
        {archetype.tagline}
      </p>

      <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <QuadrantMini active={archetype.key as QuadrantKey} size={180} />
        <div className="flex-1">
          <RichTextRenderer content={archetype.description} />
        </div>
      </div>

      <div className="mt-8">
        <ResultActions attemptId={attempt.attemptId} archetypeKey={archetype.key} />
      </div>

      {/* Below — gate or grid */}
      <div className="mt-12">
        {isGated ? (
          <EmailGate attemptId={attempt.attemptId} archetypeKey={archetype.key} />
        ) : (
          <>
            <h2 className="mb-5 font-heading text-3xl leading-[1.1] tracking-[-0.015em]">
              Sex viner för dig
            </h2>
            <WineGrid wines={recommendedWines.slice(0, 8)} archetypeKey={archetype.key} />

            {recommendedVinprovning ? (
              <VinprovningCard
                href={`/vinprovningar/${recommendedVinprovning.slug}`}
                title={recommendedVinprovning.title}
                archetypeKey={archetype.key}
                vinprovningSlug={recommendedVinprovning.slug}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
