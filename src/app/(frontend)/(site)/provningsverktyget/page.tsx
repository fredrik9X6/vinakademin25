import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSiteURL } from '@/lib/site-url'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { NewsletterSignupBlock } from '@/components/blocks/NewsletterSignupBlock'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Hammer,
  Smartphone,
  Sparkles,
  Wine,
} from 'lucide-react'
import type { TastingTemplate } from '@/payload-types'

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

export const metadata: Metadata = {
  title: 'Provningsverktyget — håll en vinprovning hemma, gratis',
  description:
    'Färdiga vinprovningar, inköpslista till Systembolaget, värdmanus och smakblad till alla gäster. Allt gratis — skapa konto och kör igång.',
  alternates: { canonical: `${getSiteURL()}/provningsverktyget` },
  openGraph: {
    title: 'Provningsverktyget — håll en vinprovning hemma, gratis | Vinakademin',
    description:
      'Färdiga vinprovningar, inköpslista, värdmanus och smakblad. Allt gratis.',
    url: `${getSiteURL()}/provningsverktyget`,
    type: 'website',
  },
}

const PILLARS = [
  {
    icon: Wine,
    title: 'Färdiga provningar',
    body: 'Tema, viner och ordning är redan bestämt. Du får en inköpslista rakt in i Systembolaget — handla, ställ in i kylen, klart.',
  },
  {
    icon: Hammer,
    title: 'Bygg din egen',
    body: 'Har du redan viner hemma? Sök upp dem, sätt din egen ordning och skriv dina egna frågor. Verktyget gör resten.',
  },
  {
    icon: Smartphone,
    title: 'Livesession på mobilen',
    body: 'Alla gäster går med via en länk. Du styr takten, de följer med på sin egen telefon. Ingen behöver ladda ner något.',
  },
  {
    icon: ClipboardList,
    title: 'Smakblad och resultat',
    body: 'Var och en fyller i vad de tycker. På slutet jämför ni — vem gillade vad, och vem hade faktiskt rätt.',
  },
] as const

const STEPS = [
  {
    n: '1',
    title: 'Välj en provning',
    body: 'Ta en av våra färdiga, eller bygg en egen på fem minuter.',
  },
  {
    n: '2',
    title: 'Handla vinerna',
    body: 'Du får en lista med exakta viner och priser. Allt finns på Systembolaget.',
  },
  {
    n: '3',
    title: 'Bjud in och kör',
    body: 'Skicka länken till gänget. Ni kör provningen tillsammans, verktyget guidar.',
  },
] as const

const FAQ = [
  {
    q: 'Är det verkligen gratis?',
    a: 'Ja. Alla provningar, verktyget och livesessionerna är gratis. Du skapar ett konto, sen är det ditt. Vi tjänar pengar på vår vinkväll — den är helt frivillig.',
  },
  {
    q: 'Behöver jag kunna något om vin?',
    a: 'Nej. Varje provning kommer med ett värdmanus — vad du säger, vad du frågar, vad som är kul att veta om varje vin. Du läser innantill om du vill.',
  },
  {
    q: 'Hur många kan vara med?',
    a: 'Från två personer till ett helt sällskap. En flaska räcker till ungefär sex provglas, så räkna med en flaska per vin om ni är sex, två om ni är tolv.',
  },
  {
    q: 'Vad kostar vinerna?',
    a: 'Det bestämmer du. Varje provning visar vad varje vin kostar innan du börjar, och vi väljer nästan alltid viner som går att hitta i vanliga Systembolagsbutiker.',
  },
] as const

export default async function ProvningsverktygetPage() {
  const payload = await getPayload({ config })
  const templatesResult = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } } as never,
    depth: 1,
    limit: 3,
    sort: '-publishedAt',
  })
  const templates = templatesResult.docs as TastingTemplate[]

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <Sparkles className="h-3 w-3" />
            Helt gratis
          </span>
          <h1 className={`${HEADING} mt-5 text-4xl md:text-5xl lg:text-6xl`}>
            Håll en <span className="text-brand-gradient">vinprovning</span> hemma
            <br className="hidden sm:block" /> utan att kunna något om vin
          </h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground md:text-lg">
            Provningsverktyget ger dig färdiga provningar, en inköpslista till Systembolaget,
            ett värdmanus att läsa innantill och smakblad till varje gäst. Du bjuder in — vi
            har gjort resten.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/registrera?from=/provningsverktyget" className="btn-brand">
              Skapa gratiskonto
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/provningsmallar"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-400 px-6 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-400/10"
            >
              Se provningarna först
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ingen betalning. Inget abonnemang. Inget kort.
          </p>
        </div>
      </section>

      {/* ── Fyra pelare ──────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>Det här får du</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300/15 text-brand-400">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className={`${HEADING} text-xl md:text-2xl`}>{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Så funkar det ────────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>Så funkar det</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Från idé till provning på en eftermiddag.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span
                  className={`${HEADING} block text-5xl text-brand-400/30 md:text-6xl`}
                  aria-hidden="true"
                >
                  {s.n}
                </span>
                <h3 className={`${HEADING} mt-2 text-xl`}>{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof: riktiga provningar ────────────────────────────────────── */}
      {templates.length > 0 && (
        <section className="py-14 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className={`${HEADING} text-3xl md:text-4xl`}>Redo att köra i kväll</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                Några av provningarna som ligger klara just nu.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/provningsmallar"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:underline"
              >
                Se alla provningar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Signup ───────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
            <h2 className={`${HEADING} text-3xl md:text-4xl`}>
              Skapa konto och <span className="text-brand-gradient">kör igång</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
              Gratis — inget kort, inget abonnemang. Du får hela verktyget direkt — och ett mejl i veckan med
              vintips och nya provningar.
            </p>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-[14px]">
              {[
                'Alla färdiga provningar',
                'Bygg egna provningar',
                'Livesessioner för hela sällskapet',
                'Smakblad och resultat som sparas',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/registrera?from=/provningsverktyget" className="btn-brand mt-8">
              Skapa gratiskonto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="pb-14 lg:pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className={`${HEADING} mb-8 text-center text-3xl md:text-4xl`}>Vanliga frågor</h2>
          <dl className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-xl border border-border bg-card p-5 md:p-6">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Handoff till Vinkvällen ──────────────────────────────────────── */}
      <section className="pb-16 lg:pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-brand-400/40 bg-brand-400/5 p-8 text-center md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
              Vill du slippa vara den som pratar?
            </p>
            <h2 className={`${HEADING} mt-3 text-2xl md:text-3xl`}>
              Låt oss hålla i vinkvällen åt dig
            </h2>
            <p className="mx-auto mt-4 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Med Vinkvällen guidar filmerna hela kvällen. Dina vänner tittar med, alla fyller i
              sina smakblad — du häller upp. 499 kr för hela sällskapet.
            </p>
            <Link
              href="/vinkurser"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:underline"
            >
              Läs om Vinkvällen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Last-resort capture for visitors who won't create an account. Props are
          passed explicitly because this component's defaults are English —
          rendering it bare would put English copy on a Swedish page. Mirrors the
          homepage's usage at (site)/page.tsx:471-479. */}
      <section className="pb-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <NewsletterSignupBlock
            title="Inte redo att skapa konto?"
            description="Få nya provningar och vintips i mejlen. Ett mejl i veckan, ungefär."
            buttonText="Prenumerera"
            placeholderText="Din e-postadress"
            style="minimal"
            backgroundColor="transparent"
            disclaimer="Avsluta prenumerationen när du vill."
          />
        </div>
      </section>
    </div>
  )
}
