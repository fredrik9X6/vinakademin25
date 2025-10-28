import { Metadata } from 'next'
import { ContactForm } from './ContactForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, HelpCircle, Users, BookOpen, Wine, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kontakta Oss | Vinakademin',
  description:
    'Har du frågor om våra kurser eller vinprovningar? Kontakta Vinakademin via e-post så hjälper vi dig gärna.',
}

const reasons = [
  {
    icon: BookOpen,
    title: 'Kursfrågor',
    description: 'Hjälp med kurser, inloggning eller tekniska problem',
  },
  {
    icon: Wine,
    title: 'Vinprovningar',
    description: 'Frågor om vinprovningar och bokningar',
  },
  {
    icon: Users,
    title: 'Företag & Grupper',
    description: 'Skräddarsydda kurser och event för företag',
  },
  {
    icon: HelpCircle,
    title: 'Annat',
    description: 'Övriga frågor, samarbeten eller feedback',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">Kontakta oss</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Har du frågor om våra kurser, vinprovningar eller vill bara säga hej? Skicka oss ett
            meddelande så återkommer vi inom 24 timmar.
          </p>
        </div>

        {/* Email Contact Card */}
        <div className="max-w-md mx-auto mb-12">
          <a href="mailto:hej@vinakademin.se" className="group block">
            <Card className="border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 rounded-lg bg-orange-100 dark:bg-orange-950">
                  <Mail className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-xl">E-post</h3>
                  <p className="text-sm text-muted-foreground">
                    Vi svarar vanligtvis inom 24 timmar
                  </p>
                </div>
                <p className="text-lg font-medium text-orange-600 dark:text-orange-400">
                  hej@vinakademin.se
                </p>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Contact Form - 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* What can we help you with? */}
            <div>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight mb-3">
                Skicka oss ett meddelande
              </h2>
              <p className="text-muted-foreground mb-6">
                Fyll i formuläret så återkommer vi inom 24 timmar på vardagar.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {reasons.map((reason) => (
                  <Card key={reason.title} className="border-muted">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex-shrink-0">
                        <reason.icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-medium text-sm">{reason.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {reason.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form */}
            <ContactForm />
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-8">
            {/* FAQ Link */}
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                    <HelpCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle>Vanliga frågor</CardTitle>
                </div>
                <CardDescription>Snabba svar på vanliga frågor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Innan du kontaktar oss, kolla gärna in vår hjälpsida där vi samlar svar på de
                  vanligaste frågorna om kurser, vinprovningar, betalning och mycket mer.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/hjalp">
                    Se vanliga frågor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bra att veta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Vi svarar på e-post vanligtvis inom 24 timmar på vardagar
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    För snabbare svar, kolla först in vår{' '}
                    <Link href="/hjalp" className="text-orange-600 dark:text-orange-400 underline">
                      hjälpsida
                    </Link>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Alla våra kurser är digitala och tillgängliga direkt efter köp
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
