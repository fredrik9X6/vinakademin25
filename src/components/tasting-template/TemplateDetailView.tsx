import Link from 'next/link'
import type { TastingTemplate, Wine, Media } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Wine as WineIcon, Users } from 'lucide-react'
import { UseTemplateButton } from './UseTemplateButton'

function wineTitle(w: NonNullable<TastingTemplate['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    return lib.name || `Vin #${lib.id}`
  }
  return 'Vin'
}

function wineSubtitle(w: NonNullable<TastingTemplate['wines']>[number]): string {
  if (w.libraryWine && typeof w.libraryWine === 'object') {
    const lib = w.libraryWine as Wine
    const region =
      typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
    return [lib.winery, lib.vintage ? String(lib.vintage) : null, region]
      .filter(Boolean)
      .join(' · ')
  }
  return ''
}

function wineThumb(w: NonNullable<TastingTemplate['wines']>[number]): string | null {
  if (!(w.libraryWine && typeof w.libraryWine === 'object')) return null
  const lib = w.libraryWine as Wine
  const image = typeof lib.image === 'object' && lib.image ? lib.image : null
  if (!image) return null
  return image.sizes?.bottle?.url ?? image.sizes?.thumbnail?.url ?? image.url ?? null
}

export interface TemplateDetailViewProps {
  template: TastingTemplate
}

export function TemplateDetailView({ template }: TemplateDetailViewProps) {
  const wines = template.wines ?? []
  const featured =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null
  const heroUrl = featured ? featured.url ?? null : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="space-y-6 min-w-0">
        <Link
          href="/provningsmallar"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till alla mallar
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
          <h1 className="text-3xl font-heading">{template.title}</h1>
          {template.description && (
            <p className="text-base text-muted-foreground mt-2 whitespace-pre-wrap">
              {template.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{template.occasion || '—'}</span>
            <span>·</span>
            <span>{wines.length} viner</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              ~{template.targetParticipants ?? 4} deltagare
            </span>
            <span>·</span>
            <span>Av Vinakademin</span>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Viner</h2>
          {wines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga viner i mallen.</p>
          ) : (
            <ul className="space-y-2">
              {wines.map((w, idx) => {
                const thumb = wineThumb(w)
                return (
                  <li
                    key={w.id ?? idx}
                    className="flex gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4 items-center overflow-hidden"
                  >
                    <div className="relative flex-shrink-0 w-20 h-32 sm:w-24 sm:h-36">
                      <span
                        className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[110px] sm:text-[130px] -ml-2 -mt-1"
                        aria-hidden="true"
                      >
                        {w.pourOrder ?? idx + 1}
                      </span>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="relative w-full h-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm sm:text-base font-medium truncate">{wineTitle(w)}</p>
                      {wineSubtitle(w) && (
                        <p className="text-xs text-muted-foreground truncate">{wineSubtitle(w)}</p>
                      )}
                      {w.hostNotes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {w.hostNotes}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {template.hostScript && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Manus för värden</h2>
            <Card className="p-4">
              <p className="text-sm whitespace-pre-wrap">{template.hostScript}</p>
            </Card>
          </section>
        )}
      </div>

      <aside className="md:sticky md:top-20 md:self-start space-y-2">
        <UseTemplateButton templateId={template.id} templateSlug={template.slug} />
        <p className="text-xs text-muted-foreground text-center">
          Du landar på din egen redigerbara plan.
        </p>
      </aside>
    </div>
  )
}
