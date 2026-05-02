import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Mail, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react'
import { getSiteURL } from '@/lib/site-url'

const ORANGE_400 = '#FB914C'
const ORANGE_300 = '#FDBA75'
const GRADIENT = `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

const PDF_URL = '/lead-magnets/det-enda-du-behover-veta-om-vin.pdf'

export const metadata: Metadata = {
  title: 'Tack! Din e-bok är på väg | Vinakademin',
  description:
    'Tack för att du anmälde dig. Ladda ner Det enda du behöver veta om vin här eller kolla din inbox.',
  alternates: { canonical: `${getSiteURL()}/grunderna-i-vin/tack` },
  robots: { index: false, follow: false },
}

export default function GrunderaIVinTackPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Soft brand blobs */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: ORANGE_300 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-40 h-[420px] w-[420px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: ORANGE_400 }}
        aria-hidden
      />

      <section className="relative mx-auto max-w-3xl px-4 pb-24 pt-20 text-center sm:px-6 lg:px-8 lg:pt-28">
        <div
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full"
          style={{
            background: GRADIENT,
            boxShadow: '0 12px 30px -8px rgba(251,145,76,0.45)',
          }}
        >
          <CheckCircle2 className="h-8 w-8 text-[#1a0f06]" aria-hidden />
        </div>

        <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
          <span className="h-px w-8 bg-brand-400" aria-hidden />
          Du är inne
          <span className="h-px w-8 bg-brand-400" aria-hidden />
        </span>

        <h1 className={`${HEADING} mt-5 text-[clamp(36px,6vw,64px)]`}>
          Tack!
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
            Här är din e-bok.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl font-serif text-[18px] italic leading-[1.5] text-muted-foreground">
          14 sidor som tar dig från osäker till nyfiken. Öppna en flaska, läs i lugn
          och ro, och prova metoden direkt.
        </p>

        {/* Primary download */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href={PDF_URL}
            download
            className="group inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 text-[15px] font-medium text-[#1a0f06] transition-transform hover:-translate-y-0.5"
            style={{
              background: GRADIENT,
              boxShadow: '0 14px 30px -8px rgba(251,145,76,0.4)',
            }}
          >
            <Download className="h-5 w-5" />
            Ladda ner PDF (14 sidor)
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>

          <p className="text-[12px] text-muted-foreground">
            En kopia är även på väg till din inbox.
          </p>
        </div>

        {/* Mail callout */}
        <div className="mx-auto mt-12 flex max-w-xl items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
          <div
            className="flex-shrink-0 rounded-xl border border-brand-400/20 p-2.5"
            style={{ background: 'rgba(253,186,117,0.08)' }}
          >
            <Mail className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h2 className={`${HEADING} text-lg`}>Kolla din inbox</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
              Om du inte ser den inom några minuter — kolla skräpposten, eller använd
              knappen ovan för att ladda ner direkt här.
            </p>
          </div>
        </div>

        {/* What's next */}
        <div className="mt-16 grid gap-4 text-left md:grid-cols-2">
          <Link
            href="/vinprovningar"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className="flex-shrink-0 rounded-xl border border-brand-400/20 p-2.5"
              style={{ background: 'rgba(253,186,117,0.08)' }}
            >
              <BookOpen className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h3 className={`${HEADING} text-xl`}>Nästa steg</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                Bygg vidare med en guidad vinprovning hemma — perfekt sällskap till
                e-boken.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-400">
                Utforska provningar
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          <Link
            href="/vinkompassen"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className="flex-shrink-0 rounded-xl border border-brand-400/20 p-2.5"
              style={{ background: 'rgba(253,186,117,0.08)' }}
            >
              <Download className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h3 className={`${HEADING} text-xl`}>Hitta din vinstil</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                Gör Vinkompassen — 3 minuter, och du vet vilka vinstilar som passar
                just dig.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-400">
                Starta Vinkompassen
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>

        <p className="mt-12 text-[12px] text-muted-foreground">
          Problem med nedladdningen? Mejla oss på{' '}
          <a
            href="mailto:hej@vinakademin.se"
            className="underline underline-offset-4 hover:text-brand-400"
          >
            hej@vinakademin.se
          </a>
          .
        </p>
      </section>
    </div>
  )
}
