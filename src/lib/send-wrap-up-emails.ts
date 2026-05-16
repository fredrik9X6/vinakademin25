import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from './logger'
import { getSiteURL } from './site-url'
import {
  buildWrapUpEmail,
  type WrapUpEmailInput,
  type WrapUpRecommendation,
} from './session-emails/wrap-up'
import { recommendByGrape } from './wines/recommend-by-grape'
import type { Wine, Review, TastingPlan, Vinprovningar, CourseSession } from '@/payload-types'

const log = loggerFor('lib-send-wrap-up-emails')

/** 18 hours in ms — the post-session delay before recap fires. */
const POST_COMPLETE_DELAY_MS = 18 * 60 * 60 * 1000

/** Cap per cron run — protects against runaway loops. */
const MAX_SESSIONS_PER_RUN = 50

interface SendResult {
  sessionsProcessed: number
  emailsSent: number
  emailsSkipped: number
  emailsFailed: number
}

/**
 * Core logic for the post-tasting wrap-up email.
 *
 * Finds course-sessions either completed-and-aged or expired-and-aged
 * past 18 hours that have not yet been processed (wrapUpEmailsDispatchedAt
 * is null). For each, walks all participants. A participant gets an email
 * only if they have at least one review in this session; otherwise they're
 * stamped as skipped.
 *
 * Called by both:
 * - scripts/send-wrap-up-emails.ts (Railway Cron, preferred)
 * - /api/cron/send-wrap-up-emails (HTTP twin for manual trigger)
 */
export async function sendPendingWrapUpEmails(): Promise<SendResult> {
  const payload = await getPayload({ config })
  const siteUrl = getSiteURL()
  const cutoff = new Date(Date.now() - POST_COMPLETE_DELAY_MS).toISOString()

  // 1. Find due sessions
  const dueSessions = await payload.find({
    collection: 'course-sessions',
    where: {
      and: [
        { wrapUpEmailsDispatchedAt: { exists: false } },
        {
          or: [
            {
              and: [
                { status: { equals: 'completed' } },
                { completedAt: { less_than: cutoff } },
              ],
            },
            {
              and: [
                { status: { not_equals: 'completed' } },
                { expiresAt: { less_than: cutoff } },
              ],
            },
          ],
        },
      ],
    },
    depth: 2, // populate course + tastingPlan (with wines)
    limit: MAX_SESSIONS_PER_RUN,
    overrideAccess: true,
  })

  let emailsSent = 0
  let emailsSkipped = 0
  let emailsFailed = 0

  for (const session of dueSessions.docs as CourseSession[]) {
    const sessionContext = await resolveSessionContext(session)
    if (!sessionContext) {
      log.warn({ sessionId: session.id }, 'wrap_up_session_context_unavailable')
      await stampSession(payload, session.id)
      continue
    }

    const participants = await payload.find({
      collection: 'session-participants',
      where: { session: { equals: session.id } },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    })

    for (const p of participants.docs as any[]) {
      if (p.wrapUpEmailDispatchedAt) continue

      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : null
      if (!email) {
        await stampParticipant(payload, p.id)
        emailsSkipped++
        continue
      }

      // Find this participant's reviews for the session
      const reviewRes = await payload.find({
        collection: 'reviews',
        where: { sessionParticipant: { equals: p.id } },
        limit: 100,
        depth: 2, // populate review.wine + wine.grapes
        overrideAccess: true,
      })
      const userReviews = reviewRes.docs as Review[]

      if (userReviews.length === 0) {
        await stampParticipant(payload, p.id)
        emailsSkipped++
        continue
      }

      try {
        const emailInput = await buildEmailInput({
          payload,
          siteUrl,
          session,
          sessionContext,
          participant: p,
          userReviews,
        })
        const { subject, html, text } = buildWrapUpEmail(emailInput)
        await payload.sendEmail({ to: email, subject, html, text })
        await stampParticipant(payload, p.id)
        emailsSent++
        log.info(
          { participantId: p.id, sessionId: session.id, email },
          'wrap_up_email_sent',
        )
      } catch (err) {
        log.error(
          { err, participantId: p.id, sessionId: session.id, email },
          'wrap_up_email_send_failed',
        )
        emailsFailed++
        // do NOT stamp — retry next tick
      }

      await sleep(100) // gentle on Resend rate limit
    }

    await stampSession(payload, session.id)
  }

  return {
    sessionsProcessed: dueSessions.docs.length,
    emailsSent,
    emailsSkipped,
    emailsFailed,
  }
}

// ───────────────────────────── helpers ───────────────────────────── //

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function stampSession(payload: any, sessionId: number | string) {
  try {
    await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data: { wrapUpEmailsDispatchedAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    log.error({ err, sessionId }, 'wrap_up_session_stamp_failed')
  }
}

async function stampParticipant(payload: any, participantId: number | string) {
  try {
    await payload.update({
      collection: 'session-participants',
      id: participantId,
      data: { wrapUpEmailDispatchedAt: new Date().toISOString() },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    log.error({ err, participantId }, 'wrap_up_participant_stamp_failed')
  }
}

interface SessionContext {
  title: string
  /** Wines in pour order, with display fields. */
  wines: Array<{
    pourOrder: number
    wineId: number | null
    title: string
    subtitle: string
    slug: string | null
    grapes: number[]
  }>
}

/**
 * Resolve a session's display title and wine list (handles both course and
 * plan modes). Walks the populated tree from depth=2 fetch.
 */
async function resolveSessionContext(
  session: CourseSession,
): Promise<SessionContext | null> {
  if (session.course && typeof session.course === 'object') {
    const course = session.course as Vinprovningar
    // For courses, the "wines" are the lesson's assigned wine (wineReview lessons).
    const contentItemRefs: Array<{ pourOrder: number; wine: Wine }> = []
    let pourOrder = 0
    const modules = (course as any).modules as Array<any> | undefined
    if (modules) {
      for (const mod of modules) {
        const items = (mod as any).contents as Array<any> | undefined
        if (!items) continue
        for (const item of items) {
          const ci = typeof item === 'object' ? item : null
          if (!ci) continue
          const assigned = (ci as any).assignedWine
          if (!assigned || typeof assigned !== 'object') continue
          pourOrder += 1
          contentItemRefs.push({ pourOrder, wine: assigned as Wine })
        }
      }
    }
    return {
      title: course.title ?? 'din vinprovning',
      wines: contentItemRefs.map((r) => ({
        pourOrder: r.pourOrder,
        wineId: r.wine.id,
        title: r.wine.name || `Vin #${r.wine.id}`,
        subtitle: buildSubtitle(r.wine),
        slug: r.wine.slug ?? null,
        grapes: extractGrapeIds(r.wine),
      })),
    }
  }
  if (session.tastingPlan && typeof session.tastingPlan === 'object') {
    const plan = session.tastingPlan as TastingPlan
    const planWines = plan.wines ?? []
    return {
      title: plan.title ?? 'din vinprovning',
      wines: planWines.map((pw, idx) => {
        const pourOrder = pw.pourOrder ?? idx + 1
        if (pw.libraryWine && typeof pw.libraryWine === 'object') {
          const w = pw.libraryWine as Wine
          return {
            pourOrder,
            wineId: w.id,
            title: w.name || `Vin #${w.id}`,
            subtitle: buildSubtitle(w),
            slug: w.slug ?? null,
            grapes: extractGrapeIds(w),
          }
        }
        const c = pw.customWine
        return {
          pourOrder,
          wineId: null,
          title: c?.name || 'Namnlöst vin',
          subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
          slug: null,
          grapes: [],
        }
      }),
    }
  }
  return null
}

function buildSubtitle(w: Wine): string {
  const region =
    typeof w.region === 'object' && w.region ? (w.region as any).name ?? null : null
  return [w.winery, w.vintage ? String(w.vintage) : null, region].filter(Boolean).join(' · ')
}

function extractGrapeIds(w: Wine): number[] {
  const out: number[] = []
  for (const g of w.grapes ?? []) {
    const id = typeof g === 'object' ? g.id : g
    if (typeof id === 'number') out.push(id)
  }
  return out
}

interface BuildInput {
  payload: any
  siteUrl: string
  session: CourseSession
  sessionContext: SessionContext
  participant: any
  userReviews: Review[]
}

async function buildEmailInput({
  payload,
  siteUrl,
  session,
  sessionContext,
  participant,
  userReviews,
}: BuildInput): Promise<WrapUpEmailInput> {
  const dateText = (() => {
    const iso = session.completedAt || session.expiresAt || session.createdAt
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('sv-SE')
  })()

  const isGuest = !participant.user

  // Map user reviews to session pour-orders
  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  for (const w of sessionContext.wines) {
    if (w.wineId != null) wineIdToPour[w.wineId] = w.pourOrder
    titleToPour[w.title.toLowerCase()] = w.pourOrder
  }

  const userReviewsRendered = userReviews
    .map((r) => {
      const wineRef = (r as any).wine
      let pour: number | undefined
      if (wineRef) {
        const id = typeof wineRef === 'object' ? wineRef.id : wineRef
        if (typeof id === 'number') pour = wineIdToPour[id]
      } else if ((r as any).customWine?.name) {
        pour = titleToPour[String((r as any).customWine.name).toLowerCase()]
      }
      if (pour == null) return null
      const notes = (r as any).reviewText
      const excerpt =
        typeof notes === 'string'
          ? notes.length > 140
            ? notes.slice(0, 137) + '…'
            : notes
          : null
      const buyAgain = (r as any).buyAgain as 'yes' | 'maybe' | 'no' | null | undefined
      return {
        pourOrder: pour,
        rating: typeof (r as any).rating === 'number' ? (r as any).rating : null,
        notesExcerpt: excerpt,
        buyAgain: buyAgain ?? null,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.pourOrder - b.pourOrder)

  // Group comparison (gated on ≥2 distinct reviewers inside)
  const groupComparison = await buildGroupComparison(payload, session.id, sessionContext)

  // Recommendations: anchor on the user's ≥4-star LIBRARY wines (custom wines have no grapes)
  const anchorWineIds = new Set<number>()
  for (const r of userReviews) {
    const rating = (r as any).rating
    if (typeof rating !== 'number' || rating < 4) continue
    const wineRef = (r as any).wine
    if (!wineRef) continue
    const id = typeof wineRef === 'object' ? wineRef.id : wineRef
    if (typeof id === 'number') anchorWineIds.add(id)
  }
  const anchorWines = sessionContext.wines
    .filter((w) => w.wineId != null && anchorWineIds.has(w.wineId))
    .map((w) => ({ id: w.wineId as number, grapes: w.grapes }))

  // Exclude wines the user already reviewed (any session)
  const userId = participant.user
    ? typeof participant.user === 'object'
      ? participant.user.id
      : participant.user
    : null
  let userReviewedIds: number[] = []
  if (userId) {
    const userReviewsAll = await payload.find({
      collection: 'reviews',
      where: { user: { equals: userId } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    userReviewedIds = (userReviewsAll.docs as any[])
      .map((r) => (typeof r.wine === 'number' ? r.wine : r.wine?.id))
      .filter((id): id is number => typeof id === 'number')
  }

  const sessionWineIds = sessionContext.wines
    .map((w) => w.wineId)
    .filter((id): id is number => typeof id === 'number')

  const recs = await recommendByGrape({
    payload,
    anchorWines: anchorWines as any,
    excludeWineIds: userReviewedIds,
    sessionWineIds,
    limit: 5,
  })

  const recommendations: WrapUpRecommendation[] | null =
    recs.length >= 3
      ? recs.map((w) => ({
          slug: w.slug ?? '',
          title: w.name || `Vin #${w.id}`,
          subtitle: buildSubtitle(w),
          thumbnailUrl:
            typeof w.image === 'object' && w.image
              ? w.image.sizes?.thumbnail?.url ?? w.image.url ?? null
              : null,
        }))
      : null

  const ctaUrl = isGuest
    ? `${siteUrl}/registrera?claim=session&redirect=${encodeURIComponent('/mina-sidor')}`
    : `${siteUrl}/vinlistan`
  const ctaLabel = isGuest ? 'Spara dina betyg →' : 'Utforska Vinlistan →'

  return {
    nickname: participant.nickname ?? null,
    title: sessionContext.title,
    dateText,
    isGuest,
    wines: sessionContext.wines.map((w) => ({
      pourOrder: w.pourOrder,
      slug: w.slug,
      title: w.title,
      subtitle: w.subtitle,
    })),
    userReviews: userReviewsRendered,
    groupComparison,
    recommendations,
    ctaUrl,
    ctaLabel,
  }
}

async function buildGroupComparison(
  payload: any,
  sessionId: number | string,
  sessionContext: SessionContext,
): Promise<WrapUpEmailInput['groupComparison']> {
  const allReviews = await payload.find({
    collection: 'reviews',
    where: { session: { equals: sessionId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  type Acc = { ratings: number[]; title: string; pourOrder: number }
  const byPour: Record<number, Acc> = {}
  for (const w of sessionContext.wines) {
    byPour[w.pourOrder] = { ratings: [], title: w.title, pourOrder: w.pourOrder }
  }

  const wineIdToPour: Record<number, number> = {}
  const titleToPour: Record<string, number> = {}
  for (const w of sessionContext.wines) {
    if (w.wineId != null) wineIdToPour[w.wineId] = w.pourOrder
    titleToPour[w.title.toLowerCase()] = w.pourOrder
  }

  for (const r of allReviews.docs as any[]) {
    let pour: number | undefined
    if (r.wine) {
      const id = typeof r.wine === 'object' ? r.wine.id : r.wine
      if (typeof id === 'number') pour = wineIdToPour[id]
    } else if (r.customWine?.name) {
      pour = titleToPour[String(r.customWine.name).toLowerCase()]
    }
    if (pour == null) continue
    if (typeof r.rating === 'number') byPour[pour].ratings.push(r.rating)
  }

  const rows = Object.values(byPour)
    .filter((a) => a.ratings.length >= 1)
    .map((a) => ({
      pourOrder: a.pourOrder,
      title: a.title,
      avgRating: a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length,
      reviewerCount: a.ratings.length,
    }))
    .sort((a, b) => a.pourOrder - b.pourOrder)

  // Only show the block if ≥2 distinct reviewers contributed
  const totalReviewers = new Set<number | string>()
  for (const r of allReviews.docs as any[]) {
    const pid = r.sessionParticipant
    if (pid) totalReviewers.add(typeof pid === 'object' ? pid.id : pid)
  }
  if (totalReviewers.size < 2) return null

  const favorite = rows.reduce<typeof rows[number] | null>(
    (best, row) => (best == null || row.avgRating > best.avgRating ? row : best),
    null,
  )

  return { rows, favoriteTitle: favorite?.title ?? null }
}
