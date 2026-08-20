import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type {
  VinkompassArchetype,
  VinkompassAttempt,
  Wine,
  Vinkurser,
} from '@/payload-types'
import { getSiteURL } from '@/lib/site-url'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import type { QuadrantKey } from '@/lib/vinkompassen/types'
import { ArchetypeMap } from '../../_components/ArchetypeMap'
import { WineGrid } from '../../_components/WineGrid'
import { EmailGate } from './EmailGate'
import { ResultActions } from './ResultActions'
import { VinkursCard } from './VinkursCard'

interface PageProps {
  params: Promise<{ attemptId: string }>
}

/** Quadrant key → display name for all four archetypes. */
async function loadArchetypeNames(): Promise<Partial<Record<QuadrantKey, string>>> {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'vinkompass-archetypes',
      limit: 10,
      depth: 0,
    })
    const out: Partial<Record<QuadrantKey, string>> = {}
    for (const doc of res.docs as VinkompassArchetype[]) {
      if (doc.key && doc.name) out[doc.key as QuadrantKey] = doc.name
    }
    return out
  } catch {
    // The map falls back to axis wording ("Lätt & klassisk"), so a failure here
    // degrades the labels rather than breaking the result page.
    return {}
  }
}

async function loadAttempt(attemptId: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'vinkompass-attempts',
    where: { attemptId: { equals: attemptId } },
    limit: 1,
    // depth 3 — one level deeper than you'd expect because the chain is
    // attempt → archetype → recommendedWines[] → wine.image (Media). At
    // depth 2, wine.image arrives as a bare ID and VinlistanWineCard sees
    // `typeof wine.image === 'number'`, falls back to the placeholder, and
    // the result page shows wine-bottle silhouettes instead of real images.
    depth: 3,
  })
  return res.docs[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { attemptId } = await params
  const attempt = await loadAttempt(attemptId)
  const archetype = (attempt?.archetype as VinkompassArchetype | undefined) || null
  const title = archetype ? `${archetype.name} — Vinhoroskop` : 'Vinhoroskop'
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
  // Field name on VinkompassArchetypes is still `recommendedVinprovning` —
  // we kept the legacy field name to avoid a DB column rename (spec D2).
  // The relationTo target is the renamed `vinkurser` collection.
  const recommendedVinkurs =
    archetype.recommendedVinprovning && typeof archetype.recommendedVinprovning === 'object'
      ? (archetype.recommendedVinprovning as Vinkurser)
      : null

  const isGated = !attempt.email

  // All four names so the map can label every quadrant, not just the winner —
  // seeing the three you are NOT is what makes the one you are mean something.
  // Four tiny docs; the page is already dynamic. Falls back to axis wording if
  // the query fails, so the map never renders empty.
  const archetypeNames = await loadArchetypeNames()

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
        <div className="w-full max-w-[240px] shrink-0 sm:w-[220px]">
          <ArchetypeMap
            active={archetype.key as QuadrantKey}
            scoreBody={attempt.scoreBody}
            scoreComfort={attempt.scoreComfort}
            names={archetypeNames}
          />
        </div>
        <div className="flex-1">
          <RichTextRenderer content={archetype.description} />
        </div>
      </div>

      {/* The wines come BEFORE the share row. Sharing is something you do once
          you have your result, so putting it above the gate signalled "page
          over" and buried the only conversion point on the page. */}
      <div className="mt-12">
        <h2 className="mb-5 font-heading text-3xl leading-[1.1] tracking-[-0.015em]">
          Sex viner för dig
        </h2>

        {isGated ? (
          <>
            {/* The gate used to render nothing but a form, so "dina 6 viner"
                referred to something the reader had never seen. Showing the
                real bottles blurred makes the offer concrete: there is
                visibly a list here, and it is visibly not readable yet. */}
            <div className="relative -mb-14 max-h-[240px] overflow-hidden" aria-hidden="true">
              <div className="pointer-events-none select-none blur-[7px] saturate-75">
                <WineGrid
                  wines={recommendedWines.slice(0, 6)}
                  archetypeKey={archetype.key}
                  columnsClassName="grid grid-cols-3 gap-3"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/75 to-background" />
            </div>
            <div className="relative">
              <EmailGate attemptId={attempt.attemptId} archetypeKey={archetype.key} />
            </div>
          </>
        ) : (
          <>
            <WineGrid wines={recommendedWines.slice(0, 8)} archetypeKey={archetype.key} />

            {recommendedVinkurs ? (
              <VinkursCard
                href={`/vinkvallen/${recommendedVinkurs.slug}`}
                title={recommendedVinkurs.title}
                archetypeKey={archetype.key}
                vinkursSlug={recommendedVinkurs.slug}
              />
            ) : null}
          </>
        )}
      </div>

      <div className="mt-12 border-t pt-8">
        <ResultActions attemptId={attempt.attemptId} archetypeKey={archetype.key} />
      </div>
    </main>
  )
}
