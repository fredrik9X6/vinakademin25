import { permanentRedirect } from 'next/navigation'
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
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.3)
 */
export default async function TemplateBuyPage({ params }: RouteParams) {
  const { slug } = await params
  permanentRedirect(`/provningsmallar/${slug}`)
}
