import Link from 'next/link'
import { ArrowRight, Check, PlayCircle, Sparkles, Wine as WineIcon } from 'lucide-react'

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

/**
 * Side-by-side explainer of our two offerings: Provningsverktyget (the free,
 * host-it-yourself tasting tool) vs Vinkvällen (the paid, video-guided
 * evening). Sits directly below the hero so a visitor understands within ten
 * seconds what each is and which one fits — free if you want to host it
 * yourself, paid if you want us to guide the evening.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md
 */
export function OfferingsComparison() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <Sparkles className="h-3 w-3" />
            Två sätt att hålla vinkväll
          </span>
          <h2 className={`${HEADING} mt-5 text-3xl md:text-4xl lg:text-5xl`}>
            Du är värd — eller <span className="text-brand-gradient">vi</span> är det
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
            Båda ger dig en kväll dina vänner pratar om efteråt. Skillnaden är hur mycket du
            själv vill stå för pratet.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <WineIcon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Provningsverktyget
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>Du håller i kvällen</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Färdig provning, inköpslista och ett värdmanus du kan läsa innantill. Du gör
              pratet — vi har skrivit det åt dig.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Färdiga provningar och inköpslista',
                'Värdmanus med fakta och frågor',
                'Livesession och smakblad till alla gäster',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                <span className="text-brand-gradient text-xl font-bold">Gratis</span>{' '}
                <span className="text-sm text-muted-foreground">· skapa konto, kör igång</span>
              </p>
              <Link
                href="/provningsverktyget"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-400 px-6 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-400/10 focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-2"
              >
                Kom igång gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="flex h-full flex-col rounded-2xl border border-brand-400/40 bg-brand-400/5 p-6 shadow-sm md:p-8">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
              <PlayCircle className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Vinkvällen
            </p>
            <h3 className={`${HEADING} mt-2 text-2xl md:text-3xl`}>Vi håller i kvällen</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Filmerna guidar hela provningen. Dina vänner tittar med, alla fyller i sina egna
              smakblad — du häller upp och njuter.
            </p>

            <ul className="mt-5 space-y-2 text-[14px] text-foreground">
              {[
                'Guidad provning i film — du behöver inte prata',
                'En betalar, hela sällskapet är med',
                '30 dagars pengarna-tillbaka-garanti',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <p className="text-[15px] font-medium">
                <span className="text-brand-gradient text-xl font-bold">499 kr</span>{' '}
                <span className="text-sm text-muted-foreground">· för hela sällskapet</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                En guidad vinprovning ute kostar 500–1000 kr per person.
              </p>
              <Link href="/vinkvallen" className="btn-brand mt-4 w-full">
                Läs om Vinkvällen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
