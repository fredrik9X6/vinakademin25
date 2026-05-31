import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { PlanDetailView } from '@/components/tasting-plan/PlanDetailView'
import { PlanSessionShell } from '@/components/tasting-plan/PlanSessionShell'
import { COUNTRIES, GRAPES } from '@/lib/blind-guess-vocab'
import { pickEasyModeOptions } from '@/lib/blind-guess-decoys'
import type { TastingPlan, CourseSession } from '@/payload-types'

/** Default options-per-tier in easy mode (correct + 3 decoys, or all corrects if a blend hits the cap). */
const EASY_MODE_OPTION_COUNT = 4

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session?: string; host?: string }>
}) {
  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) notFound()

  const payload = await getPayload({ config })
  let plan: TastingPlan | null = null
  try {
    plan = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 2,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    notFound()
  }
  if (!plan) notFound()

  // Session-mode rendering: when ?session=<id> is present and points to an
  // active session for this plan, render the session shell. This path is
  // accessible to unauthenticated guests because session participants may
  // not have an account — their identity is carried by the participant
  // cookie set on /api/sessions/join.
  const sp = await searchParams
  if (sp.session) {
    let session: CourseSession | null = null
    try {
      session = (await payload.findByID({
        collection: 'course-sessions',
        id: sp.session,
        depth: 2,
        overrideAccess: true,
      })) as CourseSession
    } catch {
      session = null
    }
    const sessionPlanId =
      session && typeof session.tastingPlan === 'object'
        ? session.tastingPlan?.id
        : session?.tastingPlan
    if (session && sessionPlanId === plan.id && session.status === 'active') {
      // Determine host strictly from the authenticated user identity matching
      // the session's host (no URL query, no admin auto-elevation). An admin
      // who joins a session as a regular participant gets the participant view
      // — they're a guest in someone else's tasting.
      const viewer = await getUser()
      const sessionHostId =
        session && typeof session.host === 'object' ? session.host?.id : (session as any)?.host
      const isHost = Boolean(viewer && sessionHostId && viewer.id === sessionHostId)
      // Blind redaction: for guests, strip wine identity from un-revealed pours.
      // Hosts always see full info.
      let renderPlan = plan
      if (!isHost && (session as any).blindTasting) {
        const revealed: number[] = Array.isArray((session as any).revealedPourOrders)
          ? ((session as any).revealedPourOrders as number[])
          : []
        const easyMode = Boolean((session as any).blindGuessEasyMode)
        renderPlan = {
          ...plan,
          wines: (plan.wines ?? []).map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            if (revealed.includes(pourOrder)) return w

            // Read original (unredacted) answer fields once — reused for both
            // easy-mode decoy generation and blindTiers activation booleans.
            const origCountry =
              typeof (w as { blindAnswerCountry?: string | null }).blindAnswerCountry === 'string'
                ? ((w as { blindAnswerCountry?: string | null }).blindAnswerCountry as string)
                : null
            const origGrapes = Array.isArray(
              (w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes,
            )
              ? ((w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes as string[])
              : []
            const origPriceBucket =
              (w as { blindAnswerPriceBucket?: string | null }).blindAnswerPriceBucket ?? null

            // Compute easy-mode decoy options from the ORIGINAL (unredacted)
            // wine entry so the correct answer is guaranteed in the set. The
            // resulting `easyModeOptions` field is non-persistent — it lives
            // only on the render payload for the BlindGuessCard to consume.
            let easyModeOptions: {
              countries: string[] | null
              grapes: string[] | null
            } | null = null
            if (easyMode) {
              easyModeOptions = {
                countries: pickEasyModeOptions({
                  pool: COUNTRIES as ReadonlyArray<string>,
                  answers: origCountry ? [origCountry] : [],
                  count: EASY_MODE_OPTION_COUNT,
                  seed: `${session.id}:${pourOrder}:country`,
                }),
                grapes: pickEasyModeOptions({
                  pool: GRAPES as ReadonlyArray<string>,
                  answers: origGrapes,
                  count: EASY_MODE_OPTION_COUNT,
                  seed: `${session.id}:${pourOrder}:grape`,
                }),
              }
            }

            // Derive per-tier activation booleans — booleans only, no answer
            // values — so the guest knows which selects to render without
            // leaking what the correct answers are.
            // Raw price: an explicit bucket OR a numeric price on the source wine
            // (library wine price or customWine.priceSek) mirrors
            // resolveAnswerPriceBucket's inputs.
            const libWine =
              w.libraryWine && typeof w.libraryWine === 'object'
                ? (w.libraryWine as { price?: number })
                : null
            const custWine =
              (w as { customWine?: { priceSek?: number | null } | null }).customWine ?? null
            const rawPriceAvailable =
              (libWine != null && typeof libWine.price === 'number' && libWine.price > 0) ||
              (custWine != null && typeof custWine.priceSek === 'number' && custWine.priceSek > 0)
            const blindTiers = {
              country: typeof origCountry === 'string' && origCountry.trim().length > 0,
              grape: origGrapes.some((g) => typeof g === 'string' && g.trim().length > 0),
              price: Boolean(origPriceBucket) || rawPriceAvailable,
            }

            return {
              ...w,
              libraryWine: null,
              customWine: undefined,
              hostNotes: null,
              // Strip the blind-tasting answers too — they'd otherwise leak
              // the country/grape/price-bucket to the guest before reveal.
              blindAnswerCountry: null,
              blindAnswerGrapes: null,
              blindAnswerPriceBucket: null,
              easyModeOptions,
              blindTiers,
            }
          }),
        } as typeof plan
      }
      return (
        <PlanSessionShell
          plan={renderPlan}
          session={session}
          isHost={isHost}
          sessionId={String(session.id)}
        />
      )
    }
  }

  // Detail-page mode requires auth + owner.
  const user = await getUser()
  if (!user) {
    redirect(`/logga-in?from=/mina-provningar/planer/${id}`)
  }
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  const isAdmin = user.role === 'admin'
  if (!isAdmin && ownerId !== user.id) notFound()

  return <PlanDetailView plan={plan} />
}
