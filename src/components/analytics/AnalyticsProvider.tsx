'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Track if PostHog has been initialized
let posthogInitialized = false
/** Synchronous latch — see initPostHog. */
let posthogInitStarted = false

// PostHog configuration — these are public keys, safe to commit.
//
// api_host routes through our managed reverse proxy at g.vinakademin.se,
// not posthog.com directly — keeps tracking calls on a first-party domain
// so they aren't dropped by ad blockers / content-blocking DNS. The proxy
// is fronted by Cloudflare and forwards to eu.i.posthog.com.
//
// ui_host stays on the real PostHog UI domain (eu.posthog.com) so the
// SDK's "open in PostHog" links (session-recording deep links, surveys,
// admin shortcuts) point at the dashboard instead of the proxy.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_NEwNtznBZqYk5R55Ghi41cWmUxQ1eN4laFk9J2kPRtk'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://g.vinakademin.se'
const POSTHOG_UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com'

/**
 * Initialise PostHog. MUST be called from an effect, never at module scope.
 *
 * posthog-js loads its remote bundle by inserting a <script> before the first
 * `body > script` it finds. In this app those are the JSON-LD tags the root
 * layout renders as the first children of <body>. Running init at module
 * scope meant that insertion happened while the client bundle evaluated —
 * before React hydrated — so <body>'s child list changed underneath the
 * hydration pass and React reported, on every page:
 *
 *   "A tree hydrated but some attributes of the server rendered HTML didn't
 *    match the client properties. This won't be patched up."
 *
 * React then discarded the server-rendered JSON-LD (it showed up in the diff
 * as type="application/ld+json" replaced by the posthog recorder script), so
 * the Organization and WebSite structured data was being destroyed client-side.
 *
 * Calling this from an effect means hydration has committed before posthog
 * touches the DOM.
 */
function initPostHog() {
  // `posthogInitialized` only flips in the async `loaded` callback, so it
  // cannot guard against a second synchronous call. React runs child effects
  // before parent effects, which means PageViewTracker's effect fires before
  // AnalyticsProvider's — both call this, and without a synchronous latch the
  // SDK would be initialised twice.
  if (typeof window === 'undefined' || posthogInitStarted || !POSTHOG_KEY) return
  posthogInitStarted = true

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] PostHog Host:', POSTHOG_HOST, '· UI Host:', POSTHOG_UI_HOST)
  }

  posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_UI_HOST,
      // Lock in the SDK behavior snapshot so future posthog-js versions
      // can't silently change defaults under us. PostHog's dashboard
      // generator emits '2026-05-30', but the installed posthog-js@1.302.2
      // only types the older snapshots — using the latest one this SDK
      // knows about. Bump posthog-js if you want the 2026-05-30 snapshot.
      defaults: '2025-11-30',
      // Don't create person profiles for anonymous visitors — only after
      // identify() is called. Keeps the project's MTU count tied to real
      // logged-in users instead of every drive-by browser session.
      person_profiles: 'identified_only',
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
          console.log('[Analytics] PostHog initialized successfully')
        }
        posthogInitialized = true
      },
    })
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
      // Init here too, not just in the provider: React runs child effects
      // before parent ones, so on first load this effect fires BEFORE
      // AnalyticsProvider's. Without this the very first pageview of a
      // session — the one that carries the entry URL and referrer — would be
      // captured against an uninitialised SDK and dropped. initPostHog is
      // latched, so the later parent call is a no-op.
      initPostHog()

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
  // Deferred to an effect on purpose — see initPostHog's comment. Initialising
  // at module scope mutated <body> before hydration and destroyed the
  // server-rendered JSON-LD on every page.
  useEffect(() => {
    initPostHog()
    if (!POSTHOG_KEY && process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] PostHog key not found - events will not be tracked')
    }
  }, [])

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

