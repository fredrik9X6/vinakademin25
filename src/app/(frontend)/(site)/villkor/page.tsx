import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Användarvillkor | Vinakademin',
  description:
    'Läs våra användarvillkor för att förstå dina rättigheter och skyldigheter när du använder Vinakademin.',
}

export default function VillkorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Användarvillkor</h1>
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
                Välkommen till Vinakademin! Dessa användarvillkor beskriver reglerna och
                riktlinjerna för användning av vår plattform. Genom att använda Vinakademin
                godkänner du dessa villkor. Läs dem noga innan du fortsätter.
              </p>
            </CardContent>
          </Card>

          {/* Allmänt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">1. Allmänt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vinakademin är en digital plattform för vinutbildning och vinprovningar. Vi erbjuder
                kurser, artiklar, videoinnehåll och interaktiva verktyg för att hjälpa dig lära dig
                mer om vin.
              </p>
              <p className="text-base leading-7">
                Dessa villkor gäller för alla användare av plattformen, oavsett om du har ett
                gratiskonto eller har köpt våra betalda vinprovningar.
              </p>
            </CardContent>
          </Card>

          {/* Användarkonto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">2. Användarkonto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Registrering</h3>
              <p className="text-base leading-7">
                För att använda vissa funktioner måste du skapa ett konto. Du ansvarar för att:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Lämna korrekta och fullständiga uppgifter vid registrering</li>
                <li>Hålla dina inloggningsuppgifter säkra och hemliga</li>
                <li>Meddela oss omedelbart om obehörig användning av ditt konto</li>
                <li>Vara minst 18 år gammal</li>
              </ul>

              <Separator className="my-4" />

              <h3 className="text-lg font-semibold">Kontosäkerhet</h3>
              <p className="text-base leading-7">
                Du är ansvarig för all aktivitet som sker under ditt konto. Vi rekommenderar att du
                använder ett starkt, unikt lösenord och aktiverar tvåfaktorsautentisering där det är
                tillgängligt.
              </p>
            </CardContent>
          </Card>

          {/* Köp och betalning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">3. Köp och betalning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Priser</h3>
              <p className="text-base leading-7">
                Alla priser anges i svenska kronor (SEK) och inkluderar moms där det är tillämpligt.
                Vi förbehåller oss rätten att ändra priser när som helst, men ändringar påverkar
                inte redan genomförda köp.
              </p>

              <Separator className="my-4" />

              <h3 className="text-lg font-semibold">Betalningsmetoder</h3>
              <p className="text-base leading-7">
                Vi accepterar betalning via kreditkort, betalkort och andra metoder som erbjuds
                genom vår betalpartner Stripe. All betalningsinformation hanteras säkert och vi
                lagrar aldrig dina kortuppgifter direkt.
              </p>

              <Separator className="my-4" />

              <h3 className="text-lg font-semibold">Pengarna-tillbaka-garanti</h3>
              <p className="text-base leading-7">
                Vi erbjuder 30 dagars pengarna-tillbaka-garanti på alla köp, utan krångliga frågor.
                Om du av någon anledning inte är nöjd med din vinprovning inom 30 dagar från
                köpdatum, kontakta oss på{' '}
                <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                  support@vinakademin.se
                </a>{' '}
                så återbetalar vi hela beloppet. Vår "Happy Customer Guarantee" gäller oavsett hur
                mycket av vinprovningen du har genomfört.
              </p>
            </CardContent>
          </Card>

          {/* Licens och användning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">4. Licens och användningsrättigheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold">Vad du får göra</h3>
              <p className="text-base leading-7">
                När du köper en vinprovning får du en personlig, icke-överförbar, icke-exklusiv
                licens att:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Använda materialet för personligt, icke-kommersiellt bruk</li>
                <li>Streama videoinnehåll online</li>
                <li>Delta i interaktiva quiz och övningar</li>
                <li>Skapa personliga anteckningar och vinrecensioner</li>
              </ul>

              <Separator className="my-4" />

              <h3 className="text-lg font-semibold">Vad du inte får göra</h3>
              <p className="text-base leading-7">Du får inte:</p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Kopiera, ladda ner eller distribuera vårt innehåll utan tillstånd</li>
                <li>Dela ditt konto eller inloggningsuppgifter med andra</li>
                <li>Använda innehållet för kommersiella ändamål</li>
                <li>Försöka kringgå tekniska skyddsåtgärder</li>
                <li>Använda automatiserade verktyg för att hämta innehåll</li>
              </ul>
            </CardContent>
          </Card>

          {/* Gruppsessioner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">5. Gruppsessioner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Om du har köpt en vinprovning kan du starta gruppsessioner och bjuda in gäster.
                Gäster får tillfällig åtkomst till vinprovningen under sessionens längd.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Du är ansvarig för de gäster du bjuder in</li>
                <li>Gäster får inte spara eller kopiera innehållet</li>
                <li>Gruppsessioner får endast användas för personligt bruk</li>
                <li>Vi förbehåller oss rätten att begränsa antalet samtidiga sessioner</li>
              </ul>
            </CardContent>
          </Card>

          {/* Immateriella rättigheter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">6. Immateriella rättigheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Allt innehåll på Vinakademin, inklusive text, bilder, video, logotyper, grafik och
                programvara, ägs av Vinakademin eller våra licensgivare och skyddas av upphovsrätt
                och andra immaterialrättsliga lagar.
              </p>
              <p className="text-base leading-7">
                Varumärket "Vinakademin" och vår logotyp är skyddade och får inte användas utan vårt
                skriftliga tillstånd.
              </p>
            </CardContent>
          </Card>

          {/* Användargenererat innehåll */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">7. Användargenererat innehåll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                När du publicerar innehåll på plattformen (som vinrecensioner eller kommentarer) ger
                du oss rätt att använda, visa och distribuera detta innehåll i samband med tjänsten.
              </p>
              <p className="text-base leading-7">Du ansvarar för att ditt innehåll:</p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Inte bryter mot någon lag eller tredje parts rättigheter</li>
                <li>Inte innehåller stötande, kränkande eller olämpligt material</li>
                <li>Är sanningsenligt och inte vilseledande</li>
              </ul>
            </CardContent>
          </Card>

          {/* Ansvarsbegränsning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">8. Ansvarsbegränsning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vinakademin tillhandahålls "som den är" utan garantier av något slag. Vi strävar
                efter att leverera högkvalitativt innehåll, men vi garanterar inte att:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Tjänsten alltid är tillgänglig, oavbruten eller felfri</li>
                <li>Innehållet är fullständigt, korrekt eller uppdaterat</li>
                <li>Användning av tjänsten leder till specifika resultat</li>
              </ul>
              <p className="text-base leading-7">
                Vi ansvarar inte för indirekta skador som uppstår i samband med användning av
                tjänsten.
              </p>
            </CardContent>
          </Card>

          {/* Uppsägning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">9. Uppsägning och avslutande av konto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Du kan när som helst avsluta ditt konto genom att kontakta oss. Vi förbehåller oss
                rätten att stänga av eller ta bort konton som:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-base leading-7">
                <li>Bryter mot dessa villkor</li>
                <li>Används för olaglig eller olämplig aktivitet</li>
                <li>Missbrukar plattformen eller dess funktioner</li>
              </ul>
              <p className="text-base leading-7">
                Vid uppsägning förlorar du åtkomst till ditt konto och tillhörande innehåll. Redan
                betalda avgifter återbetalas inte.
              </p>
            </CardContent>
          </Card>

          {/* Ändringar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">10. Ändringar av villkoren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Vi kan uppdatera dessa villkor från tid till annan. Vid väsentliga ändringar kommer
                vi att meddela dig via e-post eller genom ett meddelande på plattformen. Fortsatt
                användning efter ändringar innebär att du accepterar de nya villkoren.
              </p>
            </CardContent>
          </Card>

          {/* Tillämplig lag */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">11. Tillämplig lag och tvister</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-7">
                Dessa villkor regleras av svensk lag. Eventuella tvister ska i första hand lösas
                genom förhandling. Om vi inte kan nå en överenskommelse ska tvisten avgöras av
                svensk allmän domstol.
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
                Om du har frågor om dessa användarvillkor, kontakta oss gärna:
              </p>
              <ul className="list-none space-y-2 text-base leading-7">
                <li>
                  E-post:{' '}
                  <a href="mailto:support@vinakademin.se" className="text-primary hover:underline">
                    support@vinakademin.se
                  </a>
                </li>
                <li>Webbplats: vinakademin.se</li>
              </ul>
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
