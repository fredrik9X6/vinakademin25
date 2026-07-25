import { NextRequest, NextResponse } from 'next/server'
import { getPayload, ValidationError } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'
import { resolveWineIdentityForPour, buildPourMaps, resolvePourForReview } from '@/lib/session-pour-mapping'

const log = loggerFor('reviews-api')

/**
 * POST /api/reviews
 * Create a new wine review
 *
 * This custom route ensures proper authentication with Next.js App Router
 * BUT handles PayloadCMS admin requests using PayloadCMS's native methods
 */
export async function POST(request: NextRequest) {
  log.info('POST request received')

  // Set true only when this handler resolves wine identity server-side (the
  // blind-tasting path, inside the try block below). Declared here — before
  // the try — rather than inside it, so the catch block can read it too:
  // Finding 1 gates the validation-error response on this flag the same way
  // the 201 success path already gates the doc (see depth:0 + doc-trimming
  // near the bottom of the try block). If this were declared inside the try,
  // it would be out of scope in the catch and the gate would silently no-op.
  let identityResolvedServerSide = false

  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')
    void token

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    log.info({ userId: user?.id, email: user?.email }, 'Authenticated user')

    // Check if this is a PayloadCMS admin request
    const isAdminRequest = request.headers.get('x-payload-admin') === 'true'
    const referer = request.headers.get('referer') || ''
    const isFromAdminUI = referer.includes('/admin')
    const { searchParams } = new URL(request.url)

    // PayloadCMS admin requests often have specific query params or patterns
    const hasPayloadQueryParams =
      searchParams.has('depth') ||
      searchParams.has('locale') ||
      searchParams.has('fallback-locale') ||
      searchParams.has('where') ||
      searchParams.has('limit') ||
      searchParams.has('sort')

    // If it's an admin request, handle it using PayloadCMS's native methods
    if (isAdminRequest || isFromAdminUI || hasPayloadQueryParams) {
      log.info('Handling admin request with PayloadCMS methods')

      // Extract query params for PayloadCMS find operations
      const depth = searchParams.get('depth') ? parseInt(searchParams.get('depth') || '0') : 0
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') || '10') : 10
      const page = searchParams.get('page') ? parseInt(searchParams.get('page') || '1') : 1
      const sort = searchParams.get('sort') || '-createdAt'
      const whereParam = searchParams.get('where')

      let where: any = {}
      if (whereParam) {
        try {
          where = JSON.parse(whereParam)
        } catch {
          // If parsing fails, use empty where
        }
      }

      // First, try to parse the body to determine if this is a create/update or relationship fetch
      const contentType = request.headers.get('content-type') || ''
      let body: any = {}
      let isRelationshipFetch = false

      try {
        if (contentType.includes('application/json')) {
          const bodyText = await request.text()
          if (bodyText && bodyText.trim()) {
            body = JSON.parse(bodyText)
            log.debug({ body }, 'Parsed JSON body')
            // Check if body has actual data (not just empty object)
            isRelationshipFetch =
              Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          } else {
            isRelationshipFetch = true
          }
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData()
          // Extract _payload field if it exists (PayloadCMS admin format)
          const payloadField = formData.get('_payload') as string
          if (payloadField) {
            body = JSON.parse(payloadField)
            log.debug({ body }, 'Parsed _payload field')
            isRelationshipFetch =
              Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          } else {
            // Extract all form fields
            const formEntries: Record<string, any> = {}
            for (const [key, value] of formData.entries()) {
              formEntries[key] = value
            }
            body = formEntries
            log.debug({ body }, 'Parsed FormData entries')
            isRelationshipFetch =
              Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          }
        } else {
          const bodyText = await request.text()
          log.debug({ bodyPreview: bodyText.substring(0, 500) }, 'Raw body text')
          if (bodyText && bodyText.trim()) {
            try {
              body = JSON.parse(bodyText)
              log.debug({ body }, 'Parsed body from text')
              isRelationshipFetch =
                Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
            } catch {
              isRelationshipFetch = true
            }
          } else {
            isRelationshipFetch = true
          }
        }
      } catch (parseError) {
        log.error({ err: parseError }, 'Error parsing admin request body')
        // If parsing fails, assume it's a relationship fetch
        isRelationshipFetch = true
      }

      // For relationship fetches (empty body or no required fields), use find
      if (isRelationshipFetch && !searchParams.has('id')) {
        log.info('Admin relationship fetch request')
        const result = await payload.find({
          collection: 'reviews',
          where: Object.keys(where).length > 0 ? where : undefined,
          limit,
          page,
          depth,
          sort,
        })

        return NextResponse.json(result)
      }

      // Otherwise, this is a create/update operation
      log.debug({ body }, 'Full body before transformation')

      // Transform data for PayloadCMS admin requests
      // Relationship fields come as strings or objects, need to convert to number IDs
      if (body.wine) {
        body.wine =
          typeof body.wine === 'string'
            ? parseInt(body.wine)
            : typeof body.wine === 'object' && body.wine?.id
              ? parseInt(body.wine.id)
              : body.wine
      }
      // Note: lesson field removed - content items reference reviews, not the other way around
      if (body.session) {
        body.session =
          typeof body.session === 'string'
            ? parseInt(body.session)
            : typeof body.session === 'object' && body.session?.id
              ? parseInt(body.session.id)
              : body.session || null
      }
      if (body.sessionParticipant) {
        body.sessionParticipant =
          typeof body.sessionParticipant === 'string'
            ? parseInt(body.sessionParticipant)
            : typeof body.sessionParticipant === 'object' && body.sessionParticipant?.id
              ? parseInt(body.sessionParticipant.id)
              : body.sessionParticipant || null
      }

      // Convert rating to number (it's labeled as 'Betyg' in Swedish)
      // Note: Validation is handled by PayloadCMS collection config (min/max)
      if (body.rating !== undefined) {
        body.rating = typeof body.rating === 'string' ? parseFloat(body.rating) : body.rating
      }

      // Handle create or update operation
      if (body.id || searchParams.get('id')) {
        // Update existing review
        log.info('Admin update request')
        const reviewId = body.id || searchParams.get('id')
        const result = await payload.update({
          collection: 'reviews',
          id: typeof reviewId === 'string' ? parseInt(reviewId) : reviewId,
          data: body,
          depth,
        })

        return NextResponse.json({ doc: result })
      } else {
        // Create new review
        log.info({ wine: body.wine, rating: body.rating }, 'Admin create request')
        const result = await payload.create({
          collection: 'reviews',
          data: body,
          depth,
        })

        return NextResponse.json({ doc: result })
      }
    }

    // Frontend form submission logic continues below...
    // Either an authenticated user OR a session-participant cookie is required.
    // Guest reviews land with user=null and sessionParticipant=<participant id>.
    const participantToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
    let guestParticipant: { id: number; sessionId: number } | null = null
    if (!user) {
      if (!participantToken) {
        log.warn('Not authenticated and no participant cookie')
        return NextResponse.json(
          { error: 'Authentication or session participation required' },
          { status: 401 },
        )
      }
      // Look up the guest participant by cookie token
      const participantRes = await payload.find({
        collection: 'session-participants',
        where: { participantToken: { equals: participantToken } },
        limit: 1,
      })
      if (participantRes.totalDocs === 0) {
        return NextResponse.json({ error: 'Invalid session participant' }, { status: 401 })
      }
      const p: any = participantRes.docs[0]
      guestParticipant = {
        id: Number(p.id),
        sessionId: Number(typeof p.session === 'object' ? p.session.id : p.session),
      }
    }

    // Check content type and parse body accordingly
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}

    try {
      if (contentType.includes('application/json')) {
        body = await request.json()
      } else if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
      ) {
        const formData = await request.formData()
        body = Object.fromEntries(formData.entries())
      } else {
        // Try to read as text first
        const bodyText = await request.text()

        if (!bodyText || bodyText.trim() === '') {
          // Empty body - check query params
          log.warn('Empty request body, checking query params')
          const { searchParams } = new URL(request.url)
          if (searchParams.toString()) {
            body = Object.fromEntries(searchParams.entries())
          }
        } else {
          // Try JSON first
          try {
            body = JSON.parse(bodyText)
          } catch {
            // If JSON parsing fails, try parsing as URL-encoded
            try {
              const params = new URLSearchParams(bodyText)
              body = Object.fromEntries(params.entries())
            } catch {
              // If that also fails, body might be query params in the text
              // Check if it looks like query params
              if (bodyText.includes('=') && bodyText.includes('&')) {
                const params = new URLSearchParams(bodyText)
                body = Object.fromEntries(params.entries())
              } else {
                throw new Error(`Unable to parse body: ${bodyText.substring(0, 100)}`)
              }
            }
          }
        }
      }
    } catch (parseError) {
      log.error({ err: parseError, contentType, url: request.url }, 'Error parsing request body')

      // If parsing fails, try to get data from query params as fallback
      const { searchParams } = new URL(request.url)
      if (searchParams.toString()) {
        body = Object.fromEntries(searchParams.entries())
        log.warn({ body }, 'Using query params as fallback')
      } else {
        return NextResponse.json(
          {
            error: 'Invalid request body',
            details: parseError instanceof Error ? parseError.message : String(parseError),
          },
          { status: 400 },
        )
      }
    }

    log.debug(
      { wine: body.wine, session: body.session, sessionParticipant: body.sessionParticipant },
      'Request body',
    )

    // Wine identity. Three cases:
    //  1. Body carries a library wine or a named customWine → use it.
    //  2. Body carries session + pourOrder but no identity → resolve it from
    //     the session's plan SERVER-SIDE. This is the blind-tasting path: the
    //     guest's client was deliberately never sent the wine's identity, so it
    //     cannot include one. We must never send it down; we only write it.
    //  3. Neither → Payload admin's relationship-options probe. Return an empty
    //     list shape so the admin UI doesn't break.
    let hasCustomWine =
      !!body.customWine?.name && String(body.customWine.name).trim() !== ''
    const pourOrderFromBody =
      body.pourOrder != null && !isNaN(Number(body.pourOrder))
        ? Number(body.pourOrder)
        : null
    const sessionForResolve = guestParticipant
      ? guestParticipant.sessionId
      : body.session != null && !isNaN(Number(body.session))
        ? Number(body.session)
        : null

    // Resolved once, for ANY authenticated (non-guest) caller writing a
    // session review — not just the blind-resolve path below — to their
    // session-participants row id for sessionForResolve, or null if they
    // have none. Two consumers share this single query: (1) the blind-resolve
    // authorization check further down, which still gates on it exactly as
    // before, and (2) reviewData.sessionParticipant, so an authenticated
    // participant's ordinary (non-blind) session reviews also get
    // sessionParticipant persisted — without this, /my-submissions (which
    // filters strictly on sessionParticipant) can't see a logged-in
    // participant's own reviews, breaking draft rehydration, the host's
    // answered-tracker, and the reveal guard's missing-count.
    let authedParticipantId: number | null = null
    if (!guestParticipant && user && sessionForResolve != null) {
      const authedParticipantRes = await payload.find({
        collection: 'session-participants',
        where: {
          and: [{ session: { equals: sessionForResolve } }, { user: { equals: user.id } }],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (authedParticipantRes.totalDocs > 0) {
        authedParticipantId = Number(authedParticipantRes.docs[0].id)
      }
    }

    if (!body.wine && !hasCustomWine && sessionForResolve != null && pourOrderFromBody != null) {
      const sessionDoc = await payload.findByID({
        collection: 'course-sessions',
        id: sessionForResolve,
        depth: 2,
        overrideAccess: true,
        // Without this, a bogus/deleted session id makes Payload throw
        // NotFound (an APIError, not a ValidationError) and the request falls
        // into the catch-all 500 branch below — a permanently-invalid body
        // that the client would retry forever. disableErrors turns that into
        // a plain `null` we can handle explicitly with a 422 (Finding 2).
        disableErrors: true,
      })

      if (!sessionDoc) {
        log.warn(
          { session: sessionForResolve },
          'Session not found while resolving wine identity for pour',
        )
        return NextResponse.json(
          {
            error: 'Unknown session',
            details: `No session found for id ${sessionForResolve}`,
          },
          { status: 422 },
        )
      }

      // Authorization for authenticated (non-guest) callers only. For them,
      // sessionForResolve comes straight from client-supplied body.session —
      // untrusted input — and overrideAccess above deliberately bypasses
      // TastingPlans.access.read (normally owner/admin only) so we can read
      // the plan and resolve identity. Without this check, any logged-in
      // account could pass an arbitrary session id and read back another
      // host's wine identities via the resolved doc. Guests are exempt:
      // their sessionForResolve is derived from guestParticipant.sessionId,
      // which is already tied to their own participant-cookie token.
      if (!guestParticipant && user) {
        // authedParticipantId was already resolved above (hoisted lookup,
        // shared with reviewData.sessionParticipant below) — reuse it here
        // rather than re-querying session-participants a second time.
        const hostField = sessionDoc.host as unknown
        const hostId = hostField
          ? typeof hostField === 'object'
            ? (hostField as { id: number }).id
            : (hostField as number)
          : null
        const isHost = hostId != null && Number(hostId) === Number(user.id)

        if (authedParticipantId == null && !isHost) {
          log.warn(
            { userId: user.id, session: sessionForResolve },
            'Forbidden: caller is neither a participant nor the host of this session',
          )
          return NextResponse.json(
            {
              error: 'Forbidden',
              details: 'You are not a participant or host of this session',
            },
            { status: 403 },
          )
        }
      }

      const planWines =
        sessionDoc.tastingPlan && typeof sessionDoc.tastingPlan === 'object'
          ? (((sessionDoc.tastingPlan as any).wines ?? []) as unknown[])
          : []
      const resolved = resolveWineIdentityForPour(planWines, pourOrderFromBody)
      if (!resolved) {
        log.warn(
          { session: sessionForResolve, pourOrder: pourOrderFromBody },
          'Could not resolve wine identity for pour',
        )
        return NextResponse.json(
          {
            error: 'Unknown wine',
            details: `No wine at pour order ${pourOrderFromBody} in this session's plan`,
          },
          { status: 422 },
        )
      }
      if (resolved.wine != null) {
        // Resolved identity is authoritative — don't merge in client-supplied
        // customWine fields alongside a resolved library wine.
        body.wine = resolved.wine
        body.customWine = null
      } else {
        // Resolved identity is authoritative — assign outright rather than
        // merging over client input, so blank plan fields (vintage, image,
        // price) can't be filled in by whatever the client happened to send.
        body.customWine = resolved.customWine
        hasCustomWine = true
      }
      identityResolvedServerSide = true
      log.info(
        { session: sessionForResolve, pourOrder: pourOrderFromBody, wine: resolved.wine },
        'Resolved wine identity server-side',
      )
    }

    if (!body.wine && !hasCustomWine) {
      // A session write that still has no identity is a real failure, not an
      // admin probe. Reporting 200 here is what previously turned data loss
      // into a silent "success" the client never retried.
      if (sessionForResolve != null) {
        return NextResponse.json(
          {
            error: 'Missing wine identity',
            details: 'A session review requires wine, customWine.name, or pourOrder',
          },
          { status: 422 },
        )
      }
      const { searchParams } = new URL(request.url)
      log.warn(
        { queryParams: searchParams.toString() },
        'Missing required fields — treating as relationship fetch',
      )
      return NextResponse.json(
        {
          docs: [],
          totalDocs: 0,
          limit: 0,
          totalPages: 0,
          page: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        },
        { status: 200 },
      )
    }

    // Library wine ID, when set, must be a valid number.
    const wineId = body.wine ? Number(body.wine) : undefined
    if (body.wine && (!wineId || isNaN(wineId))) {
      return NextResponse.json(
        {
          error: 'Invalid ID values',
          details: 'wine must be a valid number',
        },
        { status: 400 },
      )
    }

    // Dedup. Library wines dedup on (user/participant, wine[, session]).
    // CustomWine reviews dedup on (user/participant, session, productNumber || name)
    // so re-submissions update the existing row instead of creating duplicates.
    const sessionIdFromBody = body.session ? Number(body.session) : undefined
    const buildBaseWhere = () =>
      guestParticipant
        ? { and: [{ sessionParticipant: { equals: guestParticipant.id } }] as any[] }
        : { and: [{ user: { equals: user!.id } }] as any[] }

    // Compute the effective session for dedup. Standalone reviews carry no
    // session — for those we explicitly match `session is null` so a standalone
    // submission doesn't accidentally overwrite a previously-saved session
    // review of the same wine. Guest reviews always carry their session via
    // the participant cookie.
    const effectiveDedupSession: number | null = guestParticipant
      ? guestParticipant.sessionId
      : sessionIdFromBody && !isNaN(sessionIdFromBody)
        ? sessionIdFromBody
        : null

    let whereConditions: any
    if (wineId) {
      whereConditions = buildBaseWhere()
      whereConditions.and.push({ wine: { equals: wineId } })
      whereConditions.and.push({ session: { equals: effectiveDedupSession } })
    } else {
      // customWine path
      whereConditions = buildBaseWhere()
      whereConditions.and.push({ session: { equals: effectiveDedupSession } })
      const productNumber = body.customWine?.systembolagetProductNumber
      if (productNumber) {
        whereConditions.and.push({
          'customWine.systembolagetProductNumber': { equals: String(productNumber) },
        })
      } else {
        whereConditions.and.push({
          'customWine.name': { equals: String(body.customWine.name).trim() },
        })
      }
    }

    const existingReviews = await payload.find({
      collection: 'reviews',
      where: whereConditions,
      limit: 1,
      overrideAccess: !!guestParticipant,
    })

    let review

    // Build the data payload. For guests: user stays null; sessionParticipant
    // and session are derived from the cookie token, NOT trusted from the body.
    const submittedAt =
      typeof body.submittedAt === 'string' && body.submittedAt.length > 0
        ? new Date().toISOString()
        : undefined
    const reviewData: any = {
      ...body,
      // Transport-only: used above to resolve identity, not a Reviews field.
      pourOrder: undefined,
      // Library wine path uses wineId; customWine path passes wine: null so
      // Payload's beforeValidate hook sees exactly one of {wine, customWine}.
      wine: wineId ?? null,
      user: guestParticipant ? null : user!.id,
      submittedAt,
      session: guestParticipant
        ? guestParticipant.sessionId
        : body.session
          ? Number(body.session)
          : body.session === null
            ? null
            : undefined,
      sessionParticipant: guestParticipant
        ? guestParticipant.id
        : authedParticipantId != null
          ? authedParticipantId
          : body.sessionParticipant
            ? Number(body.sessionParticipant)
            : body.sessionParticipant === null
              ? null
              : undefined,
    }

    if (existingReviews.totalDocs > 0) {
      const existingReview = existingReviews.docs[0]
      log.info({ reviewId: existingReview.id }, 'Updating existing review')

      review = await payload.update({
        collection: 'reviews',
        id: existingReview.id,
        data: reviewData,
        // depth:0 — the response must not populate the wine relationship.
        // Otherwise Payload's default depth (2, from payload.config.ts) would
        // hand back the full Wines document even on the server-resolved
        // blind-tasting path, defeating Finding 1's doc-trimming below.
        depth: 0,
        overrideAccess: !!guestParticipant,
        req: guestParticipant
          ? ({ ...request, payload } as any)
          : ({ ...request, user, payload } as any),
      })

      log.info({ reviewId: review.id }, 'Review updated')
    } else {
      log.info('Creating new review')

      review = await payload.create({
        collection: 'reviews',
        data: reviewData,
        depth: 0,
        overrideAccess: !!guestParticipant,
        req: guestParticipant
          ? ({ ...request, payload } as any)
          : ({ ...request, user, payload } as any),
      })

      log.info({ reviewId: review.id }, 'Review created')
    }

    // Finding 1: when this handler resolved wine identity server-side (blind
    // tasting), the caller sent no identity and must receive none back —
    // otherwise a participant could POST {session, pourOrder} for a wine the
    // host hasn't revealed yet and read the answer out of their own response.
    // depth:0 above already keeps `wine` a bare id instead of a populated
    // Wines doc, but we still drop both fields entirely here. Non-resolved
    // paths (admin writes, standalone reviews, lesson reviews) are untouched
    // — other callers (e.g. WineReviewForm's non-session submit) do read
    // `doc` there.
    let responseDoc: unknown = review
    if (identityResolvedServerSide) {
      const { wine: _omittedWine, customWine: _omittedCustomWine, ...rest } = review as unknown as Record<
        string,
        unknown
      >
      responseDoc = rest
    }

    return NextResponse.json(
      {
        success: true,
        doc: responseDoc,
      },
      { status: 201 },
    )
  } catch (error) {
    // A validation failure is the caller's problem and will never succeed on
    // retry — it MUST be 4xx so the client's queue stops. Detect it with
    // `instanceof`: minified builds rewrite `err.name`, and relying on the name
    // is what turned this into an opaque, infinitely-retried 500.
    if (error instanceof ValidationError) {
      // `error` is narrowed to ValidationError here, so `error.data.errors` is
      // properly typed — no cast needed (verified against payload@3.33.0's
      // exported types: ValidationError extends APIError<{ errors: … }>, and
      // APIError's `data` is non-optional).
      const fields = error.data.errors
      log.warn({ err: error, fields }, 'Review rejected by validation')
      // Finding 1: Payload's default field validators can embed the raw
      // submitted value into a per-field message — e.g. the relationship
      // validator JSON.stringifies an invalid id straight into `message`
      // (reproduced: {"path":"wine","message":"...invalid selections: 42,"}),
      // and the `number` validator interpolates raw values into
      // greaterThanMax/lessThanMin (reachable via customWine.priceSek). Since
      // Wines.access.read is public, a leaked wine id resolves to the full
      // wine doc via GET /api/wines/:id. When this handler resolved wine
      // identity server-side (the blind-tasting path), the caller never sent
      // that identity and must not be able to read it back out of a
      // validation error either — so `fields` is suppressed entirely in that
      // case, even though the full detail is still logged above for
      // operators. `error.message` only joins field paths/labels, never the
      // raw submitted value (verified against the same repro above), so it's
      // safe to return unconditionally. Non-resolved callers (admin writes,
      // standalone/lesson reviews) supplied the wine themselves and still get
      // full field detail so their forms can surface it to the user.
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.message,
          fields: identityResolvedServerSide ? [] : fields,
        },
        { status: 422 },
      )
    }
    log.error({ err: error }, 'Error creating review')
    return NextResponse.json(
      {
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/reviews
 * Query wine reviews with filters
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Get cookie string and verify user (optional for GET)
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    // Build where query from search params
    const where: any = {}

    // Note: lesson field removed - content items reference reviews via answerKeyReview, not the other way around

    if (searchParams.get('wine')) {
      where.wine = { equals: Number(searchParams.get('wine')) }
    }

    // Safety default:
    // - If authenticated and no explicit user filter, default to current user.
    // - If not authenticated, default to trusted reviews only.
    if (searchParams.get('user')) {
      where.user = { equals: Number(searchParams.get('user')) }
    } else if (user?.id) {
      where.user = { equals: Number(user.id) }
    } else {
      where.isTrusted = { equals: true }
    }

    if (searchParams.get('session')) {
      where.session = { equals: Number(searchParams.get('session')) }
    }

    if (searchParams.get('sessionParticipant')) {
      where.sessionParticipant = { equals: Number(searchParams.get('sessionParticipant')) }
    }

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const depth = searchParams.get('depth') ? Number(searchParams.get('depth')) : 2
    const sort = searchParams.get('sort') || '-createdAt'

    const reviews = await payload.find({
      collection: 'reviews',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      page,
      sort,
      depth,
      overrideAccess: false,
      req: {
        ...request,
        user, // Pass user for access control
        payload,
      } as any,
    })

    // Finding 2: Reviews.access.read grants a user their own rows
    // unconditionally, regardless of blind-session status — so a review
    // written mid-blind-tasting (e.g. via the server-resolved pourOrder path
    // in POST /api/reviews) would otherwise come back here with the wine
    // fully populated (depth defaults to 2), even though the host hasn't
    // revealed it yet. Redact wine/customWine on any review that belongs to
    // a blind session whose pour isn't revealed, unless the caller is that
    // session's host. Reviews with no session (isTrusted / publishedToProfile
    // / standalone profile reviews) are untouched.
    const docs = reviews.docs as any[]
    const sessionIdOf = (r: any): number | null => {
      if (!r.session) return null
      const id = typeof r.session === 'object' ? r.session.id : r.session
      return typeof id === 'number' ? id : Number(id) || null
    }
    const sessionIds = Array.from(
      new Set(docs.map(sessionIdOf).filter((id): id is number => id != null)),
    )

    if (sessionIds.length > 0) {
      const sessionsRes = await payload.find({
        collection: 'course-sessions',
        where: { id: { in: sessionIds } },
        depth: 2,
        limit: sessionIds.length,
        overrideAccess: true,
      })

      const sessionInfoById = new Map<
        number,
        {
          isBlind: boolean
          revealed: Set<number>
          hostId: number | null
          pourMaps: ReturnType<typeof buildPourMaps>
        }
      >()

      for (const s of sessionsRes.docs as any[]) {
        const hostField = s.host
        const hostId = hostField ? (typeof hostField === 'object' ? hostField.id : hostField) : null
        const wines =
          s.tastingPlan && typeof s.tastingPlan === 'object' ? (s.tastingPlan.wines ?? []) : []
        sessionInfoById.set(Number(s.id), {
          isBlind: Boolean(s.blindTasting),
          revealed: new Set(Array.isArray(s.revealedPourOrders) ? s.revealedPourOrders : []),
          hostId: hostId != null ? Number(hostId) : null,
          pourMaps: buildPourMaps(wines),
        })
      }

      for (const r of docs) {
        const sessionId = sessionIdOf(r)
        if (sessionId == null) continue
        const info = sessionInfoById.get(sessionId)
        if (!info || !info.isBlind) continue

        const isHost = Boolean(user && info.hostId != null && Number(info.hostId) === Number(user.id))
        if (isHost) continue

        const pourOrder = resolvePourForReview(r, info.pourMaps)
        const isRevealed = pourOrder != null && info.revealed.has(pourOrder)
        if (!isRevealed) {
          r.wine = null
          r.customWine = null
        }
      }
    }

    return NextResponse.json(reviews, { status: 200 })
  } catch (error) {
    log.error({ err: error }, 'Error fetching reviews')
    return NextResponse.json(
      {
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
