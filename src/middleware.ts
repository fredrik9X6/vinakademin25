import { NextRequest, NextResponse } from 'next/server'
import { loggerFor } from '@/lib/logger'
import { resolveTastingRedirect } from '@/lib/tasting-route-redirects'

const log = loggerFor('middleware')

// Define protected paths and their required roles
// Default role upon registration is now 'user' (set in AuthContext)
const protectedPaths = [
  // Removed legacy /mina-sidor; use /profil instead
  {
    path: '/instruktor', // Assuming Swedish name for /instructor
    roles: ['admin', 'instructor'],
  },
  {
    path: '/profil', // Renamed from /profile
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
  {
    path: '/mina-provningar',
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
  {
    path: '/mina-vinkurser',
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
  {
    path: '/onboarding',
    roles: ['admin', 'instructor', 'subscriber', 'user'],
  },
]

// Middleware function to protect routes
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // ---------------------------------------------------------------------------
  // Admin gate (Payload Admin UI lives under /admin)
  // - Allow unauthenticated users to reach /admin so Payload can show its login UI
  // - But if a user IS authenticated, they must be an admin to access /admin*
  // ---------------------------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    const payloadToken = request.cookies.get('payload-token')

    // No session yet -> allow Payload Admin to render its login screen.
    if (!payloadToken) {
      return NextResponse.next()
    }

    try {
      const meURL = new URL('/api/users/me', request.url)
      const cookieHeader = request.headers.get('cookie') ?? ''

      const meRes = await fetch(meURL, {
        headers: {
          cookie: cookieHeader,
        },
      })

      // If token is invalid/expired, let Payload Admin handle showing login.
      if (!meRes.ok) {
        return NextResponse.next()
      }

      const json = (await meRes.json().catch(() => null)) as any
      const role = json?.user?.role

      if (role !== 'admin') {
        // Logged in, but not an admin -> deny access to admin UI
        url.pathname = '/profil'
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
      }

      return NextResponse.next()
    } catch {
      // Fail open to avoid bricking admin UI due to transient issues.
      // Payload will still enforce access control on APIs.
      return NextResponse.next()
    }
  }

  // The wine-personality quiz is now "Vinhoroskop". Both older slugs 301 to it.
  //
  // ORDER IS LOAD-BEARING: "/vinkompassen" also starts with "/vinkompass", so
  // the shorter rule must come SECOND. Reversed, it rewrites /vinkompassen to
  // "/vinhoroskopen" — a 301 to a 404, permanently cached by every browser
  // that followed it.
  if (pathname === '/vinkompassen' || pathname.startsWith('/vinkompassen/')) {
    url.pathname = pathname.replace(/^\/vinkompassen/, '/vinhoroskop')
    return NextResponse.redirect(url, 301)
  }
  if (pathname === '/vinkompass' || pathname.startsWith('/vinkompass/')) {
    url.pathname = pathname.replace(/^\/vinkompass/, '/vinhoroskop')
    return NextResponse.redirect(url, 301)
  }

  // Permanent 301 from legacy /vinprovningar/* sub-paths to /vinkurser/*.
  // The collection was renamed to Vinkurser (video courses); the templates
  // product owns /provningsmallar separately. The bare /vinprovningar root now
  // routes to the tastings gallery via resolveTastingRedirect (see D2) — a
  // `startsWith('/vinprovningar/')` here would also claim "/vinprovningar/",
  // stranding that spelling on the course catalogue.
  // Preserves query strings so session links, lesson params, and Stripe cancel
  // URLs all survive.
  // Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D3)
  if (/^\/vinprovningar\/.+/.test(pathname)) {
    const target = pathname.replace(/^\/vinprovningar/, '/vinkurser')
    url.pathname = target
    return NextResponse.redirect(url, 301)
  }

  // Tasting IA consolidation (2026-07-27). Exact-match only — see
  // src/lib/tasting-route-redirects.ts for why a prefix match is dangerous here.
  const tastingRedirect = resolveTastingRedirect(pathname)
  if (tastingRedirect) {
    url.pathname = tastingRedirect.pathname
    for (const [key, value] of Object.entries(tastingRedirect.setParams ?? {})) {
      url.searchParams.set(key, value)
    }
    return NextResponse.redirect(url, tastingRedirect.status)
  }

  // Skip middleware for API routes, static files, and public routes
  // Ensure public paths match renamed routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/payload') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/' ||
    pathname === '/logga-in' ||
    pathname === '/registrera' ||
    pathname === '/aktivera-konto' ||
    pathname === '/glomt-losenord' ||
    pathname === '/aterstall-losenord' ||
    pathname === '/verifiera-epost' ||
    pathname === '/verifiera-epost-meddelande' || // Added the verification message page
    pathname === '/vinkurser' || // Allow public access to courses listing page
    (pathname.startsWith('/vinkurser/') && !url.searchParams.has('lesson')) // Allow public access to course landing pages, but not lessons
  ) {
    return NextResponse.next()
  }

  // Guest carve-out: a plan-driven session participant may not have an account.
  // Their identity is carried by the vk_participant_token cookie set on
  // /api/sessions/join. When ?session=<id> is present on the plan detail page,
  // skip the middleware gate and let the page validate the session itself.
  if (
    /^\/mina-provningar\/planer\/\d+$/.test(pathname) &&
    url.searchParams.has('session')
  ) {
    return NextResponse.next()
  }

  // Same carve-out for the post-session recap: an unauthenticated guest who
  // attended a session via their participant cookie should be able to see the
  // recap after the host ends. The historik page validates the cookie against
  // the session and redirects to /logga-in itself when the cookie is missing
  // or stale. Without this, the middleware bounces all guests before they
  // ever reach the page.
  if (
    /^\/mina-provningar\/historik\/\d+$/.test(pathname) &&
    request.cookies.has('vk_participant_token')
  ) {
    return NextResponse.next()
  }

  // Public profile pages live under /profil/<handle> and /profil/<handle>/<planId>.
  // /profil (own settings) stays protected; only multi-segment paths under
  // /profil are public.
  if (/^\/profil\/[^/]+(\/.*)?$/.test(pathname)) {
    return NextResponse.next()
  }

  // Check if the path is protected (using the updated protectedPaths)
  const protectedPath = protectedPaths.find((p) => pathname.startsWith(p.path))

  // If the path is not explicitly protected, allow access
  if (!protectedPath) {
    return NextResponse.next()
  }

  // Simple cookie presence check for authentication
  const payloadToken = request.cookies.get('payload-token')

  // If user is not authenticated and trying to access protected path, redirect to login
  if (!payloadToken && protectedPath) {
    log.info(`Middleware: No auth cookie found, redirecting to login from ${pathname}`)
    url.pathname = '/logga-in'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (payloadToken && (pathname === '/logga-in' || pathname === '/registrera')) {
    log.info(`Middleware: Auth cookie found, redirecting from ${pathname} to /profil`)
    url.pathname = '/profil'
    return NextResponse.redirect(url)
  }

  // --- Authorization Check (Removed) ---
  // Role-based authorization should now be handled within page components/layouts
  // If we reach here, the user is either authenticated accessing a protected route,
  // or accessing an unprotected route.

  log.info(`Middleware: Allowing access to ${pathname}.`)
  return NextResponse.next()
}

// Configure the paths that should be checked by this middleware
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /_next (Static files)
     * 2. /api (API routes)
     * 3. /static (Static files)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /robots.txt, /sitemap.xml (Static files)
     */
    '/((?!_next|_vercel|api|static|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
