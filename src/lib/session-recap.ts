import type { Payload } from 'payload'
import type { CourseSession, Media, Review, TastingPlan, Wine } from '@/payload-types'
import { buildPourMaps, resolvePourForReview } from '@/lib/session-pour-mapping'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
import type { PriceBucket } from '@/lib/blind-guess-vocab'

/**
 * Per-wine aggregated stats + the current viewer's own review (when present).
 * Computed from the same review set the live swarm aggregator uses, but
 * extends it with std-dev and the viewer's own picks for the compare view.
 */
export interface PerWineRecap {
  pourOrder: number
  title: string
  subtitle: string
  thumbUrl: string | null
  isCustomWine: boolean
  /** Exact retail price in SEK (from library wine `price` or custom wine `priceSek`). `null` when not set. */
  priceSek: number | null
  ratingCount: number
  avgRating: number | null
  /** Population std-dev. `null` when ratingCount < 2. */
  ratingStdDev: number | null
  /** Top 5 flavours + 'Annat' rollup, deduped per review. */
  topFlavours: Array<{ label: string; count: number }>
  myReview: {
    rating: number | null
    flavours: string[]
    reviewText: string | null
  } | null
}

export interface RecapHeadline {
  topWine: {
    pourOrder: number
    title: string
    avgRating: number
    ratingCount: number
  } | null
  mostDivisive: {
    pourOrder: number
    title: string
    ratingStdDev: number
    ratingCount: number
  } | null
  topGroupFlavours: Array<{ label: string; count: number }>
  totalReviewers: number
  totalReviews: number
}

export interface BlindLeaderboardEntry {
  /** Stable identity key — prefer participant id, fall back to user id. */
  key: string
  displayName: string
  totalPoints: number
  correctCountries: number
  correctGrapes: number
  correctPrices: number
  guessCount: number
}

export interface RecapData {
  headline: RecapHeadline
  perWine: PerWineRecap[]
  /** Top-10 guess leaderboard. Empty when the session wasn't blind or nobody guessed. */
  blindLeaderboard: BlindLeaderboardEntry[]
}

/**
 * Minimum sample size for headline picks. Single-reviewer picks would be
 * noisy ("top wine = a 5★ outlier nobody else rated"); std-dev is undefined
 * with fewer than 2 samples.
 */
const HEADLINE_MIN_RATINGS = 2

/**
 * Population std-dev. Returns `null` when there are fewer than 2 samples.
 */
function stdDev(ratings: number[]): number | null {
  if (ratings.length < 2) return null
  const mean = ratings.reduce((s, r) => s + r, 0) / ratings.length
  const variance =
    ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / ratings.length
  return Math.sqrt(variance)
}

/**
 * Build a stable lowercase label key for case-insensitive flavour merging.
 * Matches the live swarm aggregator (toLocaleLowerCase('sv')).
 */
function labelKey(label: string): string {
  return label.trim().toLocaleLowerCase('sv')
}

function wineTitle(w: NonNullable<TastingPlan['wines']>[number]): {
  title: string
  subtitle: string
  thumbUrl: string | null
  isCustomWine: boolean
  priceSek: number | null
} {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    const image = typeof lib.image === 'object' && lib.image ? (lib.image as Media) : null
    const thumbUrl = image
      ? image.sizes?.bottle?.url ?? image.sizes?.thumbnail?.url ?? image.url ?? null
      : null
    return {
      title: lib.name || `Vin #${lib.id}`,
      subtitle: [lib.winery, lib.vintage ? String(lib.vintage) : null, region]
        .filter(Boolean)
        .join(' · '),
      thumbUrl,
      isCustomWine: false,
      priceSek: lib.price ?? null,
    }
  }
  const c = w.customWine
  return {
    title: c?.name || 'Namnlöst vin',
    subtitle: [c?.producer, c?.vintage].filter(Boolean).join(' · '),
    thumbUrl: c?.imageUrl ?? null,
    isCustomWine: true,
    priceSek: c?.priceSek ?? null,
  }
}

/**
 * Pull the union of palate flavour tiers off a review, deduped. Matches the
 * live swarm aggregator's logic so per-wine and recap counts agree.
 */
function flavoursFromReview(review: Review): string[] {
  const palate = (review as any).wsetTasting?.palate as
    | {
        primaryFlavours?: string[] | null
        secondaryFlavours?: string[] | null
        tertiaryFlavours?: string[] | null
      }
    | undefined
  if (!palate) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const source of [
    palate.primaryFlavours,
    palate.secondaryFlavours,
    palate.tertiaryFlavours,
  ]) {
    if (!Array.isArray(source)) continue
    for (const f of source) {
      const label = typeof f === 'string' ? f.trim() : ''
      if (!label) continue
      const key = labelKey(label)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
  }
  return out
}

function reviewBelongsToViewer(
  review: Review,
  viewerUserId: number,
  viewerParticipantId: number | null,
): boolean {
  const reviewUserId =
    typeof (review as any).user === 'object'
      ? ((review as any).user?.id as number | undefined)
      : ((review as any).user as number | undefined)
  if (reviewUserId === viewerUserId) return true
  if (viewerParticipantId == null) return false
  const reviewParticipantId =
    typeof (review as any).sessionParticipant === 'object'
      ? ((review as any).sessionParticipant?.id as number | undefined)
      : ((review as any).sessionParticipant as number | undefined)
  return reviewParticipantId === viewerParticipantId
}

/**
 * Build a full recap for a finished (or in-progress) session.
 *
 * - `viewerUserId` and `viewerParticipantId` together determine which review
 *   row counts as "yours" on each per-wine card. Hosts pass their user id and
 *   `null` participant. Guests pass their user id (after claim) and their
 *   session-participants row id.
 * - Reviews are fetched at `depth: 1` so user + sessionParticipant joins are
 *   shallow objects (we only need their ids). The wines list comes off the
 *   session.tastingPlan that the caller has already loaded at depth >= 2.
 */
export async function getSessionRecap(
  payload: Payload,
  session: CourseSession,
  viewerUserId: number,
  viewerParticipantId: number | null,
): Promise<RecapData> {
  const plan =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? (session.tastingPlan as TastingPlan)
      : null
  const wines = plan?.wines ?? []
  const pourMaps = buildPourMaps(wines)

  const reviewsRes = await payload.find({
    collection: 'reviews',
    where: { session: { equals: session.id } },
    limit: 1000,
    depth: 1,
    overrideAccess: true,
  })
  const reviews = reviewsRes.docs as Review[]

  type Acc = {
    ratings: number[]
    flavourCounts: Map<string, number>
    /** Original cased label to render — first occurrence wins. */
    flavourLabel: Map<string, string>
    myReview: PerWineRecap['myReview']
  }
  const accs = new Map<number, Acc>()
  const reviewerIds = new Set<string>()

  for (const r of reviews) {
    // Track unique reviewers (prefer participant id, fall back to user id)
    const reviewParticipantId =
      typeof (r as any).sessionParticipant === 'object'
        ? ((r as any).sessionParticipant?.id as number | undefined)
        : ((r as any).sessionParticipant as number | undefined)
    const reviewUserId =
      typeof (r as any).user === 'object'
        ? ((r as any).user?.id as number | undefined)
        : ((r as any).user as number | undefined)
    if (reviewParticipantId != null) reviewerIds.add(`p:${reviewParticipantId}`)
    else if (reviewUserId != null) reviewerIds.add(`u:${reviewUserId}`)

    const pour = resolvePourForReview(r as any, pourMaps)
    if (pour == null) continue

    let acc = accs.get(pour)
    if (!acc) {
      acc = {
        ratings: [],
        flavourCounts: new Map(),
        flavourLabel: new Map(),
        myReview: null,
      }
      accs.set(pour, acc)
    }
    if (typeof (r as any).rating === 'number') acc.ratings.push((r as any).rating)

    const flavours = flavoursFromReview(r)
    for (const f of flavours) {
      const key = labelKey(f)
      acc.flavourCounts.set(key, (acc.flavourCounts.get(key) ?? 0) + 1)
      if (!acc.flavourLabel.has(key)) acc.flavourLabel.set(key, f)
    }

    if (reviewBelongsToViewer(r, viewerUserId, viewerParticipantId)) {
      acc.myReview = {
        rating: typeof (r as any).rating === 'number' ? (r as any).rating : null,
        flavours,
        reviewText: typeof (r as any).reviewText === 'string' ? (r as any).reviewText : null,
      }
    }
  }

  // Project to PerWineRecap[] in pourOrder order
  const perWine: PerWineRecap[] = wines.map((w, idx) => {
    const pourOrder = w.pourOrder ?? idx + 1
    const titleInfo = wineTitle(w)
    const acc = accs.get(pourOrder)
    const ratings = acc?.ratings ?? []
    const ratingCount = ratings.length
    const avgRating =
      ratingCount > 0 ? Number((ratings.reduce((s, r) => s + r, 0) / ratingCount).toFixed(2)) : null
    const sd = stdDev(ratings)
    const ratingStdDev = sd == null ? null : Number(sd.toFixed(2))

    // Top 5 flavours + 'Annat' rollup
    const sorted = Array.from(acc?.flavourCounts ?? []).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 5).map(([key, count]) => ({
      label: acc?.flavourLabel.get(key) ?? key,
      count,
    }))
    const restCount = sorted.slice(5).reduce((s, [, c]) => s + c, 0)
    if (restCount > 0) top.push({ label: 'Annat', count: restCount })

    return {
      pourOrder,
      title: titleInfo.title,
      subtitle: titleInfo.subtitle,
      thumbUrl: titleInfo.thumbUrl,
      isCustomWine: titleInfo.isCustomWine,
      priceSek: titleInfo.priceSek,
      ratingCount,
      avgRating,
      ratingStdDev,
      topFlavours: top,
      myReview: acc?.myReview ?? null,
    }
  })

  // Headline picks — gate on min sample size to keep it honest.
  let topWine: RecapHeadline['topWine'] = null
  let mostDivisive: RecapHeadline['mostDivisive'] = null
  for (const w of perWine) {
    if (w.ratingCount < HEADLINE_MIN_RATINGS || w.avgRating == null) continue
    if (
      !topWine ||
      w.avgRating > topWine.avgRating ||
      (w.avgRating === topWine.avgRating && w.ratingCount > topWine.ratingCount)
    ) {
      topWine = {
        pourOrder: w.pourOrder,
        title: w.title,
        avgRating: w.avgRating,
        ratingCount: w.ratingCount,
      }
    }
    if (w.ratingStdDev != null) {
      if (
        !mostDivisive ||
        w.ratingStdDev > mostDivisive.ratingStdDev ||
        (w.ratingStdDev === mostDivisive.ratingStdDev &&
          (w.avgRating ?? 0) < mostDivisive.ratingStdDev)
      ) {
        mostDivisive = {
          pourOrder: w.pourOrder,
          title: w.title,
          ratingStdDev: w.ratingStdDev,
          ratingCount: w.ratingCount,
        }
      }
    }
  }

  // Group-wide top flavours — sum the per-wine flavour counts across the session.
  const groupFlavours = new Map<string, number>()
  const groupFlavourLabel = new Map<string, string>()
  for (const [, acc] of accs) {
    for (const [key, count] of acc.flavourCounts) {
      groupFlavours.set(key, (groupFlavours.get(key) ?? 0) + count)
      if (!groupFlavourLabel.has(key)) {
        groupFlavourLabel.set(key, acc.flavourLabel.get(key) ?? key)
      }
    }
  }
  const topGroupFlavours = Array.from(groupFlavours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({
      label: groupFlavourLabel.get(key) ?? key,
      count,
    }))

  // ── Blind-tasting leaderboard ───────────────────────────────────────────
  // Only emit when the session was blind. Scores each guess against the wine's
  // resolved BlindAnswer; accumulates per identity (participant first, user
  // fallback). Display name comes from the participant row's nickname when
  // available, else the user's first/last name, else "Anonym".
  const isBlindSession = Boolean((session as { blindTasting?: boolean }).blindTasting)
  let blindLeaderboard: BlindLeaderboardEntry[] = []
  if (isBlindSession) {
    // Build pour → BlindAnswer map from the plan entries
    const answerByPour = new Map<number, BlindAnswer>()
    wines.forEach((w, idx) => {
      const pourOrder = w.pourOrder ?? idx + 1
      const lib = w.libraryWine && typeof w.libraryWine === 'object' ? (w.libraryWine as Wine) : null
      const libCountry =
        lib && typeof lib.country === 'object' && lib.country
          ? (lib.country as { name?: string }).name ?? null
          : null
      const libGrape =
        lib && Array.isArray(lib.grapes) && lib.grapes.length > 0 && typeof lib.grapes[0] === 'object'
          ? ((lib.grapes[0] as { name?: string }).name ?? null)
          : null
      const libPrice =
        lib && typeof (lib as { price?: number }).price === 'number'
          ? ((lib as { price?: number }).price as number)
          : null
      const cust = !lib && w.customWine ? w.customWine : null
      const overrideCountry =
        typeof (w as { blindAnswerCountry?: string | null }).blindAnswerCountry === 'string'
          ? ((w as { blindAnswerCountry?: string | null }).blindAnswerCountry as string)
          : null
      const overrideGrapes = Array.isArray(
        (w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes,
      )
        ? ((w as { blindAnswerGrapes?: string[] | null }).blindAnswerGrapes as string[]).filter(
            (g) => typeof g === 'string' && g.trim().length > 0,
          )
        : []
      const overridePriceBucket =
        ((w as { blindAnswerPriceBucket?: PriceBucket | null }).blindAnswerPriceBucket ?? null) as
          | PriceBucket
          | null
      answerByPour.set(pourOrder, {
        country: overrideCountry ?? libCountry,
        grapes: overrideGrapes.length > 0 ? overrideGrapes : libGrape ? [libGrape] : [],
        priceBucket: overridePriceBucket,
        priceSek: libPrice ?? cust?.priceSek ?? null,
      })
    })

    // Load all guesses for this session
    const guessRes = await payload.find({
      collection: 'session-guesses',
      where: { session: { equals: session.id } },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    })

    type Tally = {
      key: string
      displayName: string
      totalPoints: number
      correctCountries: number
      correctGrapes: number
      correctPrices: number
      guessCount: number
    }
    const tallies = new Map<string, Tally>()

    for (const g of guessRes.docs as Array<{
      sessionParticipant?: number | { id: number; nickname?: string } | null
      user?: number | { id: number; firstName?: string; lastName?: string; email?: string } | null
      pourOrder: number
      guessedCountry?: string | null
      guessedGrape?: string | null
      guessedPriceBucket?: PriceBucket | null
    }>) {
      const answer = answerByPour.get(g.pourOrder)
      if (!answer) continue

      const participantObj =
        g.sessionParticipant && typeof g.sessionParticipant === 'object'
          ? (g.sessionParticipant as { id: number; nickname?: string })
          : null
      const participantId =
        participantObj?.id ??
        (typeof g.sessionParticipant === 'number' ? g.sessionParticipant : null)
      const userObj =
        g.user && typeof g.user === 'object'
          ? (g.user as { id: number; firstName?: string; lastName?: string; email?: string })
          : null
      const userId = userObj?.id ?? (typeof g.user === 'number' ? g.user : null)

      const key = participantId != null ? `p:${participantId}` : userId != null ? `u:${userId}` : null
      if (!key) continue

      const displayName =
        participantObj?.nickname?.trim() ||
        [userObj?.firstName, userObj?.lastName].filter(Boolean).join(' ').trim() ||
        userObj?.email ||
        'Anonym deltagare'

      let tally = tallies.get(key)
      if (!tally) {
        tally = {
          key,
          displayName,
          totalPoints: 0,
          correctCountries: 0,
          correctGrapes: 0,
          correctPrices: 0,
          guessCount: 0,
        }
        tallies.set(key, tally)
      }
      // Keep first-seen display name (handles late nickname changes consistently)
      if (!tally.displayName && displayName) tally.displayName = displayName

      const scored = scoreOne(
        {
          guessedCountry: g.guessedCountry,
          guessedGrape: g.guessedGrape,
          guessedPriceBucket: g.guessedPriceBucket ?? null,
        },
        answer,
      )
      tally.totalPoints += scored.points
      if (scored.countryCorrect) tally.correctCountries += 1
      if (scored.grapeCorrect) tally.correctGrapes += 1
      if (scored.priceCorrect) tally.correctPrices += 1
      tally.guessCount += 1
    }

    blindLeaderboard = Array.from(tallies.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
        if (b.correctCountries !== a.correctCountries)
          return b.correctCountries - a.correctCountries
        if (b.correctGrapes !== a.correctGrapes) return b.correctGrapes - a.correctGrapes
        return b.correctPrices - a.correctPrices
      })
      .slice(0, 10)
  }

  return {
    headline: {
      topWine,
      mostDivisive,
      topGroupFlavours,
      totalReviewers: reviewerIds.size,
      totalReviews: reviews.length,
    },
    perWine,
    blindLeaderboard,
  }
}
