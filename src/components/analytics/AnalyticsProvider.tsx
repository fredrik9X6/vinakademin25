'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Track if PostHog has been initialized
let posthogInitialized = false

// Initialize PostHog
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com'

  console.log('[Analytics] PostHog Key present:', !!posthogKey)
  console.log('[Analytics] PostHog Host:', posthogHost)

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      // Capture pageviews manually with Next.js router
      capture_pageview: false,
      // Capture pageleaves for better session tracking
      capture_pageleave: true,
      // Enable session recording
      disable_session_recording: false,
      // Don't respect DNT for now (can enable later)
      respect_dnt: false,
      // Persistence
      persistence: 'localStorage+cookie',
      // Debug mode in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
        console.log('[Analytics] PostHog initialized successfully')
        posthogInitialized = true
      },
    })
  } else {
    console.warn('[Analytics] PostHog key not found - events will not be tracked')
  }
}

// Google Analytics pageview
function gtagPageview(url: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (measurementId) {
      ;(window as any).gtag('config', measurementId, {
        page_path: url,
      })
    }
  }
}

// Component to track pageviews
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      // Construct full URL
      let url = pathname
      const params = searchParams?.toString()
      if (params) {
        url = `${pathname}?${params}`
      }

      // Track in PostHog
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      })

      // Track in Google Analytics
      gtagPageview(url)
    }
  }, [pathname, searchParams])

  return null
}

// Google Analytics Script Component
function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  if (!measurementId) {
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        id="google-analytics"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

interface AnalyticsProviderProps {
  children: React.ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <PHProvider client={posthog}>
      <GoogleAnalytics />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}

// Export posthog for custom event tracking
export { posthog }

// Helper function to track custom events in both GA and PostHog
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  console.log('[Analytics] Tracking event:', eventName, properties)
  
  // Track in PostHog
  if (posthogInitialized) {
    posthog.capture(eventName, properties)
    console.log('[Analytics] Event sent to PostHog')
  } else {
    console.warn('[Analytics] PostHog not initialized - event not sent')
  }

  // Track in Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ;(window as any).gtag('event', eventName, properties)
    console.log('[Analytics] Event sent to Google Analytics')
  }
}

// Helper to identify users (call after login)
export function identifyUser(
  userId: string,
  traits?: Record<string, any>
) {
  // PostHog identify
  posthog.identify(userId, traits)

  // GA4 user ID
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (measurementId) {
      ;(window as any).gtag('config', measurementId, {
        user_id: userId,
      })
    }
  }
}

// Helper to reset user (call after logout)
export function resetUser() {
  posthog.reset()
}

