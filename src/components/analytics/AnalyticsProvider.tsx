'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Track if PostHog has been initialized
let posthogInitialized = false

// PostHog configuration - these are public keys, safe to commit
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_NEwNtznBZqYk5R55Ghi41cWmUxQ1eN4laFk9J2kPRtk'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

// Initialize PostHog
if (typeof window !== 'undefined') {
  console.log('[Analytics] PostHog Key present:', !!POSTHOG_KEY)
  console.log('[Analytics] PostHog Host:', POSTHOG_HOST)

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
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

// Google Analytics configuration
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-HZNFBWXCPT'

// Google Analytics pageview
function gtagPageview(url: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    if (GA_MEASUREMENT_ID) {
      ;(window as any).gtag('config', GA_MEASUREMENT_ID, {
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
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        id="google-analytics"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
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
  if (typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
    ;(window as any).gtag('config', GA_MEASUREMENT_ID, {
      user_id: userId,
    })
  }
}

// Helper to reset user (call after logout)
export function resetUser() {
  posthog.reset()
}

