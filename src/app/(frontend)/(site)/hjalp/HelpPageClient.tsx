'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Mail,
  MessageSquare,
  HelpCircle,
  BookOpen,
  CreditCard,
  Settings,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

const faqSections = [
  {
    category: 'Konto & Inloggning',
    icon: Settings,
    questions: [
      {
        q: 'Hur skapar jag ett konto?',
        a: 'Klicka på "Logga in" i menyn och välj "Skapa konto". Fyll i dina uppgifter och verifiera din e-postadress. Du kan sedan börja utforska våra gratis moment direkt.',
      },
      {
        q: 'Jag har glömt mitt lösenord, vad gör jag?',
        a: 'Klicka på "Glömt lösenord?" på inloggningssidan. Ange din e-postadress så skickar vi en återställningslänk. Länken är giltig i 1 timme.',
      },
      {
        q: 'Hur ändrar jag mina profiluppgifter?',
        a: 'Gå till din profil genom att klicka på ditt namn i menyn. Under fliken "Profiluppgifter" kan du uppdatera namn, e-post, profilbild och övrig information.',
      },
      {
        q: 'Kan jag ta bort mitt konto?',
        a: 'Ja, under "Kontoinställningar" i din profil finns ett alternativ för att radera ditt konto. Observera att all din data raderas permanent och att detta inte kan ångras.',
      },
    ],
  },
  {
    category: 'Vinprovningar',
    icon: BookOpen,
    questions: [
      {
        q: 'Vad är skillnaden mellan gratis och betalda vinprovningar?',
        a: 'Alla vinprovningar har gratis moment som du kan prova direkt. Fullständig tillgång till alla lektioner och quiz kräver ett engångsköp. Du äger vinprovningen för alltid när du köpt den.',
      },
      {
        q: 'Hur fungerar gruppsessioner?',
        a: 'Om du köpt en vinprovning kan du starta en gruppsession och bjuda in gäster med en kod. Gästerna får tillfällig tillgång till hela vinprovningen under sessionens längd. Perfekt för provningar tillsammans med vänner!',
      },
      {
        q: 'Kan jag gå vinprovningen i min egen takt?',
        a: 'Absolut! När du köpt en vinprovning har du livstid tillgång. Du kan pausa och återuppta när det passar dig.',
      },
      {
        q: 'Hur lång är en typisk vinprovning?',
        a: 'Det varierar beroende på vinprovning, men de flesta tar 1-3 timmar att genomföra om du går dem i ett svep. Du ser exakt längd på varje vinprovnings översiktssida.',
      },
    ],
  },
  {
    category: 'Betalning & Fakturering',
    icon: CreditCard,
    questions: [
      {
        q: 'Vilka betalmetoder accepterar ni?',
        a: 'Vi accepterar alla större betalkort (Visa, Mastercard, American Express) samt Swish via vår betalpartner Stripe. Alla transaktioner är säkra och krypterade.',
      },
      {
        q: 'Får jag en faktura?',
        a: 'Ja, du får automatiskt en kvitto via e-post efter varje köp. Du hittar också alla dina fakturor under "Betalningar" i din profil.',
      },
      {
        q: 'Har ni återbetalning?',
        a: 'Ja, vi erbjuder 30 dagars nöjd-kund-garanti. Om du inte är nöjd med en vinprovning kan du kontakta oss för full återbetalning, utan krångel.',
      },
      {
        q: 'Kan jag köpa som företag?',
        a: 'Ja, vi kan utfärda företagsfakturor. Kontakta oss på support@vinakademin.se så hjälper vi dig med företagsavtal och fakturering.',
      },
    ],
  },
  {
    category: 'Teknisk Support',
    icon: AlertCircle,
    questions: [
      {
        q: 'Videon spelas inte upp, vad gör jag?',
        a: 'Kontrollera först din internetanslutning. Prova att uppdatera sidan (Ctrl/Cmd + R). Om problemet kvarstår, testa en annan webbläsare. Vi rekommenderar Chrome, Safari eller Firefox i senaste versionen.',
      },
      {
        q: 'Fungerar sidan på mobil och surfplatta?',
        a: 'Ja! Hela Vinakademin är optimerad för mobil, surfplatta och dator. Du kan enkelt byta mellan enheter och fortsätta där du slutade.',
      },
      {
        q: 'Hur sparas mitt framsteg?',
        a: 'Ditt framsteg sparas automatiskt när du slutför lektioner och quiz. Du kan när som helst logga in från vilken enhet som helst och fortsätta där du var.',
      },
      {
        q: 'Jag får felmeddelande när jag försöker logga in',
        a: 'Rensa din webbläsares cache och cookies, eller prova i ett inkognito-/privat läge. Om problemet kvarstår, kontakta vår support.',
      },
    ],
  },
]

export function HelpPageClient() {
  return (
    <div className="container mx-auto px-4 py-10 min-w-0 max-w-5xl">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold">Hjälpcenter</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Hitta svar på vanliga frågor eller kontakta oss om du behöver mer hjälp.
        </p>
      </div>

      {/* Quick Contact Alert */}
      <Alert className="mb-8">
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Hittar du inte svar på din fråga?</AlertTitle>
        <AlertDescription>
          Kontakta oss på{' '}
          <a href="mailto:support@vinakademin.se" className="underline font-medium">
            support@vinakademin.se
          </a>{' '}
          så hjälper vi dig så fort vi kan.
        </AlertDescription>
      </Alert>

      {/* FAQ Sections */}
      <div className="space-y-6 mb-10">
        {faqSections.map((section, idx) => {
          const Icon = section.icon
          return (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-secondary" />
                  <CardTitle className="text-xl">{section.category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                      <AccordionTrigger className="text-left font-medium">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator className="my-10" />

      {/* Contact & Resources Section */}
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-secondary" />
              <div>
                <CardTitle>E-postsupport</CardTitle>
                <CardDescription>Vi svarar så snabbt vi kan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Skicka ett mail till oss så återkommer vi så snart vi kan. Inkludera gärna skärmdumpar
              om det gäller ett tekniskt problem.
            </p>
            <Button variant="secondary" asChild className="w-full">
              <a href="mailto:support@vinakademin.se">
                <Mail className="mr-2 h-4 w-4" />
                support@vinakademin.se
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-secondary" />
              <div>
                <CardTitle>Snabblänkar</CardTitle>
                <CardDescription>Användbar information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/profil?tab=uppgifter"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium">Min Profil</span>
              <Badge variant="outline">Konto</Badge>
            </Link>
            <Link
              href="/vinprovningar"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium">Alla Vinprovningar</span>
              <Badge variant="outline">Kurser</Badge>
            </Link>
            <Link
              href="/artiklar"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="text-sm font-medium">Artiklar & Guider</span>
              <Badge variant="outline">Läsning</Badge>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
