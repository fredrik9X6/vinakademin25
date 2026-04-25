import { Metadata } from 'next'
import { getSiteURL } from '@/lib/site-url'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Heart,
  Lightbulb,
  Users,
  Target,
  Sparkles,
  BookOpen,
  ArrowRight,
  Quote,
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Om Oss | Vinakademin',
  description:
    'Möt grundarna bakom Vinakademin och läs om vår resa att göra vinkunskap tillgänglig för alla.',
  alternates: { canonical: `${getSiteURL()}/om-oss` },
}

const values = [
  {
    icon: Heart,
    title: 'Passion för vin',
    description: 'Vi brinner för att dela med oss av glädjen av vin och dess historia.',
  },
  {
    icon: Lightbulb,
    title: 'Kunskap för alla',
    description: 'Vin ska inte vara komplicerat. Vi gör det enkelt att lära sig och njuta.',
  },
  {
    icon: Users,
    title: 'Gemenskap',
    description: 'Vi skapar upplevelser som förenar människor över en flaska vin och goda samtal.',
  },
  {
    icon: Target,
    title: 'Kvalitet först',
    description: 'Våra vinprovningar är noggrant utformade för att skapa en unik upplevelse.',
  },
]

const stats = [
  { number: '2M+', label: 'Visningar i sociala medier' },
  { number: '15k+', label: 'Följare' },
  { number: '300+', label: 'Prenumeranter' },
  { number: '100+', label: 'Videos producerade' },
]

const milestones = [
  {
    year: '2022',
    title: 'Början',
    description:
      'Vi började dela vår passion för vin på Instagram. Först inlägg, sedan videos. Idén var enkel: göra vinkunskap tillgänglig och rolig, utan pretentioner.',
  },
  {
    year: '2023',
    title: 'TikTok & Blogg',
    description:
      'Vi expanderade till TikTok och lanserade vår blogg. Videos blev vårt signum – kort, pedagogiskt och alltid fokuserat på att faktiskt smaka och uppleva vin.',
  },
  {
    year: '2024',
    title: 'Företag upptäcker oss',
    description:
      'Företag började höra av sig. Vi utforskade olika sätt att arbeta med dem – skräddarsydda vinprovningar för teambuilding och event blev populärt.',
  },
  {
    year: '2025',
    title: 'Vinakademin bildas',
    description:
      'Vi tecknade Vinakademin som eget företag och lanserar vår första produkt: digitala vinprovningar online. Äntligen kan fler uppleva vad vi älskar.',
  },
]

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Decorative orange blobs — signature pattern */}
      <div
        className="pointer-events-none absolute left-10 top-32 h-72 w-72 rounded-full blur-3xl"
        aria-hidden
        style={{ background: 'hsl(var(--brand-300))', opacity: 0.05 }}
      />
      <div
        className="pointer-events-none absolute right-10 top-[40rem] h-72 w-72 rounded-full blur-3xl"
        aria-hidden
        style={{ background: 'hsl(var(--brand-400))', opacity: 0.05 }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-brand-300/40 bg-brand-300/10 text-brand-400"
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            Vår historia
          </Badge>
          <h1 className="mb-5 text-4xl leading-[1.05] text-foreground md:text-5xl lg:text-6xl">
            Om <span className="text-brand-gradient">Vinakademin</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Vi gör vinkunskap enkelt, opretentiöst och roligt — genom att smaka, uppleva och dela
            vårt intresse för vin.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-20 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="p-6 text-center">
                <div className="text-brand-gradient mb-2 font-heading text-4xl md:text-5xl">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Our Story */}
        <div className="mx-auto mb-20 max-w-4xl">
          <div className="space-y-8">
            <div className="space-y-3 text-center">
              <h2 className="text-3xl font-medium md:text-4xl">Vår resa</h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Från första Instagram-inlägget till att lansera vår egen plattform för digitala
                vinprovningar
              </p>
            </div>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-8 md:p-12">
                <Quote className="mb-6 h-8 w-8 text-brand-400/60" />
                <div className="space-y-6 text-lg leading-relaxed">
                  <p>
                    Vi fastnade för vin och hur mycket bättre det smakar när man förstår vad man
                    dricker. Djupet av historier, stilar och sorter är enormt. Efter att ha gått en
                    vinkurs ville vi lära oss mer, men vi hittade inga resurser som passade oss.
                  </p>
                  <p>
                    Så vi bestämde oss för att skapa det vi saknade: en plats där vinkunskap är
                    enkelt och opretentiöst. Där du kan lära dig genom att faktiskt smaka och
                    uppleva, det ska vara enkelt och roligt.
                  </p>
                  <p>
                    De senaste tre åren har vi delat vårt vinintresse via Instagram och TikTok,
                    skapat hundratals videos, och lärt oss mer om vin varje dag. Men tanken har
                    alltid varit densamma: göra vinkunskap tillgängligt genom att smaka och
                    uppleva. Vinprovningar blir det självklara svaret — men hur kan vi göra dem
                    bättre? Roligare, enklare, mer tillgängliga. Det är det vi löser med Vinakademin.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <div className="mx-auto mb-20 max-w-4xl">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="text-3xl font-medium md:text-4xl">Milstolpar</h2>
            <p className="text-lg text-muted-foreground">Vår utveckling från start till idag</p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="relative">
                {index < milestones.length - 1 && (
                  <div
                    className="absolute -mb-8 w-0.5"
                    aria-hidden
                    style={{
                      left: '19px',
                      top: '40px',
                      bottom: 0,
                      background:
                        'linear-gradient(to bottom, hsl(var(--brand-400)) 0%, hsl(var(--border)) 100%)',
                      opacity: 0.6,
                    }}
                  />
                )}
                <div className="flex items-start gap-6">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand-400 bg-brand-300/10 text-sm font-semibold text-brand-400">
                    {milestone.year.slice(-2)}
                  </div>
                  <Card className="flex-1 border-border bg-card">
                    <CardContent className="p-6">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {milestone.year}
                        </Badge>
                        <h3 className="text-lg font-medium">{milestone.title}</h3>
                      </div>
                      <p className="leading-relaxed text-muted-foreground">
                        {milestone.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="text-3xl font-medium md:text-4xl">Våra värderingar</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Dessa principer guidar allt vi gör
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <Card
                key={value.title}
                className="border-border bg-card text-center transition-shadow hover:shadow-lg"
              >
                <CardContent className="space-y-4 p-6">
                  <div className="inline-flex rounded-lg bg-brand-300/10 p-3">
                    <value.icon className="h-6 w-6 text-brand-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">{value.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Founders */}
        <div className="mx-auto mb-20 max-w-4xl">
          <div className="mb-12 space-y-3 text-center">
            <h2 className="text-3xl font-medium md:text-4xl">Grundarna</h2>
            <p className="text-lg text-muted-foreground">Bakom (och framför) kulisserna</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Founder 1 */}
            <Card className="border-border bg-card">
              <CardContent className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-brand-gradient-diagonal p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                    <Users className="h-12 w-12 text-brand-400/70" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Fredrik Gustafson</h3>
                  <p className="text-sm font-medium text-brand-400">Bakom kulisserna</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Med intresse för video, teknik och vin skapar Fredrik allt som behövs för att
                  Vinakademin ska fungera. Ibland dyker han upp i videos, men mestadels är han
                  bakom kameran.
                </p>
              </CardContent>
            </Card>

            {/* Founder 2 */}
            <Card className="border-border bg-card">
              <CardContent className="space-y-4 p-8 text-center">
                <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-brand-gradient-diagonal p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                    <Users className="h-12 w-12 text-brand-400/70" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Max Eriksson</h3>
                  <p className="text-sm font-medium text-brand-400">Framför kameran</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Med ett stort intresse för vin och författande skapar Max videos, artiklar,
                  vinprovningar och mer eller mindre allt innehåll som Vinakademin producerar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vision */}
        <div className="mx-auto max-w-3xl">
          <div className="bg-brand-gradient-tri rounded-2xl p-0.5 shadow-brand-glow">
            <div className="rounded-[14px] bg-card">
              <CardContent className="space-y-6 p-8 text-center md:p-12">
                <div className="inline-flex rounded-full bg-brand-gradient-diagonal p-0.5">
                  <div className="rounded-full bg-card p-3.5">
                    <Sparkles className="h-7 w-7 text-brand-400" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl font-medium md:text-3xl">Vår vision</h2>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Vi vill göra vinkunskap enkelt och opretentiöst för alla. En plats där du lär
                    dig genom att smaka, uppleva och utforska vinets värld. Vinprovningar ska vara
                    roliga, tillgängliga och minnesvärda. Vinakademin ska vara den självklara
                    platsen för alla som vill upptäcka vinvärlden och lära sig mer om vin.
                  </p>
                </div>
                <Separator className="my-6" />
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/vinprovningar" className="btn-brand btn-brand-lg">
                    <BookOpen className="mr-1 h-4 w-4" />
                    Utforska våra vinprovningar
                  </Link>
                  <Link
                    href="/kontakt"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-background px-8 text-base font-medium transition-colors hover:border-brand-400/50 hover:bg-brand-300/5"
                  >
                    Kontakta oss
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
