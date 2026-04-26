import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'
import { recordEvent } from '@/lib/events'

const log = loggerFor('api-users-onboarding')

const logOnboardingEvent = (event: string, details: Record<string, unknown>) => {
  log.info(`[onboarding_funnel] ${event}`, details)
}

export async function GET() {
  const user = await getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    onboarding: (user as any).onboarding || null,
    winePreferences: (user as any).winePreferences || null,
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const body = await request.json()
  const action = body?.action === 'skip' ? 'skip' : 'complete'
  const now = new Date().toISOString()

  const winePreferences = {
    tastingExperience: body?.tastingExperience || undefined,
    preferredStyles: Array.isArray(body?.preferredStyles) ? body.preferredStyles : undefined,
    favoriteGrapes: Array.isArray(body?.favoriteGrapes) ? body.favoriteGrapes : undefined,
    favoriteRegions: Array.isArray(body?.favoriteRegions) ? body.favoriteRegions : undefined,
    priceRange: body?.priceRange || undefined,
    discoveryPreferences: Array.isArray(body?.discoveryPreferences)
      ? body.discoveryPreferences
      : undefined,
  }

  const notifications = body?.notifications
    ? {
        email: {
          courseProgress: Boolean(body.notifications.courseProgress),
          newsletter: Boolean(body.notifications.newsletter),
          newCourses: Boolean(body.notifications.newCourses),
        },
      }
    : undefined

  const nextOnboardingData =
    action === 'skip'
      ? {
          ...(user as any).onboarding,
          skippedAt: now,
          source: body?.source || (user as any).onboarding?.source || 'registration',
        }
      : {
          ...(user as any).onboarding,
          goal: body?.goal || undefined,
          completedAt: now,
          skippedAt: undefined,
          source: body?.source || (user as any).onboarding?.source || 'registration',
        }

  try {
    const updatedUser = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        onboarding: nextOnboardingData,
        ...(action === 'complete'
          ? {
              winePreferences: {
                ...(user as any).winePreferences,
                ...winePreferences,
              },
              ...(notifications
                ? {
                    notifications: {
                      ...(user as any).notifications,
                      ...notifications,
                    },
                  }
                : {}),
            }
          : {}),
      } as any,
    })

    logOnboardingEvent(action === 'skip' ? 'onboarding_skipped' : 'onboarding_completed', {
      userId: user.id,
      source: nextOnboardingData.source,
    })

    void recordEvent({
      payload,
      type: 'onboarding_completed',
      contactEmail: (user as any).email,
      label: action === 'skip' ? 'Onboarding skipped' : 'Onboarding completed',
      userId: user.id,
      source: 'web',
      metadata: {
        action,
        goal: nextOnboardingData.goal,
        source: nextOnboardingData.source,
      },
    })

    return NextResponse.json({ success: true, onboarding: (updatedUser as any).onboarding })
  } catch (error) {
    log.error('Error updating onboarding preferences:', error)
    return NextResponse.json(
      { error: 'Kunde inte spara onboarding-valen, försök igen.' },
      { status: 500 },
    )
  }
}
