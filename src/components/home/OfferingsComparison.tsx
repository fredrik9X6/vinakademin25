import Link from 'next/link'
import { ArrowRight, Check, PlayCircle, Wine as WineIcon } from 'lucide-react'

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

/**
 * Side-by-side explainer of our two products: Vinkurs (video courses) vs
 * Provningsmall (host-it-yourself templates). Sits directly below the hero so
 * a visitor understands within ten seconds what each is and which one fits.
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (Workstream C)
 */
export function OfferingsComparison() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Två sätt att lära dig
          </span>
          <h2 className={`${HEADING} mt-5 text-3xl md:text-4xl lg:text-5xl`}>
            <span className="text-brand-gradient">Vinkurs</span> eller{' '}
            <span className="text-brand-gradient">Provningsmall</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
            Båda är gjorda för att avmystifiera vin. Skillnaden är hur du föredrar att ta in
            innehållet — i din egen takt eller tillsammans med dina vänner.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Vinkurs card */}
          <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <PlayCircle className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Videokurs
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>
              Lär dig vin i din egen takt
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              För dig som vill lära dig grundligt — gärna med vänner som gäster när du vill bjuda
              in dem till en gruppsession.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Videolektioner & quiz',
                'Vinval och köpguide till Systembolaget',
                'Värdguide om du bjuder in vänner',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                Från <span className="text-brand-gradient text-xl font-bold">499 kr</span>{' '}
                <span className="text-sm text-muted-foreground">· engångsbetalning</span>
              </p>
              <Link
                href="/vinkurser"
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-gradient px-6 text-[14px] font-medium text-white shadow-[0_10px_20px_-5px_rgba(251,145,76,0.25)] transition-all hover:bg-brand-gradient-reverse"
              >
                Se kurserna
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* Provningsmall card */}
          <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <WineIcon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Färdigt upplägg
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>
              Var värd för en provning
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              För dig som vill samla folk och guida en avslappnad provning utan att förbereda
              allt från noll.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Tema och vinval kurerade åt dig',
                'Värdmanus med fakta och frågor att ställa',
                'Smakprotokoll för alla deltagare',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                <span className="text-brand-gradient text-xl font-bold">99 kr</span>{' '}
                <span className="text-sm text-muted-foreground">
                  per mall · en gratis när du loggar in
                </span>
              </p>
              <Link
                href="/provningsmallar"
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand-400 px-6 text-[14px] font-medium text-brand-400 transition-all hover:bg-brand-400/10"
              >
                Utforska biblioteket
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
