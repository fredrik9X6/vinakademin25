import { Metadata } from 'next'
import { NewsletterSignupBlock } from '@/components/blocks/NewsletterSignupBlock'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Clock, Star, Users, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nyhetsbrev - Vinakademin',
  description:
    'Få veckans bästa vintips, smaknoter och expertråd direkt i din inbox. Gratis och lärorikt för alla som älskar vin.',
  openGraph: {
    title: 'Vinakademins Nyhetsbrev - Veckans Vintips',
    description: 'Få veckans bästa vintips, smaknoter och expertråd direkt i din inbox.',
    type: 'website',
  },
}

const testimonials = [
  {
    quote: 'Varje vecka lär jag mig något nytt. Enkelt, tydligt och alltid användbart.',
    author: 'Maria L.',
    role: 'Prenumerant sedan 2023',
  },
  {
    quote: 'Slutligen en vinexpert som inte låter pretentiös. Rakt på sak och alltid hjälpsam.',
    author: 'Erik S.',
    role: 'Prenumerant sedan 2022',
  },
  {
    quote: 'Mina middagsbjudningar blev hundra gånger bättre tack vare era vinrekommendationer.',
    author: 'Anna K.',
    role: 'Prenumerant sedan 2023',
  },
]

const features = [
  {
    icon: Clock,
    title: 'Kort & koncis',
    description: 'En läsning på 3 minuter. Aldrig längre än nödvändigt.',
  },
  {
    icon: Star,
    title: 'Handplockade tips',
    description: 'Bara det bästa vi har hittat nyligen. Vi testar så du slipper.',
  },
  {
    icon: Users,
    title: '70%+ öppningsgrad',
    description: 'Våra läsare älskar det vi skickar. Branschsnittet är 25%.',
  },
]

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 min-w-0">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-medium text-foreground mb-4">Nyhetsbrev</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Lär dig om vin utan flum. Varje torsdag får du konkreta tips som gör dig till en
              bättre vinälskare.
            </p>
          </div>

          {/* Newsletter Signup */}
          <div className="mb-16">
            <NewsletterSignupBlock
              title="Börja idag"
              description="Inga långa artiklar. Ingen pretentiös jargong. Bara användbara råd som fungerar."
              buttonText="Skicka mig vintips"
              placeholderText="Din e-postadress"
              style="minimal"
              backgroundColor="transparent"
              disclaimer="Gratis för alltid. Avsluta prenumerationen när du vill."
            />
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <feature.icon className="h-8 w-8 text-secondary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* What You Get Section */}
      <div className="bg-background py-16">
        <div className="container mx-auto px-4 min-w-0">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-medium text-center text-foreground mb-12">
              Vad får du i varje nyhetsbrev?
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <ChevronRight className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    3 viner vi älskar just nu
                  </h3>
                  <p className="text-muted-foreground">
                    Vi testar och rekommenderar alltid tre viner vi nyligen har upptäckt och
                    verkligen gillar. Med äkta smaknoter och var du hittar dem.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <ChevronRight className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Mat- och vinkombos</h3>
                  <p className="text-muted-foreground">
                    Konkreta förslag på vad som passar till middagen. Inte bara &ldquo;kött och
                    fisk&rdquo; utan specifika rätter som verkligen funkar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <ChevronRight className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Roligt citat & extra godbitar
                  </h3>
                  <p className="text-muted-foreground">
                    Ett kul citat om vin, länkar till intressanta artiklar, och andra upptäckter som
                    gör dig lite klokare på vin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 bg-background">
        <div className="container mx-auto px-4 min-w-0">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-medium text-center text-foreground mb-12">
              Vad säger läsarna?
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-card">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-4 italic">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="border-t border-border pt-4">
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center min-w-0">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-medium mb-6">Redo att bli bättre på vin?</h2>
            <p className="text-lg mb-8 text-muted-foreground">
              Anslut dig till vår community av vinentusiaster som förvandlar sina middagar.
            </p>

            <NewsletterSignupBlock
              title=""
              description=""
              buttonText="Ja, skicka mig vintips"
              placeholderText="Din e-postadress"
              style="minimal"
              backgroundColor="transparent"
              disclaimer="Helt gratis. Avsluta när du vill."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
