import { Metadata } from 'next'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Palette,
  Type,
  Image,
  MessagesSquare,
  Grid,
  MousePointer2,
  AlertTriangle,
  Mail,
  MonitorSmartphone,
} from 'lucide-react'
import { ToastDemo } from './ToastDemo'
import { WordmarkExporter } from './WordmarkExporter'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Stilguide | Vinakademin',
  description:
    'Intern stilguide för Vinakademin – färger, typografi, komponenter och tonalitet för enhetlig varumärkesupplevelse.',
}

function ColorSwatch({ name, token }: { name: string; token: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-10 w-10 rounded shadow border"
        style={{ backgroundColor: `hsl(var(${token}))` }}
        aria-label={name}
      />
      <div className="text-sm">
        <div className="font-medium">{name}</div>
        <div className="text-muted-foreground">{token}</div>
      </div>
    </div>
  )
}

export default function StyleguidePage() {
  return (
    <div className="container mx-auto px-4 py-10 min-w-0">
      <div className="mb-10 space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold">Stilguide</h1>
        <p className="text-muted-foreground max-w-3xl">
          Denna sida är en intern mall för varumärkes- och designriktlinjer. Här samlar vi
          riktlinjer för färg, typografi, komponenter och tonalitet för att säkerställa en
          konsekvent upplevelse i alla kanaler. Sidan är öppen nu, men kommer döljas framöver.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Palette className="h-6 w-6 text-secondary" />
            <div>
              <CardTitle>Färger</CardTitle>
              <CardDescription>Primär, sekundär och stödfärger</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorSwatch name="Primary" token="--primary" />
              <ColorSwatch name="Secondary (brand orange)" token="--secondary" />
              <ColorSwatch name="Accent" token="--accent" />
              <ColorSwatch name="Foreground" token="--foreground" />
              <ColorSwatch name="Background" token="--background" />
              <ColorSwatch name="Destructive" token="--destructive" />
              <ColorSwatch name="Muted" token="--muted" />
              <ColorSwatch name="Border" token="--border" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Orange används sparsamt för att skapa fokus och energi (CTA, highlights). Överanvänd
              inte brandfärgen.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Type className="h-6 w-6 text-secondary" />
            <div>
              <CardTitle>Typografi</CardTitle>
              <CardDescription>Rubriker och brödtext</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Rubriker</div>
              <h1 className="text-4xl font-bold">H1 – Coolvetica</h1>
              <h2 className="text-3xl font-medium">H2 – Sans</h2>
              <h3 className="text-2xl font-medium">H3 – Sans</h3>
              <h4 className="text-xl font-medium">H4 – Sans</h4>
            </div>
            <Separator />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Typsnitt</div>
                <div className="text-sm">
                  <div>
                    <span className="font-medium">H1:</span> Coolvetica (
                    <code className="bg-muted px-1 rounded">font-heading</code>)
                  </div>
                  <div>
                    <span className="font-medium">H2–H4 & brödtext:</span> Inter / Sans (
                    <code className="bg-muted px-1 rounded">font-sans</code>)
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Rekommendationer</div>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li>
                    Brödtext: 16px (text-base) med{' '}
                    <code className="bg-muted px-1 rounded">leading-7</code>
                  </li>
                  <li>
                    Rubriker: kompakt radavstånd – H1{' '}
                    <code className="bg-muted px-1 rounded">leading-tight</code>, H2–H4{' '}
                    <code className="bg-muted px-1 rounded">leading-snug</code>
                  </li>
                  <li>
                    Radlängd: 60–75 tecken, använd{' '}
                    <code className="bg-muted px-1 rounded">max-w-prose</code> eller{' '}
                    <code className="bg-muted px-1 rounded">max-w-2xl</code>
                  </li>
                  <li>
                    Styckeavstånd: <code className="bg-muted px-1 rounded">space-y-4</code> mellan
                    stycken
                  </li>
                </ul>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="text-xs uppercase text-muted-foreground">Exempel: brödtext</div>
                  <p className="text-base leading-7 max-w-prose">
                    Välkommen till Vinakademin. Vi hjälper dig att förstå vin med konkreta tips och
                    tydliga exempel. Inga facktermer utan förklaring – bara det du behöver veta.
                  </p>
                  <p className="text-base leading-7 max-w-prose">
                    Håll en bekväm radlängd och ge luft mellan stycken. Det gör texten lättare att
                    läsa på alla skärmar.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="text-xs uppercase text-muted-foreground">Exempel: långform</div>
                  <div className="max-w-2xl space-y-4">
                    <p className="text-base leading-7">
                      När du väljer vin, börja med tillfället: vardag, middag med vänner eller
                      firande. Välj sedan stil och druvor. Enkla tumregler slår detaljerad
                      terminologi i vardagen.
                    </p>
                    <p className="text-base leading-7">
                      Undvik för långa stycken. Dela upp texten och använd informativa rubriker för
                      att skapa struktur.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bold & undertexter</CardTitle>
                  <CardDescription>Riktlinjer för vikt och etiketter</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Titlar (H1–H4) använder{' '}
                      <code className="bg-muted px-1 rounded">font-medium</code> (inte bold). H1 får
                      vara bold via typsnittet.
                    </li>
                    <li>
                      Använd <code className="bg-muted px-1 rounded">font-bold</code> sparsamt i
                      brödtext för betoning.
                    </li>
                    <li>
                      Undertexter/eyebrow:{' '}
                      <code className="bg-muted px-1 rounded">
                        text-xs uppercase tracking-wide text-muted-foreground
                      </code>
                      .
                    </li>
                  </ul>
                  <div className="mt-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Exempel på undertext
                    </div>
                    <h3 className="text-xl font-medium">En tydlig avsnittsrubrik</h3>
                    <p className="text-sm text-muted-foreground">
                      Kort, informativ och utan onödig tyngd.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>H1-storlek per sida</CardTitle>
                  <CardDescription>Konsekventa, minimalistiska nivåer</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Standard H1:{' '}
                      <code className="bg-muted px-1 rounded">text-3xl md:text-4xl</code>
                    </li>
                    <li>
                      Större hero (vid behov):{' '}
                      <code className="bg-muted px-1 rounded">text-4xl md:text-5xl</code>
                    </li>
                    <li>
                      H2: <code className="bg-muted px-1 rounded">text-2xl</code> · H3:{' '}
                      <code className="bg-muted px-1 rounded">text-xl</code> · H4:{' '}
                      <code className="bg-muted px-1 rounded">text-lg</code>
                    </li>
                    <li>
                      Radavstånd: H1 <code className="bg-muted px-1 rounded">leading-tight</code>,
                      H2–H4 <code className="bg-muted px-1 rounded">leading-snug</code>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Image className="h-6 w-6 text-secondary" />
            <div>
              <CardTitle>Logotyp</CardTitle>
              <CardDescription>Placering och kontrast</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded border bg-white p-6 text-center">
                <div className="font-heading text-4xl md:text-5xl leading-none tracking-tight text-gray-900">
                  Vinakademin
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Primär ordmärke (ljus)</div>
              </div>
              <div className="rounded border bg-zinc-900 p-6 text-center text-white">
                <div className="font-heading text-4xl md:text-5xl leading-none tracking-tight text-white">
                  Vinakademin
                </div>
                <div className="mt-2 text-xs text-zinc-300">Invert/monokrom (mörk)</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Vi använder ordmärket ("Vinakademin") satt i Coolvetica. Håll generös friyta och
              undvik effekter som skuggor eller gradienter. Använd textfärg med tillräcklig kontrast
              mot bakgrunden.
            </p>
            <WordmarkExporter />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="space-y-6 min-w-0 overflow-x-hidden">
        <TabsList>
          <TabsTrigger value="components">Komponenter</TabsTrigger>
          <TabsTrigger value="forms">Formulär</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="theme">Tema</TabsTrigger>
          <TabsTrigger value="tone">Tonalitet</TabsTrigger>
          <TabsTrigger value="icons">Ikoner</TabsTrigger>
          <TabsTrigger value="responsive">Responsiv</TabsTrigger>
          <TabsTrigger value="states">Tillstånd</TabsTrigger>
          <TabsTrigger value="email">E‑post</TabsTrigger>
          <TabsTrigger value="brand">Varumärke</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Varianter och storlekar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges & Alerts</CardTitle>
              <CardDescription>Status och meddelanden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <Alert>
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>Använd alerts för tydliga, koncisa budskap.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabell</CardTitle>
              <CardDescription>Exempel på tabellformat</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Exempel Exempelsson</TableCell>
                    <TableCell>Redaktör</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Aktiv</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Anna Andersson</TableCell>
                    <TableCell>Författare</TableCell>
                    <TableCell>
                      <Badge>Ny</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="icons" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Grid className="h-6 w-6 text-secondary" />
              <div>
                <CardTitle>Ikonografi</CardTitle>
                <CardDescription>Storlekar, stroke och grid</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                {[12, 16, 20, 24, 28, 32, 40, 48].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2 text-xs">
                    <MousePointer2 style={{ width: s, height: s }} />
                    <div className="text-muted-foreground">{s}px</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Standard är 24px med stroke 1.5–2. Håll konsekvent vikt och anpassa färg till text.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsive" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <MonitorSmartphone className="h-6 w-6 text-secondary" />
              <div>
                <CardTitle>Responsivitet</CardTitle>
                <CardDescription>Breakpoints, behållare och kolumner</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Breakpoints: sm, md, lg, xl. Använd <code>container</code> med sidopadding{' '}
                <code>px-4</code> och maxbredd via Tailwinds <code>container</code> utilities.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-accent" />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Exempel på kolumnförändring över brytpunkter.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-secondary" />
              <div>
                <CardTitle>Tillstånd</CardTitle>
                <CardDescription>Loading, tomt, fel, interaktion</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">Loading</div>
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/4" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">Tomt</div>
                  <Card className="p-6 text-sm text-muted-foreground">
                    Inget innehåll ännu. Lägg till ditt första objekt.
                  </Card>
                </div>
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">Fel</div>
                  <Alert variant="destructive">
                    <AlertTitle>Kunde inte ladda</AlertTitle>
                    <AlertDescription>Försök igen eller kontakta support.</AlertDescription>
                  </Alert>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Button disabled>Disabled</Button>
                <Button className="hover:translate-y-[1px] transition">Hover</Button>
                <Button className="focus-visible:ring-2">Focus</Button>
                <Button className="active:scale-[.98]">Active</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Mail className="h-6 w-6 text-secondary" />
              <div>
                <CardTitle>E‑post</CardTitle>
                <CardDescription>Nyhetsbrev och transaktionsmail</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Typsnitt: webbsäkra fallback (Arial/Helvetica) i e‑post.</li>
                <li>Färger: använd brandorange för knappar, håll bakgrund vit.</li>
                <li>Knappstorlek: minst 44x44px; tydlig kontrast.</li>
                <li>Mörkt läge: undvik transparenta PNG på mörk bakgrund.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Image className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Varumärkesresurser</CardTitle>
                <CardDescription>Nedladdningar, frizon och felanvändning</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Nedladdningar</div>
                  <div className="flex gap-3">
                    <a className="underline text-primary" href="/brand/logo-primary.svg" download>
                      Logo (ljus)
                    </a>
                    <a className="underline text-primary" href="/brand/logo-invert.svg" download>
                      Logo (mörk)
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded border bg-white p-6 text-center text-sm">
                    Frizon runt logotyp
                  </div>
                  <div className="rounded border bg-white p-6 text-center text-sm">
                    Minsta storlek
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6 text-sm">
                    ✔ Korrekt: rätt kontrast och frizon
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-sm">✖ Fel: sträck/vrid/gradienter</CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Formulär</CardTitle>
              <CardDescription>Inputs, select, textarea, val</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-post</label>
                  <Input placeholder="namn@exempel.se" type="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Namn</label>
                  <Input placeholder="För- och efternamn" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategori</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">A</SelectItem>
                      <SelectItem value="b">B</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meddelande</label>
                  <Textarea placeholder="Skriv här..." rows={4} />
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="c1" />
                  <label htmlFor="c1" className="text-sm">
                    Jag godkänner villkoren
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="s1" />
                  <label htmlFor="s1" className="text-sm">
                    Aviseringar
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button>Skicka</Button>
                <Button variant="outline">Avbryt</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notiser</CardTitle>
              <CardDescription>Sonner-baserade toastnotiser</CardDescription>
            </CardHeader>
            <CardContent>
              <ToastDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rutnät och spacing</CardTitle>
              <CardDescription>Grid, spacing och radie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['2', '4', '6', '8', '10', '12', '16', '20'].map((s) => (
                  <div key={s} className="space-y-2">
                    <div className="text-xs text-muted-foreground">gap-{`[${s}]`}</div>
                    <div className="grid grid-cols-3" style={{ gap: `${s}px` }}>
                      <div className="h-8 rounded bg-accent" />
                      <div className="h-8 rounded bg-accent" />
                      <div className="h-8 rounded bg-accent" />
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center gap-4 flex-wrap">
                {['sm', 'md', 'lg'].map((r) => (
                  <div key={r} className="space-y-2">
                    <div className="text-xs text-muted-foreground">radius {r}</div>
                    <div
                      className={cn(
                        'h-12 w-20 border bg-card',
                        r === 'sm' ? 'rounded-sm' : r === 'md' ? 'rounded-md' : 'rounded-lg',
                      )}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Färglägen</CardTitle>
              <CardDescription>Ljus och mörk bakgrund</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border p-6 space-y-3 bg-white">
                <div className="text-sm font-medium">Ljust läge</div>
                <div className="flex gap-2">
                  <Button>Primär</Button>
                  <Button variant="secondary">Sekundär</Button>
                  <Button variant="outline">Outline</Button>
                </div>
                <div className="flex gap-2">
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                </div>
              </div>
              <div className="rounded-lg border p-6 space-y-3 bg-zinc-900 text-white">
                <div className="text-sm font-medium">Mörkt läge</div>
                <div className="flex gap-2">
                  <Button>Primär</Button>
                  <Button variant="secondary">Sekundär</Button>
                  <Button variant="outline">Outline</Button>
                </div>
                <div className="flex gap-2">
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tillgänglighet</CardTitle>
              <CardDescription>Snabba riktlinjer</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>Kontrast: använd text- och bakgrundsfärger som möter WCAG AA.</li>
                <li>Fokus: alla interaktiva element ska ha tydligt fokusläge.</li>
                <li>Ikoner: kombinera ikon med text där det är möjligt.</li>
                <li>Toast: korta, åtgärdsfokuserade och ej blockerande.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tone" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <MessagesSquare className="h-6 w-6 text-secondary" />
              <div>
                <CardTitle>Tonalitet & språk</CardTitle>
                <CardDescription>Röst, stil och riktlinjer</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-medium">Vänligt och konkret.</span> Undvik jargong.
                </li>
                <li>
                  <span className="font-medium">Aktiv röst.</span> Kortare meningar, tydliga verb.
                </li>
                <li>
                  <span className="font-medium">Värde först.</span> Lyft fram nyttan för användaren.
                </li>
                <li>
                  <span className="font-medium">Konsekvent terminologi.</span> Samma begrepp
                  överallt.
                </li>
                <li>
                  <span className="font-medium">Orange med måtta.</span> Används för CTA och
                  highlights.
                </li>
              </ul>
              <p className="text-muted-foreground">
                Anpassa komplexitet efter målgrupp. Skriv för människor, inte för sökmotorer.
              </p>
              <Separator />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Gör</div>
                  <Card className="bg-accent">
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">Boka din plats idag</div>
                      <div className="text-muted-foreground text-xs">
                        Tydligt CTA‑verb + konkret värde.
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Gör inte</div>
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">Klicka här</div>
                      <div className="text-muted-foreground text-xs">Otydligt, saknar kontext.</div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Rubriker</div>
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">Lär dig matcha vin och mat</div>
                      <div className="text-muted-foreground text-xs">
                        Naturlig svenska, undvik titel‑casing.
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Microcopy</div>
                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">
                        Vi skickar aldrig spam. Avsluta när du vill.
                      </div>
                      <div className="text-muted-foreground text-xs">Trygghet + korthet.</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
