import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Integritetspolicy | Vinakademin',
  description: 'Läs om hur Vinakademin samlar in, använder och skyddar dina personuppgifter.',
}

export default function IntegritetspolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Integritetspolicy</h1>
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
                På Vinakademin tar vi din integritet på allvar. Den här policyn förklarar hur vi
                samlar in, använder, lagrar och skyddar dina personuppgifter. Vi följer
                Dataskyddsförordningen (GDPR) och annan tillämplig lagstiftning.
              </p>
            </CardContent>
          </Card>

          {/* Personuppgiftsansvarig */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">1. Personuppgiftsansvarig</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vinakademin är personuppgiftsansvarig för behandlingen av dina personuppgifter. Vi
                ansvarar för att dina uppgifter hanteras på ett säkert och lagligt sätt.
              </p>
              <ul className="list-none space-y-2 text-base leading-7">
                <li>
                  <strong>Kontakt:</strong>{' '}
                  <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                    support@vinakademin.se
                  </a>
                </li>
                <li>
                  <strong>Webbplats:</strong> vinakademin.se
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Vilka uppgifter samlar vi in */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">2. Vilka personuppgifter samlar vi in?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Uppgifter du ger oss</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>
                    <strong>Kontoinformation:</strong> Namn, e-postadress, lösenord (krypterat)
                  </li>
                  <li>
                    <strong>Profiluppgifter:</strong> Profilbild, preferenser, biografisk
                    information
                  </li>
                  <li>
                    <strong>Betalningsuppgifter:</strong> Fakturaadress (kortuppgifter hanteras av
                    Stripe och lagras inte hos oss)
                  </li>
                  <li>
                    <strong>Innehåll du skapar:</strong> Vinrecensioner, anteckningar, quiz-svar
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">Uppgifter vi samlar in automatiskt</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>
                    <strong>Användningsdata:</strong> Vilka sidor du besöker, hur länge, vilka
                    funktioner du använder
                  </li>
                  <li>
                    <strong>Teknisk information:</strong> IP-adress, webbläsartyp, enhet,
                    operativsystem
                  </li>
                  <li>
                    <strong>Kursframsteg:</strong> Vilka lektioner du genomfört, quiz-resultat,
                    tidsåtgång
                  </li>
                  <li>
                    <strong>Cookies:</strong> Se vår{' '}
                    <Link href="/cookies" className="text-primary hover:underline">
                      cookiepolicy
                    </Link>{' '}
                    för detaljer
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Varför samlar vi in uppgifter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">3. Varför samlar vi in dina uppgifter?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">För att tillhandahålla tjänsten</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>Skapa och hantera ditt konto</li>
                  <li>Ge dig åtkomst till köpta vinprovningar</li>
                  <li>Spara ditt framsteg och dina preferenser</li>
                  <li>Tillhandahålla kundsupport</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">För att hantera betalningar</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>Behandla köp och prenumerationer</li>
                  <li>Skicka kvitton och fakturor</li>
                  <li>Hantera återbetalningar</li>
                  <li>Förhindra bedrägerier</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">För att förbättra tjänsten</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>Analysera hur användare interagerar med plattformen</li>
                  <li>Identifiera och åtgärda tekniska problem</li>
                  <li>Utveckla nya funktioner och innehåll</li>
                  <li>Förbättra användarupplevelsen</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">För marknadsföring</h3>
                <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                  <li>Skicka nyhetsbrev (om du har godkänt det)</li>
                  <li>Informera om nya vinprovningar och funktioner</li>
                  <li>Skicka relevanta erbjudanden</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Delning med tredje part */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">4. Delar vi dina uppgifter med någon?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi säljer aldrig dina personuppgifter. Vi delar endast uppgifter med betrodda
                partners som hjälper oss att leverera tjänsten:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>
                  <strong>Stripe:</strong> Betalningshantering (se{' '}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Stripes integritetspolicy
                  </a>
                  )
                </li>
                <li>
                  <strong>Mux:</strong> Videostreaming och lagring
                </li>
                <li>
                  <strong>E-posttjänst:</strong> För att skicka transaktionsmejl och nyhetsbrev
                </li>
                <li>
                  <strong>Hostingleverantör:</strong> För att driva webbplatsen
                </li>
              </ul>
              <p className="text-base leading-7">
                Alla våra partners är certifierade och följer GDPR. Vi delar endast den information
                som är nödvändig för att de ska kunna utföra sina tjänster.
              </p>
            </CardContent>
          </Card>

          {/* Lagring */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">5. Hur länge lagrar vi dina uppgifter?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi lagrar dina personuppgifter så länge det är nödvändigt för att tillhandahålla
                tjänsten eller så länge lagen kräver:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>
                  <strong>Kontouppgifter:</strong> Så länge ditt konto är aktivt, plus en kort
                  period efter avslutande
                </li>
                <li>
                  <strong>Köphistorik:</strong> 7 år (enligt bokföringslagen)
                </li>
                <li>
                  <strong>Marknadsföringsdata:</strong> Tills du avregistrerar dig eller 24 månader
                  av inaktivitet
                </li>
                <li>
                  <strong>Tekniska loggar:</strong> Maximalt 12 månader
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Säkerhet */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">6. Hur skyddar vi dina uppgifter?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi använder branschstandard säkerhetsåtgärder för att skydda dina uppgifter:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>
                  <strong>Kryptering:</strong> All data överförs via HTTPS (SSL/TLS)
                </li>
                <li>
                  <strong>Lösenord:</strong> Lagras krypterat med moderna hashingalgoritmer
                </li>
                <li>
                  <strong>Åtkomstkontroll:</strong> Begränsad tillgång för personal, endast vid
                  behov
                </li>
                <li>
                  <strong>Säkerhetskopiering:</strong> Regelbundna backuper av databasen
                </li>
                <li>
                  <strong>Övervakning:</strong> Kontinuerlig övervakning för att upptäcka intrång
                </li>
              </ul>
              <p className="text-base leading-7 text-muted-foreground">
                Ingen metod för överföring eller lagring över internet är 100% säker. Vi gör vårt
                bästa för att skydda dina uppgifter, men kan inte garantera absolut säkerhet.
              </p>
            </CardContent>
          </Card>

          {/* Dina rättigheter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">7. Dina rättigheter enligt GDPR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">Du har följande rättigheter:</p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>
                  <strong>Rätt till tillgång:</strong> Be om en kopia av dina personuppgifter
                </li>
                <li>
                  <strong>Rätt till rättelse:</strong> Korrigera felaktiga eller ofullständiga
                  uppgifter
                </li>
                <li>
                  <strong>Rätt till radering:</strong> Be oss radera dina uppgifter ("rätten att bli
                  glömd")
                </li>
                <li>
                  <strong>Rätt till begränsning:</strong> Begränsa hur vi använder dina uppgifter
                </li>
                <li>
                  <strong>Rätt till dataportabilitet:</strong> Få dina uppgifter i ett strukturerat,
                  maskinläsbart format
                </li>
                <li>
                  <strong>Rätt att invända:</strong> Invända mot behandling som baseras på
                  berättigat intresse
                </li>
                <li>
                  <strong>Rätt att återkalla samtycke:</strong> Om behandlingen baseras på samtycke
                </li>
              </ul>
              <p className="text-base leading-7">
                För att utöva dina rättigheter, kontakta oss på{' '}
                <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                  support@vinakademin.se
                </a>
                . Vi svarar på din begäran inom 30 dagar.
              </p>
            </CardContent>
          </Card>

          {/* Barn */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">8. Barn och unga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vinakademin är inte avsedd för barn under 18 år. Vi samlar inte medvetet in
                personuppgifter från barn. Om du är vårdnadshavare och upptäcker att ditt barn har
                gett oss personuppgifter utan ditt samtycke, kontakta oss så raderar vi uppgifterna.
              </p>
            </CardContent>
          </Card>

          {/* Internationella överföringar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">9. Internationella överföringar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Dina uppgifter lagras primärt inom EU/EES. Om vi överför uppgifter till länder
                utanför EU/EES ser vi till att lämpliga skyddsåtgärder finns på plats, såsom:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>EU:s standardavtalsklausuler</li>
                <li>Mottagarens certifiering (t.ex. Privacy Shield-liknande mekanismer)</li>
                <li>Bindande företagsbestämmelser</li>
              </ul>
            </CardContent>
          </Card>

          {/* Klagomål */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">10. Klagomål till tillsynsmyndighet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Om du anser att vi hanterar dina personuppgifter på ett felaktigt sätt har du rätt
                att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY):
              </p>
              <ul className="list-none space-y-2 text-base leading-7">
                <li>
                  <strong>Webbplats:</strong>{' '}
                  <a
                    href="https://www.imy.se"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.imy.se
                  </a>
                </li>
                <li>
                  <strong>E-post:</strong> imy@imy.se
                </li>
                <li>
                  <strong>Telefon:</strong> 08-657 61 00
                </li>
              </ul>
              <p className="text-base leading-7">
                Vi uppskattar om du kontaktar oss först så att vi kan försöka lösa eventuella
                problem direkt med dig.
              </p>
            </CardContent>
          </Card>

          {/* Ändringar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">11. Ändringar av policyn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi kan uppdatera denna integritetspolicy när vår verksamhet eller lagstiftningen
                ändras. Vid väsentliga ändringar kommer vi att meddela dig via e-post eller genom
                ett tydligt meddelande på webbplatsen.
              </p>
              <p className="text-base leading-7">
                Vi rekommenderar att du regelbundet granskar denna policy för att hålla dig
                informerad om hur vi skyddar dina uppgifter.
              </p>
            </CardContent>
          </Card>

          {/* Kontakt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">12. Kontakta oss</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Om du har frågor om denna integritetspolicy eller hur vi hanterar dina
                personuppgifter, kontakta oss gärna:
              </p>
              <ul className="list-none space-y-2 text-base leading-7">
                <li>
                  <strong>E-post:</strong>{' '}
                  <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                    support@vinakademin.se
                  </a>
                </li>
                <li>
                  <strong>Ämnesrad:</strong> "Integritetsfråga" eller "GDPR-förfrågan"
                </li>
              </ul>
              <p className="text-base leading-7">
                Vi strävar efter att svara på alla förfrågningar inom 30 dagar.
              </p>
            </CardContent>
          </Card>

          {/* Footer links */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground">
              Relaterade dokument:{' '}
              <Link href="/villkor" className="text-primary hover:underline">
                Användarvillkor
              </Link>{' '}
              •{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Cookiepolicy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
