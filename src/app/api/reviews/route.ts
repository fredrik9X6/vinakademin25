import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import { PARTICIPANT_COOKIE } from '@/lib/sessions'

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

    // Validate: either a library wine OR a customWine snapshot must be present.
    // Empty bodies are Payload admin UI's relationship-options probe — return
    // an empty list shape so the admin doesn't break.
    const hasCustomWine =
      !!body.customWine?.name && String(body.customWine.name).trim() !== ''
    if (!body.wine && !hasCustomWine) {
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

    let whereConditions: any
    if (wineId) {
      whereConditions = buildBaseWhere()
      whereConditions.and.push({ wine: { equals: wineId } })
      if (!guestParticipant && sessionIdFromBody && !isNaN(sessionIdFromBody)) {
        whereConditions.and.push({ session: { equals: sessionIdFromBody } })
      }
    } else {
      // customWine path
      whereConditions = buildBaseWhere()
      const sid = guestParticipant ? guestParticipant.sessionId : sessionIdFromBody
      if (sid && !isNaN(sid)) {
        whereConditions.and.push({ session: { equals: sid } })
      }
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
    const reviewData: any = {
      ...body,
      // Library wine path uses wineId; customWine path passes wine: null so
      // Payload's beforeValidate hook sees exactly one of {wine, customWine}.
      wine: wineId ?? null,
      user: guestParticipant ? null : user!.id,
      session: guestParticipant
        ? guestParticipant.sessionId
        : body.session
          ? Number(body.session)
          : body.session === null
            ? null
            : undefined,
      sessionParticipant: guestParticipant
        ? guestParticipant.id
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
        overrideAccess: !!guestParticipant,
        req: guestParticipant
          ? ({ ...request, payload } as any)
          : ({ ...request, user, payload } as any),
      })

      log.info({ reviewId: review.id }, 'Review created')
    }

    return NextResponse.json(
      {
        success: true,
        doc: review,
      },
      { status: 201 },
    )
  } catch (error) {
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
