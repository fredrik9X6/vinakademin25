import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookiepolicy | Vinakademin',
  description:
    'Läs om hur Vinakademin använder cookies för att förbättra din upplevelse på vår webbplats.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookiepolicy</h1>
          <p className="text-lg text-muted-foreground">
            Senast uppdaterad:{' '}
            {new Date().toLocaleDateString('sv-SE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="space-y-8">
          {/* Intro */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-base leading-7">
                Vinakademin använder cookies och liknande tekniker för att förbättra din upplevelse
                på vår webbplats. Den här policyn förklarar vilka cookies vi använder, varför vi
                använder dem och hur du kan hantera dina inställningar.
              </p>
            </CardContent>
          </Card>

          {/* Vad är cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Vad är cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Cookies är små textfiler som lagras på din enhet (dator, mobil eller surfplatta) när
                du besöker en webbplats. De hjälper webbplatsen att komma ihåg dina val och
                preferenser, vilket gör din upplevelse smidigare och mer personlig.
              </p>
              <p className="text-base leading-7">
                Cookies kan vara temporära (sessionscookies) som försvinner när du stänger
                webbläsaren, eller permanenta som stannar kvar under en längre period.
              </p>
            </CardContent>
          </Card>

          {/* Vilka cookies vi använder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Vilka cookies använder vi?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nödvändiga cookies */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Nödvändiga cookies</h3>
                <p className="text-base leading-7 mb-3">
                  Dessa cookies är avgörande för att webbplatsen ska fungera korrekt. De möjliggör
                  grundläggande funktioner som säkerhet, nätverkshantering och tillgänglighet.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>
                    <strong>Autentisering:</strong> Håller dig inloggad när du navigerar mellan
                    sidor
                  </li>
                  <li>
                    <strong>Säkerhet:</strong> Skyddar mot obehörig åtkomst och bedrägerier
                  </li>
                  <li>
                    <strong>Sessionshantering:</strong> Håller reda på din session under besöket
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Funktionella cookies */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Funktionella cookies</h3>
                <p className="text-base leading-7 mb-3">
                  Dessa cookies gör det möjligt för oss att komma ihåg dina val och preferenser för
                  att ge dig en bättre och mer personlig upplevelse.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>
                    <strong>Tema:</strong> Kommer ihåg om du föredrar ljust eller mörkt läge
                  </li>
                  <li>
                    <strong>Kursframsteg:</strong> Håller reda på var du är i en vinprovning
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Analytiska cookies */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Analytiska cookies</h3>
                <p className="text-base leading-7 mb-3">
                  Vi använder analytiska cookies för att förstå hur besökare interagerar med vår
                  webbplats. Detta hjälper oss att förbättra innehåll och funktionalitet.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>
                    <strong>Besöksstatistik:</strong> Antal besökare och populära sidor
                  </li>
                  <li>
                    <strong>Användarbeteende:</strong> Hur användare navigerar på webbplatsen
                  </li>
                  <li>
                    <strong>Prestandamätning:</strong> Laddningstider och tekniska problem
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Hantera cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Hur hanterar jag cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Du kan när som helst ändra dina cookie-inställningar i din webbläsare. De flesta
                webbläsare tillåter dig att:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Se vilka cookies som är lagrade</li>
                <li>Ta bort alla eller specifika cookies</li>
                <li>Blockera cookies från alla eller specifika webbplatser</li>
                <li>Få en varning innan en cookie lagras</li>
              </ul>
              <p className="text-base leading-7 text-muted-foreground">
                <strong>OBS:</strong> Om du blockerar nödvändiga cookies kan vissa delar av
                webbplatsen sluta fungera korrekt. Du kanske inte kan logga in eller använda alla
                funktioner.
              </p>
            </CardContent>
          </Card>

          {/* Tredjepartscookies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Tredjepartscookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi kan använda tjänster från tredje part som sätter sina egna cookies, till exempel:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>
                  <strong>Stripe:</strong> För säker betalningshantering
                </li>
                <li>
                  <strong>Mux:</strong> För videostreaming och uppspelning
                </li>
              </ul>
              <p className="text-base leading-7">
                Dessa tjänster har sina egna integritetspolicyer och vi rekommenderar att du läser
                dem för att förstå hur de hanterar dina uppgifter.
              </p>
            </CardContent>
          </Card>

          {/* Kontakt och uppdateringar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Ändringar i policyn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi kan uppdatera denna cookiepolicy när vi ändrar hur vi använder cookies eller när
                lagstiftningen ändras. Den senaste versionen finns alltid tillgänglig på denna sida.
              </p>
              <p className="text-base leading-7">
                Om du har frågor om vår användning av cookies, kontakta oss gärna på{' '}
                <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                  support@vinakademin.se
                </a>
                .
              </p>
            </CardContent>
          </Card>

          {/* Footer links */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground">
              Relaterade dokument:{' '}
              <Link href="/integritetspolicy" className="text-primary hover:underline">
                Integritetspolicy
              </Link>{' '}
              •{' '}
              <Link href="/villkor" className="text-primary hover:underline">
                Användarvillkor
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
