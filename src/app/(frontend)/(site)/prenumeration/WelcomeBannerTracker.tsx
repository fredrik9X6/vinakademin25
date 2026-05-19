'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/components/analytics'

/**
 * Fires `subscription_completed` once when the user lands on
 * `/prenumeration?welcome=1` from the Stripe checkout success URL. Rendered
 * as a sibling to the visible welcome banner — keeps the banner itself a
 * server component.
 */
export function WelcomeBannerTracker({ plan }: { plan: string | null }) {
  useEffect(() => {
    trackEvent('subscription_completed', { plan })
  }, [plan])
  return null
}
