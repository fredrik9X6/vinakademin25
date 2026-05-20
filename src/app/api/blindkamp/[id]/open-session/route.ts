import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { assignPourOrders } from '@/lib/blindkamp/shuffle'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-open-session')

/**
 * Generate a random 6-character join code (e.g., WINE42, ABC123).
 * Mirrors the same logic used in /api/sessions/create.
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude visually ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * POST /api/blindkamp/[id]/open-session
 *
 * Transitions a blindkamp from `submissions_open` → `in_session`:
 *  1. Validates host + status.
 *  2. Requires ≥ 2 submitted wines.
 *  3. Assigns random pour orders 1..N to all submitted wines.
 *  4. Creates a CourseSession (via a synthetic TastingPlan) to host the live tasting.
 *  5. Updates the blind-battle with status=in_session and currentSession.
 *
 * Note: CourseSessions enforces a hard XOR — exactly one of `course` or
 * `tastingPlan` must be set.  Since a blindkamp is neither, we create a
 * thin synthetic TastingPlan owned by the host and immediately attach it.
 * The link back to the battle is carried by `blind-battles.currentSession`.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })

  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })

  const payload = await getPayloadClient()

  // Load the battle
  let battle: any
  try {
    battle = await payload.findByID({
      collection: 'blind-battles',
      id: battleId,
      overrideAccess: true,
    })
  } catch {
    return NextResponse.json({ error: 'Blindkampen finns inte' }, { status: 404 })
  }

  // Only the host may open a session
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) return NextResponse.json({ error: 'Endast värden' }, { status: 403 })

  if (battle.status !== 'submissions_open') {
    return NextResponse.json(
      { error: 'Provningen kan inte startas i nuvarande status' },
      { status: 400 },
    )
  }

  // Gather submitted wines — populate systembolagetProduct so we can snapshot it.
  const submittedRes = await payload.find({
    collection: 'blind-battle-submissions',
    where: {
      and: [
        { battle: { equals: battleId } },
        { status: { equals: 'submitted' } },
      ],
    },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  const submissions = submittedRes.docs as any[]

  if (submissions.length < 2) {
    return NextResponse.json(
      { error: 'Behöver minst 2 inlämnade vin för att starta' },
      { status: 400 },
    )
  }

  // Assign random pour orders 1..N
  const pourOrders = assignPourOrders(submissions)
  for (let i = 0; i < submissions.length; i++) {
    await payload.update({
      collection: 'blind-battle-submissions',
      id: submissions[i]!.id,
      data: { pourOrder: pourOrders[i] } as never,
      overrideAccess: true,
    })
    // Mutate locally so the snapshot below uses the assigned pourOrder
    submissions[i].pourOrder = pourOrders[i]
  }

  // Translate the submission's wine source into a TastingPlan customWine snapshot.
  // Submissions can have EITHER systembolagetProduct (populated when depth>=1)
  // OR customWine (free-text fallback).
  const SYSTEMBOLAGET_TYPE_MAP: Record<string, string> = {
    'Rött vin': 'red',
    'Vitt vin': 'white',
    'Rosévin': 'rose',
    'Mousserande vin': 'sparkling',
    'Starkvin': 'fortified',
    'Sött vin / dessertvin': 'dessert',
    'Aromatiserat vin': 'other',
    'Orangevin': 'other',
  }
  // submissions.customWine.type uses 'orange' which TastingPlans doesn't carry —
  // translate to 'other'.
  const SUBMISSION_TYPE_TO_PLAN: Record<string, string> = {
    red: 'red',
    white: 'white',
    rose: 'rose',
    sparkling: 'sparkling',
    dessert: 'dessert',
    orange: 'other',
  }

  function buildThumbUrl(baseUrl: string | null | undefined): string | undefined {
    if (!baseUrl) return undefined
    if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl
    return `${baseUrl}_400.png`
  }

  const planWines = submissions.map((s) => {
    if (s.systembolagetProduct && typeof s.systembolagetProduct === 'object') {
      const p = s.systembolagetProduct
      const name = [p.productNameBold, p.productNameThin].filter(Boolean).join(' ').trim()
      return {
        customWine: {
          name: name || `Vin ${p.productNumber}`,
          producer: p.producerName || undefined,
          vintage: p.vintage != null ? String(p.vintage) : undefined,
          type: p.categoryLevel2 ? SYSTEMBOLAGET_TYPE_MAP[p.categoryLevel2] : undefined,
          systembolagetUrl: p.productUrl || undefined,
          priceSek: p.price ?? undefined,
          systembolagetProductNumber: p.productNumber,
          imageUrl: buildThumbUrl(p.imageUrl),
        },
        pourOrder: s.pourOrder,
      }
    }
    // Fallback: hand-typed customWine on the submission
    const c = s.customWine || {}
    return {
      customWine: {
        name: c.name || 'Okänt vin',
        producer: c.producer || undefined,
        vintage: c.vintage || undefined,
        type: c.type ? SUBMISSION_TYPE_TO_PLAN[c.type] : undefined,
        systembolagetUrl: c.systembolagetUrl || undefined,
        priceSek: c.priceSek ?? undefined,
        imageUrl: c.imageUrl || undefined,
      },
      pourOrder: s.pourOrder,
    }
  })

  // CourseSessions requires exactly one of `course` or `tastingPlan` (XOR).
  // A blindkamp is neither, so we create a thin synthetic TastingPlan that
  // carries the blindkamp's submitted wines so the live UI has something to
  // iterate over. The canonical link back to the battle is stored on
  // blind-battles.currentSession.
  const sessionTitle = battle.title || `Blindkamp #${battleId}`
  const syntheticPlan = await payload.create({
    collection: 'tasting-plans',
    data: {
      title: sessionTitle,
      owner: user.id,
      blindTastingByDefault: true,
      wines: planWines,
    } as never,
    overrideAccess: true,
  })

  // Generate a unique join code for the CourseSession
  let joinCode = generateJoinCode()
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await payload.find({
      collection: 'course-sessions',
      where: { joinCode: { equals: joinCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs === 0) break
    joinCode = generateJoinCode()
  }

  // Expires in 24 hours
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

  const session = await payload.create({
    collection: 'course-sessions',
    data: {
      tastingPlan: syntheticPlan.id,
      host: user.id,
      joinCode,
      sessionName: sessionTitle,
      status: 'active',
      currentActivity: 'waiting',
      participantCount: 0,
      maxParticipants: submissions.length + 10, // headroom for late joiners
      expiresAt,
      blindTasting: true,
      revealedPourOrders: [],
    } as never,
    overrideAccess: true,
  })

  // Transition the battle to in_session and record the session reference
  await payload.update({
    collection: 'blind-battles',
    id: battleId,
    data: { status: 'in_session', currentSession: session.id } as never,
    overrideAccess: true,
  })

  log.info(
    {
      battleId,
      sessionId: session.id,
      joinCode,
      submissions: submissions.length,
      syntheticPlanId: syntheticPlan.id,
    },
    'blind_battle_session_started',
  )

  return NextResponse.json({ ok: true, sessionId: session.id, joinCode })
}
