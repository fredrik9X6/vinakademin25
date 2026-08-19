import Link from 'next/link'
import type { TastingTemplate, Media } from '@/payload-types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock, Wine as WineIcon, Users } from 'lucide-react'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import type { LockedTemplatePreview } from '@/lib/template-locked-preview'

export interface LockedTemplateDetailViewProps {
  template: TastingTemplate
  preview: LockedTemplatePreview
  /** Whether the viewer is logged in. Anonymous visitors get the signup CTA. */
  isAuthenticated: boolean
}

/**
 * What an anonymous visitor sees on a template an admin has deliberately gated
 * behind a free account. Since 2026-08-19 templates default to fully public, so
 * this renders only for accessLevel === 'paid'.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.4)
 */
export function LockedTemplateDetailView({
  template,
  preview,
  isAuthenticated,
}: LockedTemplateDetailViewProps) {
  const featured =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null
  const heroUrl = featured ? featured.url ?? null : null
  const priceLabel =
    preview.totalPriceSek != null
      ? `~${new Intl.NumberFormat('sv-SE').format(preview.totalPriceSek)} kr`
      : null
  const detailPath = `/provningsmallar/${template.slug}`
  const signupHref = `/registrera?from=${encodeURIComponent(detailPath)}`
  const loginHref = `/logga-in?from=${encodeURIComponent(detailPath)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="space-y-6 min-w-0">
        <Link
          href="/provningsmallar"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till alla vinprovningar
        </Link>

        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="w-full aspect-[16/9] object-cover rounded-lg"
          />
        ) : (
          <div className="w-full aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
            <WineIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        <header>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-heading">{template.title}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-400/15 text-brand-400 px-2.5 py-0.5 text-xs font-medium">
              <Lock className="h-3 w-3" />
              Kräver konto
            </span>
          </div>
          {template.description && (
            <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
              {template.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{preview.wineCount} viner</span>
            {priceLabel && (
              <>
                <span>·</span>
                <span>{priceLabel}</span>
              </>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              ~{template.targetParticipants ?? 4} deltagare
            </span>
            <span>·</span>
            <span>Av Vinakademin</span>
          </div>
        </header>

        <Card className="border-brand-400/40 bg-brand-400/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-400/15 text-brand-400 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Skapa ett gratiskonto och lås upp hela provningen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Helt gratis — vinlista, värdmanus och smakblad ingår.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
              <Button asChild size="sm">
                <Link href={signupHref}>Skapa gratiskonto</Link>
              </Button>
              {!isAuthenticated && (
                <Link
                  href={loginHref}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline text-center sm:text-right"
                >
                  Har du redan konto? Logga in
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Vin för vin</h2>
          {preview.wineCount === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner i mallen.</p>
          ) : (
            <ul className="space-y-2">
              {preview.pourOrders.map((pour) => (
                <li
                  key={pour}
                  className="flex gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4 items-center"
                >
                  <div className="relative flex-shrink-0 w-20 h-32 sm:w-24 sm:h-36">
                    <span
                      className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[110px] sm:text-[130px] -ml-2 -mt-1"
                      aria-hidden="true"
                    >
                      {pour}
                    </span>
                    <WineImagePlaceholder />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-muted-foreground">
                      Dolt vin
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Skapa ett gratiskonto för att se vad du provar.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <Button asChild className="w-full">
          <Link href={signupHref}>Skapa gratiskonto</Link>
        </Button>
        {!isAuthenticated && (
          <Link
            href={loginHref}
            className="block text-center text-xs text-muted-foreground hover:text-foreground hover:underline pt-1"
          >
            Har du redan konto? Logga in
          </Link>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Gratis konto — ingen betalning, inget abonnemang.
        </p>
      </aside>
    </div>
  )
}
