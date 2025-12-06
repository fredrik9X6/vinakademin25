import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

/**
 * POST /api/reviews
 * Create a new wine review
 *
 * This custom route ensures proper authentication with Next.js App Router
 * BUT handles PayloadCMS admin requests using PayloadCMS's native methods
 */
export async function POST(request: NextRequest) {
  console.log('🍷 [REVIEWS API] POST request received')

  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    console.log('👤 [REVIEWS API] Authenticated user:', user?.id, user?.email)

    // Check if this is a PayloadCMS admin request
    const isAdminRequest = request.headers.get('x-payload-admin') === 'true'
    const referer = request.headers.get('referer') || ''
    const isFromAdminUI = referer.includes('/admin')
    const { searchParams } = new URL(request.url)
    
    // PayloadCMS admin requests often have specific query params or patterns
    const hasPayloadQueryParams = searchParams.has('depth') || 
                                   searchParams.has('locale') || 
                                   searchParams.has('fallback-locale') ||
                                   searchParams.has('where') ||
                                   searchParams.has('limit') ||
                                   searchParams.has('sort')

    // If it's an admin request, handle it using PayloadCMS's native methods
    if (isAdminRequest || isFromAdminUI || hasPayloadQueryParams) {
      console.log('🔄 [REVIEWS API] Handling admin request with PayloadCMS methods')
      
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
            console.log('📦 [REVIEWS API] Parsed JSON body:', JSON.stringify(body, null, 2))
            // Check if body has actual data (not just empty object)
            isRelationshipFetch = Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          } else {
            isRelationshipFetch = true
          }
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData()
          // Extract _payload field if it exists (PayloadCMS admin format)
          const payloadField = formData.get('_payload') as string
          if (payloadField) {
            body = JSON.parse(payloadField)
            console.log('📦 [REVIEWS API] Parsed _payload field:', JSON.stringify(body, null, 2))
            isRelationshipFetch = Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          } else {
            // Extract all form fields
            const formEntries: Record<string, any> = {}
            for (const [key, value] of formData.entries()) {
              formEntries[key] = value
            }
            body = formEntries
            console.log('📦 [REVIEWS API] Parsed FormData entries:', JSON.stringify(body, null, 2))
            isRelationshipFetch = Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
          }
        } else {
          const bodyText = await request.text()
          console.log('📦 [REVIEWS API] Raw body text:', bodyText.substring(0, 500))
          if (bodyText && bodyText.trim()) {
            try {
              body = JSON.parse(bodyText)
              console.log('📦 [REVIEWS API] Parsed body from text:', JSON.stringify(body, null, 2))
              isRelationshipFetch = Object.keys(body).length === 0 || (!body.wine && !body.rating && !body.id)
            } catch {
              isRelationshipFetch = true
            }
          } else {
            isRelationshipFetch = true
          }
        }
      } catch (parseError) {
        console.error('❌ [REVIEWS API] Error parsing admin request body:', parseError)
        // If parsing fails, assume it's a relationship fetch
        isRelationshipFetch = true
      }

      // For relationship fetches (empty body or no required fields), use find
      if (isRelationshipFetch && !searchParams.has('id')) {
        console.log('📋 [REVIEWS API] Admin relationship fetch request')
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
      console.log('📦 [REVIEWS API] Full body before transformation:', JSON.stringify(body, null, 2))

      // Transform data for PayloadCMS admin requests
      // Relationship fields come as strings or objects, need to convert to number IDs
      if (body.wine) {
        body.wine = typeof body.wine === 'string' ? parseInt(body.wine) : 
                    typeof body.wine === 'object' && body.wine?.id ? parseInt(body.wine.id) : 
                    body.wine
      }
      // Note: lesson field removed - content items reference reviews, not the other way around
      if (body.session) {
        body.session = typeof body.session === 'string' ? parseInt(body.session) : 
                       typeof body.session === 'object' && body.session?.id ? parseInt(body.session.id) : 
                       body.session || null
      }
      if (body.sessionParticipant) {
        body.sessionParticipant = typeof body.sessionParticipant === 'string' ? parseInt(body.sessionParticipant) : 
                                   typeof body.sessionParticipant === 'object' && body.sessionParticipant?.id ? parseInt(body.sessionParticipant.id) : 
                                   body.sessionParticipant || null
      }
      
      // Convert rating to number (it's labeled as 'Betyg' in Swedish)
      // Note: Validation is handled by PayloadCMS collection config (min/max)
      if (body.rating !== undefined) {
        body.rating = typeof body.rating === 'string' ? parseFloat(body.rating) : body.rating
      }

      // Handle create or update operation
      if (body.id || searchParams.get('id')) {
        // Update existing review
        console.log('🔄 [REVIEWS API] Admin update request')
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
        console.log('📝 [REVIEWS API] Admin create request')
        console.log('📦 [REVIEWS API] Transformed body:', { wine: body.wine, rating: body.rating })
        const result = await payload.create({
          collection: 'reviews',
          data: body,
          depth,
        })
        
        return NextResponse.json({ doc: result })
      }
    }

    // Frontend form submission logic continues below...
    if (!user) {
      console.log('❌ [REVIEWS API] Not authenticated')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check content type and parse body accordingly
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}

    try {
      if (contentType.includes('application/json')) {
        body = await request.json()
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        body = Object.fromEntries(formData.entries())
      } else {
        // Try to read as text first
        const bodyText = await request.text()
        
        if (!bodyText || bodyText.trim() === '') {
          // Empty body - check query params
          console.log('⚠️ [REVIEWS API] Empty request body, checking query params')
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
      console.error('❌ [REVIEWS API] Error parsing request body:', parseError)
      console.error('❌ [REVIEWS API] Content-Type:', contentType)
      console.error('❌ [REVIEWS API] Request URL:', request.url)
      
      // If parsing fails, try to get data from query params as fallback
      const { searchParams } = new URL(request.url)
      if (searchParams.toString()) {
        body = Object.fromEntries(searchParams.entries())
        console.log('⚠️ [REVIEWS API] Using query params as fallback:', body)
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

    console.log('📦 [REVIEWS API] Request body:', {
      wine: body.wine,
      session: body.session,
      sessionParticipant: body.sessionParticipant,
    })

    // Validate required fields
    if (!body.wine) {
      console.log('⚠️ [REVIEWS API] Missing required fields - this might be a relationship fetch request')
      // PayloadCMS relationship fields may send POST requests with empty bodies when fetching options
      // Return empty result instead of error to avoid breaking the admin UI
      const { searchParams } = new URL(request.url)
      console.log('⚠️ [REVIEWS API] Query params:', searchParams.toString())
      console.log('⚠️ [REVIEWS API] This appears to be a relationship fetch request')
      // Return a proper PayloadCMS-formatted response for relationship fetching
      return NextResponse.json({
        docs: [],
        totalDocs: 0,
        limit: 0,
        totalPages: 0,
        page: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      }, { status: 200 })
    }

    // Ensure numeric values are properly converted
    const wineId = body.wine ? Number(body.wine) : undefined
    
    if (!wineId || isNaN(wineId)) {
      return NextResponse.json(
        {
          error: 'Invalid ID values',
          details: 'wine must be a valid number',
        },
        { status: 400 },
      )
    }

    // Check if a review already exists for this user/wine combination
    // Note: Removed lesson field - content items reference reviews, not the other way around
    const whereConditions: any = {
      and: [
        { user: { equals: user.id } },
        { wine: { equals: wineId } },
      ],
    }

    // If this is a session review, also match the session
    if (body.session) {
      const sessionId = Number(body.session)
      if (!isNaN(sessionId)) {
        whereConditions.and.push({ session: { equals: sessionId } })
      }
    }

    const existingReviews = await payload.find({
      collection: 'reviews',
      where: whereConditions,
      limit: 1,
    })

    let review

    if (existingReviews.totalDocs > 0) {
      // Update existing review
      const existingReview = existingReviews.docs[0]
      console.log('🔄 [REVIEWS API] Updating existing review:', existingReview.id)

      review = await payload.update({
        collection: 'reviews',
        id: existingReview.id,
        data: {
          ...body,
          wine: wineId,
          user: user.id, // Explicitly set the user
          session: body.session ? Number(body.session) : undefined,
          sessionParticipant: body.sessionParticipant ? Number(body.sessionParticipant) : undefined,
        },
        req: {
          ...request,
          user, // Pass the authenticated user
          payload,
        } as any,
      })

      console.log('✅ [REVIEWS API] Review updated:', review.id)
    } else {
      // Create new review
      console.log('📝 [REVIEWS API] Creating new review')

      review = await payload.create({
        collection: 'reviews',
        data: {
          ...body,
          wine: wineId,
          user: user.id, // Explicitly set the user
          session: body.session ? Number(body.session) : undefined,
          sessionParticipant: body.sessionParticipant ? Number(body.sessionParticipant) : undefined,
        },
        req: {
          ...request,
          user, // Pass the authenticated user
          payload,
        } as any,
      })

      console.log('✅ [REVIEWS API] Review created:', review.id)
    }

    return NextResponse.json(
      {
        success: true,
        doc: review,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('❌ [REVIEWS API] Error creating review:', error)
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

    if (searchParams.get('user')) {
      where.user = { equals: Number(searchParams.get('user')) }
    }

    if (searchParams.get('session')) {
      where.session = { equals: Number(searchParams.get('session')) }
    }

    if (searchParams.get('sessionParticipant')) {
      where.sessionParticipant = { equals: Number(searchParams.get('sessionParticipant')) }
    }

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

    const reviews = await payload.find({
      collection: 'reviews',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      page,
      sort: '-createdAt',
      req: {
        ...request,
        user, // Pass user for access control
        payload,
      } as any,
    })

    return NextResponse.json(reviews, { status: 200 })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
