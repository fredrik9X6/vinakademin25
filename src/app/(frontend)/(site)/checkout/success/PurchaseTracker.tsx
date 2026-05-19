'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/components/analytics'

interface PurchaseTrackerProps {
  courseId: number | string | null
  courseSlug: string | null
  courseTitle: string | null
  amount: number | null
  checkoutMode: 'guest' | 'authenticated' | null
}

/**
 * Fires `tasting_purchase_completed` once when the user lands on the
 * checkout success page from Stripe. Rendered as a sibling so the parent
 * page stays a server component.
 */
export function PurchaseTracker({
  courseId,
  courseSlug,
  courseTitle,
  amount,
  checkoutMode,
}: PurchaseTrackerProps) {
  useEffect(() => {
    trackEvent('tasting_purchase_completed', {
      courseId,
      courseSlug,
      courseTitle,
      amount,
      checkoutMode,
    })
  }, [courseId, courseSlug, courseTitle, amount, checkoutMode])
  return null
}
