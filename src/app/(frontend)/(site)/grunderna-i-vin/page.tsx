import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  Eye,
  Wine,
  UtensilsCrossed,
  Award,
  ListOrdered,
  CheckCircle2,
  Mail,
  Download,
  Clock,
} from 'lucide-react'
import { EbookSignupForm } from '@/components/lead-magnet/EbookSignupForm'
import { getSiteURL } from '@/lib/site-url'

const SLUG = 'grunderna-i-vin'

const ORANGE_400 = '#FB914C'
const ORANGE_300 = '#FDBA75'
const GRADIENT = `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'
const HEADING_HERO = 'font-heading tracking-[-0.015em] leading-[1]'

export const metadata: Metadata = {
  title: 'Det enda du behöver veta om vin — gratis e-bok | Vinakademin',
  description:
    'En 14-sidors kickstart till vinens värld. Lär dig provningsmetoden, mat & vin, kvalitetskoll och fem viner som lär dig mest. Gratis när du prenumererar på vårt nyhetsbrev.',
  alternates: { canonical: `${getSiteURL()}/${SLUG}` },
  openGraph: {
    title: 'Det enda du behöver veta om vin — gratis e-bok',
    description:
      'En 14-sidors kickstart till vinens värld. Gratis när du prenumererar på Vinakademins nyhetsbrev.',
    url: `${getSiteURL()}/${SLUG}`,
    type: 'article',
  },
}

const chapters = [
  {
    num: '01',
    icon: Wine,
    eyebrow: 'Del 1',
    title: 'Vin för alla',
    summary:
      'Varför vin inte behöver vara svårt — och hur du börjar lita på dina egna sinnen istället för på dryga termer.',
  },
  {
    num: '02',
    icon: Eye,
    eyebrow: 'Del 2',
    title: 'De 5 S:en',
    summary:
      'Se · Snurra · Sniffa · Smaka · Sammanfatta. Den klassiska metoden som tar dig från att dricka till att prova.',
  },
  {
    num: '03',
    icon: UtensilsCrossed,
    eyebrow: 'Del 3',
    title: 'Mat & Vin',
    summary:
      'Glöm "vitt till fisk, rött till kött". Förstå istället syra, sötma, fett och tyngd — och varför balans alltid vinner.',
  },
  {
    num: '04',
    icon: Award,
    eyebrow: 'Del 4',
    title: 'BLIK — kvalitetskollen',
    summary:
      'Balans · Längd · Intensitet · Komplexitet. Fyra frågor som skiljer ett enkelt vin från ett stort vin.',
  },
  {
    num: '05',
    icon: ListOrdered,
    eyebrow: 'Del 5',
    title: 'Din kickstart-lista',
    summary:
      'Fem viner — Prosecco, Riesling, Chardonnay, Nebbiolo, Bordeaux — som tillsammans bygger ditt referensbibliotek.',
  },
]

const benefits = [
  'Provningsmetoden proffsen använder',
  '"Färg-hacket" som låser upp doften',
  'Mat & vin utan klassiska regler',
  'BLIK — fyra frågor för kvalitet',
  'Inköpslista med 5 viner & producenter',
  'Skrivet på begriplig svenska, utan flum',
]

const faqs = [
  {
    q: 'Är e-boken verkligen gratis?',
    a: 'Ja. Du får e-boken som PDF direkt efter att du anmält dig till Vinakademins nyhetsbrev. Ingen kreditkortsuppgift, ingen prövoperiod.',
  },
  {
    q: 'I vilket format kommer den?',
    a: 'Som en PDF i A4-format, 14 sidor. Du kan läsa den i mobilen, surfplattan, datorn eller skriva ut den och ha vid sidan när du provar vin.',
  },
  {
    q: 'Vem är boken för?',
    a: 'För dig som vill njuta mer av vin utan att låta som en vinexpert. Nybörjare får en stadig grund, mer vana drickare får en metod att hänga upp sin kunskap på.',
  },
  {
    q: 'Hur ofta skickas nyhetsbrevet?',
    a: 'Ungefär en gång i veckan. Tre vinrekommendationer, en mat & vin-kombo, ett kort tips. Vill du sluta — ett klick i mailen, klart.',
  },
]

export default function GrunderaIVinPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Soft brand blobs */}
        <div
          className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full opacity-[0.18] blur-[120px]"
          style={{ background: ORANGE_300 }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-32 top-32 h-[480px] w-[480px] rounded-full opacity-[0.14] blur-[120px]"
          style={{ background: ORANGE_400 }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            {/* Left: copy + form */}
            <div>
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                <span className="h-px w-8 bg-brand-400" aria-hidden />
                Gratis e-bok · 14 sidor
              </span>

              <h1
                className={`${HEADING_HERO} mt-5 text-[clamp(40px,7vw,76px)]`}
                style={{ textWrap: 'balance' as never }}
              >
                Det enda du behöver
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: GRADIENT }}
                >
                  veta om vin.
                </span>
              </h1>

              <p className="mt-6 max-w-[52ch] font-serif text-[20px] italic leading-[1.5] text-muted-foreground">
                En kickstart till vinens värld — utan dryga termer, utan flum.
                Bara grunderna som gör varje glas roligare.
              </p>

              <div className="mt-8">
                <EbookSignupForm slug={SLUG} variant="on-paper" />
              </div>

              <ul className="mt-8 grid gap-2 text-[14px] text-muted-foreground sm:grid-cols-2">
                {[
                  'Direkt i inboxen efter anmälan',
                  'Ingen pretentiös jargong',
                  '14 sidor, ~20 min läsning',
                  'PDF — läs i mobilen eller skriv ut',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: stylized e-book cover */}
            <div className="relative mx-auto w-full max-w-[400px]">
              <BookCover />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S INSIDE — chapter cards */}
      <section className="border-t border-border bg-card/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Innehåll · 5 delar
            </span>
            <h2 className={`${HEADING} mt-3 text-4xl md:text-5xl`}>
              Allt du behöver,
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: GRADIENT }}
              >
                inget mer.
              </span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Fem korta delar, skrivna för att läsas i ett svep. Varje del lämnar
              dig med en konkret metod du kan använda nästa gång du öppnar en
              flaska.
            </p>
          </div>

          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <li
                key={c.num}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`${HEADING} text-5xl text-brand-400`}
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {c.num}
                  </span>
                  <div
                    className="rounded-xl border border-brand-400/20 p-2.5"
                    style={{ background: 'rgba(253,186,117,0.08)' }}
                  >
                    <c.icon className="h-5 w-5 text-brand-400" />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {c.eyebrow}
                  </span>
                  <h3 className={`${HEADING} mt-1 text-2xl`}>{c.title}</h3>
                </div>

                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  {c.summary}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* AUTHORITY / WHY */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="relative">
              <div
                className="absolute -inset-6 -z-10 rounded-[28px] opacity-[0.10] blur-[80px]"
                style={{ background: GRADIENT }}
                aria-hidden
              />
              <blockquote className="relative rounded-2xl border border-border bg-card p-8 shadow-sm md:p-10">
                <span
                  className={`${HEADING} absolute -top-4 left-8 text-6xl leading-none text-brand-400`}
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="font-serif text-[20px] italic leading-[1.55] text-foreground">
                  Kunskap om hur en blomma fungerar tar inte bort dess skönhet.
                  Tvärtom. Det lägger bara till fler lager av spänning, mysterium
                  och förundran.
                </p>
                <footer className="mt-5 text-[13px] uppercase tracking-[0.1em] text-muted-foreground">
                  Richard Feynman · citerad i Del 1
                </footer>
              </blockquote>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Vad du tar med dig
              </span>
              <h2 className={`${HEADING} mt-3 text-4xl md:text-5xl`}>
                Lär dig grunderna —
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: GRADIENT }}
                >
                  njut mer av varje glas.
                </span>
              </h2>
              <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
                Boken bygger på 12 års vinintresse, samlat i en metod som faktiskt
                fungerar i vardagen. Inga &ldquo;dofter av blöt hund&rdquo; — bara
                en handfast väg in.
              </p>

              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-400" />
                    <span className="text-[14px] leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="border-t border-border bg-card/30 py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Så funkar det
            </span>
            <h2 className={`${HEADING} mt-3 text-3xl md:text-4xl`}>
              Tre steg till e-boken
            </h2>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {[
              {
                num: '1',
                icon: Mail,
                title: 'Anmäl dig',
                body: 'Skriv din e-post i fältet ovan. Vi behöver inget annat — inte ens ditt namn.',
              },
              {
                num: '2',
                icon: Download,
                title: 'Få boken direkt',
                body: 'Du kommer till en sida där du laddar ner PDF:en på sekunden. Vi skickar även en kopia per mejl.',
              },
              {
                num: '3',
                icon: Wine,
                title: 'Öppna en flaska',
                body: 'Läs igenom på ~20 min, prova metoden på närmaste vin. Du märker skillnaden direkt.',
              },
            ].map((s) => (
              <li
                key={s.num}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`${HEADING} text-3xl text-brand-400`}
                    style={{ letterSpacing: '0.02em' }}
                  >
                    {s.num}
                  </span>
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className={`${HEADING} text-xl`}>{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              FAQ
            </span>
            <h2 className={`${HEADING} mt-3 text-3xl md:text-4xl`}>
              Vanliga frågor
            </h2>
          </div>

          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-border py-20 lg:py-28">
        <div
          className="pointer-events-none absolute -bottom-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.12] blur-[120px]"
          style={{ background: GRADIENT }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
            <span className="h-px w-8 bg-brand-400" aria-hidden />
            Gratis · 14 sidor
            <span className="h-px w-8 bg-brand-400" aria-hidden />
          </span>

          <h2 className={`${HEADING} mt-6 text-4xl md:text-5xl`}>
            Redo att börja?
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: GRADIENT }}
            >
              Ladda ner boken.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            En e-postadress räcker. Du får boken direkt och ett nyhetsbrev i veckan
            med tre viner vi älskar just nu.
          </p>

          <div className="mt-10 flex justify-center">
            <EbookSignupForm slug={SLUG} variant="on-paper" />
          </div>

          <p className="mt-6 text-[12px] text-muted-foreground">
            Är du redan prenumerant?{' '}
            <Link href={`/${SLUG}/tack`} className="underline underline-offset-4 hover:text-brand-400">
              Ladda ner direkt här
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* BookCover — stylized A4 cover preview matching the e-book design          */
/* ────────────────────────────────────────────────────────────────────────── */

function BookCover() {
  return (
    <div className="relative">
      {/* spine shadow behind the cover */}
      <div
        className="absolute -bottom-3 -right-3 left-3 top-3 -z-10 rounded-[18px] opacity-50 blur-2xl"
        style={{ background: GRADIENT }}
        aria-hidden
      />

      <div
        className="relative aspect-[210/297] w-full overflow-hidden rounded-[14px] border border-[#e9e1d3] shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 30% 25%, rgba(253,186,117,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(251,145,76,0.18), transparent 60%), #fbf8f4',
        }}
      >
        {/* soft inner blobs */}
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: ORANGE_300 }}
          aria-hidden
        />

        {/* page-padding */}
        <div className="relative flex h-full w-full flex-col p-8 sm:p-10">
          {/* top brand row */}
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-[15px] leading-none"
                style={{
                  fontFamily: 'Coolvetica, Arial, sans-serif',
                  letterSpacing: '0.02em',
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Vinakademin
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#968a7e]">
                E-bok · 2026
              </div>
            </div>
            <div className="text-right text-[8px] font-semibold uppercase tracking-[0.18em] text-[#968a7e]">
              No. 01
            </div>
          </div>

          {/* center title */}
          <div className="mt-auto">
            <span className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-400">
              <span className="h-px w-7 bg-brand-400" aria-hidden />
              Grunderna i vin
            </span>

            <h2
              className="mt-5"
              style={{
                fontFamily: 'Coolvetica, Arial, sans-serif',
                fontSize: 'clamp(34px, 7vw, 52px)',
                lineHeight: 0.96,
                letterSpacing: '0.02em',
                color: '#1a1714',
                textWrap: 'balance' as never,
              }}
            >
              Det enda
              <br />
              du behöver
              <br />
              <span
                style={{
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: ORANGE_400,
                }}
              >
                veta om vin.
              </span>
            </h2>

            <p
              className="mt-5 text-[12px] italic leading-[1.4] text-[#5a5048]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              En kickstart till vinens värld — i 5 korta delar.
            </p>
          </div>

          {/* footer */}
          <div className="mt-auto flex items-center justify-between border-t border-[#e9e1d3] pt-4">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#968a7e]">
              <BookOpen className="h-3 w-3 text-brand-400" />
              5 delar · 14 sidor
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#968a7e]">
              <Clock className="h-3 w-3 text-brand-400" />
              ~20 min
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
