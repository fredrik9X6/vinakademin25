import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Vinprovning — Vinakademin',
  robots: { index: false, follow: false },
}

/**
 * Templates stopped being sold on 2026-08-19 — the whole tasting system is a
 * free lead magnet now. The route survives so indexed URLs and old links land
 * on the template instead of a 404.
 *
 * The redirect is temporary (307) ON PURPOSE, not an oversight: browsers cache
 * a permanent (308) redirect indefinitely, which would prevent this route from
 * ever being revived if the sales flow came back. This route is `noindex` and
 * nothing links to it, so there is no SEO cost to using a temporary redirect.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.3)
 */
export default async function TemplateBuyPage({ params }: RouteParams) {
  const { slug } = await params
  redirect(`/provningsmallar/${slug}`)
}
