import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Heart,
  Lightbulb,
  Users,
  Target,
  Sparkles,
  Wine,
  BookOpen,
  ArrowRight,
  Quote,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Om Oss | Vinakademin',
  description:
    'Möt grundarna bakom Vinakademin och läs om vår resa att göra vinkunskap tillgänglig för alla.',
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
  { number: '300+', label: 'prenumeranter' },
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Heart className="h-3.5 w-3.5 mr-1" />
            Vår historia
          </Badge>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">Om Vinakademin</h1>
          <p className="text-xl text-muted-foreground">
            Vi gör vinkunskap enkelt, opretentiöst och roligt – genom att smaka, uppleva och dela
            vår passion.
          </p>
        </div>

        {/* Hero Image Placeholder */}
        <div className="relative rounded-lg overflow-hidden mb-16 aspect-[21/9] bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Wine className="h-16 w-16 mx-auto text-orange-500/50" />
              <p className="text-sm text-muted-foreground">
                Plats för hero-bild av grundarna / team
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Our Story */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-medium tracking-tight">Vår resa</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Från första Instagram-inlägget till att lansera vår egen plattform för digitala
                vinprovningar
              </p>
            </div>

            <Card className="border-orange-200 dark:border-orange-900">
              <CardContent className="p-8 md:p-12">
                <Quote className="h-8 w-8 text-orange-500/50 mb-6" />
                <div className="space-y-6 text-lg leading-relaxed">
                  <p>
                    Vi fastnade för vin och hur mycket bättre det smakar när man förstår vad man
                    dricker. Djupet av historier, stilar och sorter är enormt. Efter att ha gått en
                    vinkurs ville vi lära oss mer, men vi hittade inga resurser som passade oss.
                  </p>
                  <p>
                    Så vi bestämde oss för att skapa det vi saknade: en plats där vinkunskap är
                    enkelt och opretentiöst. Där du kan lära dig genom att faktiskt smaka och
                    uppleva – utan pretentioner eller krångel.
                  </p>
                  <p>
                    De senaste tre åren har vi delat vår passion via Instagram och TikTok, skapat
                    hundratals videos, och lärt oss mer om vin varje dag. Men tanken har alltid
                    varit densamma: göra vinkunskap tillgängligt genom att smaka. Vinprovningar blir
                    det självklara svaret – men hur kan vi göra dem bättre? Roligare, enklare, mer
                    tillgängliga. Det är det vi löser med Vinakademin.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-medium tracking-tight">Milstolpar</h2>
            <p className="text-lg text-muted-foreground">Vår utveckling från start till idag</p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="relative">
                {index < milestones.length - 1 && (
                  <div className="absolute left-[19px] top-12 bottom-0 w-0.5 bg-orange-200 dark:bg-orange-900 -mb-8" />
                )}
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950 border-2 border-orange-500 flex items-center justify-center font-bold text-sm text-orange-600 dark:text-orange-400">
                    {milestone.year.slice(-2)}
                  </div>
                  <Card className="flex-1">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {milestone.year}
                        </Badge>
                        <h3 className="font-semibold text-lg">{milestone.title}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
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
        <div className="mb-16">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-medium tracking-tight">Våra värderingar</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dessa principer guidar allt vi gör
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center">
                <CardContent className="p-6 space-y-4">
                  <div className="inline-flex p-3 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <value.icon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Founders Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-medium tracking-tight">Grundarna</h2>
            <p className="text-lg text-muted-foreground">Möt personerna bakom Vinakademin</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Founder 1 */}
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center">
                  <Users className="h-12 w-12 text-orange-500/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">[Grundare 1 Namn]</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Medgrundare & VD</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  [Beskrivning av grundare 1 - bakgrund, passion för vin, roll på Vinakademin, och
                  vad hen brinner mest för.]
                </p>
              </CardContent>
            </Card>

            {/* Founder 2 */}
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center">
                  <Users className="h-12 w-12 text-orange-500/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">[Grundare 2 Namn]</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Medgrundare & COO</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  [Beskrivning av grundare 2 - bakgrund, passion för vin, roll på Vinakademin, och
                  vad hen brinner mest för.]
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vision */}
        <div className="max-w-3xl mx-auto mb-16">
          <Card className="border-2 border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
            <CardContent className="p-8 md:p-12 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-orange-100 dark:bg-orange-950">
                <Sparkles className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-medium tracking-tight">Vår vision</h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Vi vill göra vinkunskap enkelt och opretentiöst för alla. En plats där du lär dig
                  genom att smaka, uppleva och utforska – utan krångel eller pretentioner.
                  Vinprovningar ska vara roliga, tillgängliga och minnesvärd. Vinakademin ska vara
                  den självklara platsen för alla som vill upptäcka vinvärlden på riktigt.
                </p>
              </div>
              <Separator className="my-6" />
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/vinprovningar">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Utforska våra kurser
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/kontakt">
                    Kontakta oss
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
