import type { Metadata } from 'next'
import Image from 'next/image'
import {
  Wine,
  Sparkles,
  ArrowRight,
  Star,
  Play,
  Users,
  BookOpen,
  Clock,
  User,
  ShoppingCart,
  Video,
  Check,
  Info,
  Mail,
  Sun,
  Moon,
  Instagram,
  Music2,
  Loader2,
  AlertTriangle,
  Calendar,
  Image as ImageIcon,
  Palette as PaletteIcon,
  Type as TypeIcon,
  MousePointer2,
  MessagesSquare,
  Grid as GridIcon,
} from 'lucide-react'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Designsystem | Vinakademin',
  description:
    'Foundations, components and brand patterns for Vinakademin — typography, palette, spacing, buttons, cards, forms, iconography and logo usage.',
  alternates: { canonical: `${getSiteURL()}/styleguide` },
  robots: { index: false, follow: false },
}

const ORANGE_300 = '#FDBA75'
const ORANGE_400 = '#FB914C'

const sections = [
  { id: 'logo', label: 'Logo' },
  { id: 'typography', label: 'Typografi' },
  { id: 'palette', label: 'Palett' },
  { id: 'spacing', label: 'Spacing & form' },
  { id: 'buttons', label: 'Knappar' },
  { id: 'cards', label: 'Kort' },
  { id: 'forms', label: 'Formulär' },
  { id: 'icons', label: 'Ikoner' },
]

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: React.ReactNode
  subtitle: string
}) {
  return (
    <div className="mb-10 flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="font-heading text-4xl font-bold leading-[1] tracking-tight md:text-5xl">
        {title}
      </h2>
      <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  )
}

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground ${className}`}
    >
      {children}
    </span>
  )
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-7 ${className}`}>{children}</div>
  )
}

/* ========================================================================== */
/* LOGO                                                                       */
/* ========================================================================== */

function LogoSection() {
  return (
    <section id="logo" className="scroll-mt-24">
      <SectionHead
        eyebrow="Brand · Logo"
        title={
          <>
            Vinakademin,
            <br />
            alltid i ett stycke
          </>
        }
        subtitle="The wordmark is the primary mark. The logomark — a single wine glass with an orange accent drop — is reserved for favicons, avatars, and tight square spots. Never invert colors or stack a mark on a surface that fights its contrast."
      />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[20px] border border-border bg-[#1a1a1a] p-12">
          <div
            className="absolute -right-20 -top-20 h-[340px] w-[340px] rounded-full opacity-[0.12] blur-[90px]"
            style={{ background: ORANGE_300 }}
          />
          <div
            className="absolute -bottom-20 -left-20 h-[340px] w-[340px] rounded-full opacity-[0.10] blur-[90px]"
            style={{ background: ORANGE_400 }}
          />
          <Image
            src="/brand/vinakademin_logo_lockup_darkmode.svg"
            alt="Vinakademin lockup on dark"
            width={520}
            height={260}
            className="relative z-10 max-h-[260px] w-auto max-w-[58%]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <LogoTile bg="bg-[#fafafa]" border="border-[#e5e5e5]" capColor="text-[#666]">
            <Image src="/brand/Vinakademin_logo_lockup.svg" alt="Lockup on light" width={130} height={80} className="max-h-[80px] w-auto max-w-[130px] object-contain" />
            <span className="font-mono text-[11px]">Light surface</span>
          </LogoTile>

          <LogoTile
            bg="bg-[#FFF7EE]"
            border="border-[rgba(253,186,117,0.3)]"
            capColor="text-[#8a5a2a]"
          >
            <Image src="/brand/Vinakademin_logo_lockup.svg" alt="Lockup on cream" width={130} height={80} className="max-h-[80px] w-auto max-w-[130px] object-contain" />
            <span className="font-mono text-[11px]">Cream accent</span>
          </LogoTile>

          <LogoTile bg="" border="border-0" capColor="text-white" gradient>
            <Image src="/brand/vinakademin_logo_lockup_darkmode.svg" alt="Lockup on orange" width={130} height={80} className="max-h-[80px] w-auto max-w-[130px] object-contain" />
            <span className="font-mono text-[11px]">Brand orange</span>
          </LogoTile>

          <LogoTile bg="bg-[#1a1a1a]" border="border-border" capColor="text-muted-foreground">
            <Image src="/brand/vinakademin_logo_lockup_darkmode.svg" alt="Lockup on dark" width={130} height={80} className="max-h-[80px] w-auto max-w-[130px] object-contain" />
            <span className="font-mono text-[11px]">Dark (default)</span>
          </LogoTile>
        </div>
      </div>

      <Panel className="mt-8">
        <Eyebrow className="mb-5 block">Logomark</Eyebrow>
        <div className="flex flex-wrap items-center gap-4">
          {[
            { size: 'h-16 w-16 p-3', bg: 'bg-[#1a1a1a]', border: 'border-border' },
            { size: 'h-16 w-16 p-3', bg: 'bg-[#fafafa]', border: 'border-[#e5e5e5]' },
            {
              size: 'h-16 w-16 p-3',
              bg: 'bg-[#FFF7EE]',
              border: 'border-[rgba(253,186,117,0.3)]',
            },
            {
              size: 'h-16 w-16 p-3 border-0',
              bg: 'bg-[#FB914C]',
              border: '',
              favicon: true,
            },
            { size: 'h-10 w-10 p-2', bg: 'bg-[#1a1a1a]', border: 'border-border' },
            { size: 'h-7 w-7 p-1', bg: 'bg-[#1a1a1a]', border: 'border-border' },
          ].map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-center rounded-2xl border ${m.bg} ${m.border} ${m.size}`}
            >
              <Image
                src={
                  m.favicon
                    ? '/brand/vinakademin_logomark_favicon.svg'
                    : '/brand/vinakademin_logomark.svg'
                }
                alt="Logomark"
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
          A single wine glass silhouette with a small orange drop at the rim — the &ldquo;academy&rdquo;
          mark. Use for favicons, avatars, app icons, and whenever the full lockup would shrink
          smaller than 24px tall.
        </p>
      </Panel>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DoDontCard tone="good" head="Do — breathing room" note="Min clear space = 1× the mark's height on all sides. Full lockup above 80px wide; logomark only below.">
          <div className="flex h-[110px] items-center justify-center rounded-xl border border-border bg-[#1a1a1a] p-4">
            <Image src="/brand/vinakademin_logo_lockup_darkmode.svg" alt="" width={150} height={60} className="max-h-[80%] w-auto" />
          </div>
        </DoDontCard>
        <DoDontCard tone="bad" head="Don't — crowd" note="Don't crowd it or shrink the lockup under 80px. Switch to the logomark instead.">
          <div className="flex h-[110px] items-center justify-center rounded-xl border border-border bg-[#1a1a1a] p-0.5">
            <Image src="/brand/vinakademin_logo_lockup_darkmode.svg" alt="" width={300} height={120} className="max-h-full w-full object-contain" />
          </div>
        </DoDontCard>
        <DoDontCard tone="good" head="Do — matched surface" note="Light variant on light, dark on dark. Never re-color the wordmark.">
          <div className="flex h-[110px] items-center justify-center rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
            <Image src="/brand/Vinakademin_logo_lockup.svg" alt="" width={150} height={60} className="max-h-[80%] w-auto" />
          </div>
        </DoDontCard>
        <DoDontCard tone="bad" head="Don't — busy bg" note="No placement over busy imagery or competing gradients — low contrast kills the mark.">
          <div className="flex h-[110px] items-center justify-center rounded-xl bg-[linear-gradient(45deg,#ff006e,#8338ec,#3a86ff)] p-4">
            <Image src="/brand/vinakademin_logo_lockup_darkmode.svg" alt="" width={150} height={60} className="max-h-[80%] w-auto" />
          </div>
        </DoDontCard>
      </div>
    </section>
  )
}

function LogoTile({
  children,
  bg,
  border,
  capColor,
  gradient = false,
}: {
  children: React.ReactNode
  bg: string
  border: string
  capColor: string
  gradient?: boolean
}) {
  return (
    <div
      className={`flex min-h-[198px] flex-col items-center justify-between gap-5 rounded-2xl border p-6 ${
        gradient ? '' : `${bg} ${border}`
      } ${capColor}`}
      style={
        gradient
          ? { background: `linear-gradient(135deg, ${ORANGE_300}, ${ORANGE_400})`, border: 0 }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function DoDontCard({
  tone,
  head,
  note,
  children,
}: {
  tone: 'good' | 'bad'
  head: string
  note: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${
        tone === 'good' ? 'border-border' : 'border-[rgba(248,113,113,0.3)]'
      } bg-card`}
    >
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
          tone === 'good' ? 'text-[#4ade80]' : 'text-[#f87171]'
        }`}
      >
        {head}
      </span>
      {children}
      <p className="text-[12px] leading-[1.55] text-muted-foreground">{note}</p>
    </div>
  )
}

/* ========================================================================== */
/* TYPOGRAPHY                                                                 */
/* ========================================================================== */

function TypographySection() {
  return (
    <section id="typography" className="scroll-mt-24">
      <SectionHead
        eyebrow="Typography"
        title={
          <>
            Vänligt men
            <br />
            bestämt
          </>
        }
        subtitle="Coolvetica does the heavy lifting on H1s and the wordmark — warm, rounded, a little bit quirky. Everything else is Inter, set in font-medium (never bold) for a quiet, editorial hierarchy."
      />

      <div className="grid gap-10">
        {[
          {
            meta: 'H1 Hero · Coolvetica 72/72',
            demo: (
              <div className="font-heading text-[clamp(40px,6vw,72px)] font-bold leading-[1] tracking-[-0.015em]">
                Vinprovningar
                <br />
                hemma,{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                  }}
                >
                  enkelt &amp; opretentiöst.
                </span>
              </div>
            ),
          },
          {
            meta: 'H1 · Coolvetica 56/60',
            demo: (
              <div className="font-heading text-[clamp(36px,5vw,56px)] font-bold leading-[1.05] tracking-[-0.015em]">
                Så fungerar en vinprovning
              </div>
            ),
          },
          {
            meta: 'H2 · Inter Medium 36',
            demo: (
              <div className="text-[clamp(24px,3.5vw,36px)] font-medium leading-[1.2] tracking-[-0.005em]">
                Vad våra medlemmar säger
              </div>
            ),
          },
          {
            meta: 'H3 · Inter Medium 24',
            demo: (
              <div className="text-2xl font-medium leading-[1.3]">Provning &amp; jämförelse</div>
            ),
          },
          {
            meta: 'H4 · Inter Medium 18',
            demo: <div className="text-lg font-medium leading-[1.4]">Instruktör</div>,
          },
          {
            meta: 'Lead · Inter 20/32',
            demo: (
              <div className="max-w-[52ch] text-[20px] leading-[1.6] text-muted-foreground">
                En flaska vin, några glas och ett par vänner – mer behövs inte för en minnesvärd
                kväll.
              </div>
            ),
          },
          {
            meta: 'Body · Inter 16/28',
            demo: (
              <div className="max-w-[56ch] text-base leading-[1.75]">
                Vi gör vinkunskap enkelt &amp; opretentiöst. Våra guidade provningar leder dig
                genom smaker och berättelser, direkt hem till ditt bord. Du behöver inte kunna
                skilja en Cabernet Sauvignon från en Cabernet Franc — vi förklarar allt du möter
                längs vägen.
              </div>
            ),
          },
          {
            meta: 'Eyebrow · 11 uppercase',
            demo: <Eyebrow>Rekommenderad vinprovning · Steg 01 · Instruktör</Eyebrow>,
          },
          {
            meta: 'Emphasis color',
            demo: (
              <div className="text-base leading-[1.75]">
                Priser skrivs i brand-gradient:{' '}
                <span
                  className="bg-clip-text text-[28px] font-bold text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                  }}
                >
                  399 kr
                </span>
                . Gratis blir{' '}
                <span className="font-bold" style={{ color: ORANGE_400 }}>
                  Gratis
                </span>
                , aldrig &ldquo;0 kr&rdquo;.
              </div>
            ),
          },
        ].map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[120px_1fr] items-baseline gap-6 border-b border-border pb-6"
          >
            <Eyebrow className="pt-2.5">{row.meta}</Eyebrow>
            <div>{row.demo}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ========================================================================== */
/* PALETTE                                                                    */
/* ========================================================================== */

function Swatch({
  bg,
  name,
  value,
  swatchClass = '',
}: {
  bg: string
  name: string
  value: string
  swatchClass?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className={`h-24 ${swatchClass}`} style={{ background: bg }} />
      <div className="grid gap-0.5 bg-card px-4 py-3">
        <span className="text-[13px] font-medium">{name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{value}</span>
      </div>
    </div>
  )
}

function PaletteSection() {
  return (
    <section id="palette" className="scroll-mt-24">
      <SectionHead
        eyebrow="Colors"
        title={
          <>
            Svart kök.
            <br />
            Varm glöd.
          </>
        }
        subtitle="Neutral near-black surfaces, warm off-white text, and a single brand orange (two shades) that carries every CTA, glow and accent. Neutrals lean warm — never slate or steel."
      />

      <Eyebrow className="mb-3 mt-8 block">Brand</Eyebrow>
      <div className="grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl border border-border md:grid-cols-[2fr_1fr_1fr]">
        <div
          className="flex flex-col justify-between p-6"
          style={{
            background: `linear-gradient(135deg, ${ORANGE_400}, ${ORANGE_300})`,
            color: '#1a0f06',
          }}
        >
          <div className="font-heading text-3xl">Vinakademin Orange</div>
          <div className="font-mono text-[11px] opacity-75">
            <div>Gradient · used on primary CTAs, price, premium borders</div>
            <div>from #FB914C → to #FDBA75</div>
          </div>
        </div>
        <div
          className="flex flex-col justify-between p-6"
          style={{ background: ORANGE_400, color: '#1a0f06' }}
        >
          <div className="font-semibold">Orange 400</div>
          <div className="font-mono text-[11px] opacity-75">
            #FB914C
            <br />
            HSL 24 95 64
            <br />
            dark-mode CTA
          </div>
        </div>
        <div
          className="flex flex-col justify-between p-6"
          style={{ background: ORANGE_300, color: '#1a0f06' }}
        >
          <div className="font-semibold">Orange 300</div>
          <div className="font-mono text-[11px] opacity-75">
            #FDBA75
            <br />
            HSL 27 96 77
            <br />
            light-mode CTA
          </div>
        </div>
      </div>

      <Eyebrow className="mb-3 mt-8 block">Neutrals — Dark (default)</Eyebrow>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Swatch bg="#171717" name="Background" value="#171717 · 0 0% 9%" />
        <Swatch
          bg="#fafafa"
          name="Foreground"
          value="#FAFAFA · 0 6% 98%"
          swatchClass="border-b border-border"
        />
        <Swatch bg="#2a2a2a" name="Muted / Border" value="#2A2A2A · 240 4% 16%" />
        <Swatch bg="#2a2622" name="Accent (warm)" value="#2A2622 · 30 16% 16%" />
      </div>

      <Eyebrow className="mb-3 mt-8 block">Neutrals — Light</Eyebrow>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Swatch
          bg="#ffffff"
          name="Background"
          value="#FFFFFF · 0 0% 100%"
          swatchClass="border-b border-border"
        />
        <Swatch bg="#0a0a0b" name="Foreground" value="#0A0A0B · 240 10% 4%" />
        <Swatch bg="#f1f1f3" name="Muted" value="#F1F1F3 · 240 5% 96%" />
        <Swatch bg="#FFF7EE" name="Accent cream" value="#FFF7EE · 32 100% 97%" />
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        <Panel>
          <Eyebrow>Usage ratio</Eyebrow>
          <div className="mt-3 font-heading text-[40px] tracking-tight">
            70 / 25 / <span style={{ color: ORANGE_400 }}>5</span>
          </div>
          <div
            className="my-3 h-2 rounded"
            style={{
              background: `linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background)) 70%, ${ORANGE_400} 70%, ${ORANGE_400} 95%, hsl(var(--foreground)) 95%, hsl(var(--foreground)) 100%)`,
            }}
          />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Dark neutral carries 70% of any surface; warm off-white text and muted chips carry 25%;
            brand orange is reserved for 5% — the single thing you want clicked.
          </p>
        </Panel>
        <Panel>
          <Eyebrow>Don&rsquo;t</Eyebrow>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-muted-foreground">
            <li>No gradient wallpapers. Use soft orange blur-blobs behind sections instead.</li>
            <li>No cool neutrals (slate/zinc). Grays lean warm toward the cream accent.</li>
            <li>Never stack orange-on-orange. The glow is the accent — don&rsquo;t build on it.</li>
          </ul>
        </Panel>
      </div>
    </section>
  )
}

/* ========================================================================== */
/* SPACING                                                                    */
/* ========================================================================== */

function SpacingSection() {
  const radii = [
    { r: '4px', name: 'sm · 4' },
    { r: '6px', name: 'md · 6' },
    { r: '8px', name: 'lg · 8' },
    { r: '12px', name: 'xl · 12' },
    { r: '16px', name: '2xl · 16' },
  ]
  const space = [
    { tag: 'space-2 · 8px', w: 8 },
    { tag: 'space-4 · 16px', w: 16 },
    { tag: 'space-6 · 24px', w: 24 },
    { tag: 'space-8 · 32px', w: 32 },
    { tag: 'space-12 · 48px', w: 48 },
    { tag: 'space-16 · 64px', w: 64 },
    { tag: 'space-24 · 96px', w: 96 },
  ]
  return (
    <section id="spacing" className="scroll-mt-24">
      <SectionHead
        eyebrow="Spacing · Radius · Shadow"
        title="Lugnt och luftigt"
        subtitle="Tailwind's default scale, dialed warm. Corners are gently rounded (never pills except for badges), shadows are soft and diffuse, and brand glow is reserved for the CTA."
      />

      <Panel className="mb-5">
        <Eyebrow className="mb-3 block">Radius ramp</Eyebrow>
        <div className="flex flex-wrap items-end gap-4">
          {radii.map((r) => (
            <div
              key={r.name}
              className="flex h-[72px] w-[72px] items-end justify-center bg-muted pb-2 font-mono text-[11px] text-muted-foreground"
              style={{ borderRadius: r.r }}
            >
              {r.name}
            </div>
          ))}
          <div
            className="flex h-[72px] w-[120px] items-end justify-center bg-muted pb-2 font-mono text-[11px] text-muted-foreground"
            style={{ borderRadius: '9999px' }}
          >
            full · pill
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          Buttons &amp; inputs <code className="rounded bg-muted px-1.5">md</code> · Cards{' '}
          <code className="rounded bg-muted px-1.5">xl</code> · Hero cards / premium{' '}
          <code className="rounded bg-muted px-1.5">2xl</code> · Badges &amp; avatars{' '}
          <code className="rounded bg-muted px-1.5">full</code>
        </p>
      </Panel>

      <Panel className="mb-5">
        <Eyebrow className="mb-3 block">Shadow ramp</Eyebrow>
        <div className="flex flex-wrap gap-7">
          <div>
            <div className="min-w-[150px] rounded-xl border border-border bg-card p-4 shadow-sm">
              shadow-sm
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">hairline lift</p>
          </div>
          <div>
            <div className="min-w-[150px] rounded-xl border border-border bg-card p-4 shadow">
              shadow
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">card rest</p>
          </div>
          <div>
            <div className="min-w-[150px] rounded-xl border border-border bg-card p-4 shadow-lg">
              shadow-lg
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">card hover</p>
          </div>
          <div>
            <div className="min-w-[150px] rounded-xl border border-border bg-card p-4 shadow-xl">
              shadow-xl
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">floating panel</p>
          </div>
          <div>
            <div
              className="min-w-[150px] rounded-xl p-4 text-[#1a0f06]"
              style={{
                background: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                boxShadow: `0 10px 25px -5px rgba(251,145,76,0.25)`,
              }}
            >
              brand glow
            </div>
            <p className="mt-2 font-mono text-[12px] text-muted-foreground">CTA only</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <Eyebrow className="mb-3 block">Spacing scale (Tailwind)</Eyebrow>
          <div className="mt-3 flex flex-col gap-2.5">
            {space.map((s) => (
              <div key={s.tag} className="flex items-center gap-4">
                <span className="min-w-[130px] font-mono text-[12px] text-muted-foreground">
                  {s.tag}
                </span>
                <div
                  className="h-3.5 rounded"
                  style={{
                    width: s.w,
                    background: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                  }}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Section vertical rhythm uses <code className="rounded bg-muted px-1.5">py-16</code> /{' '}
            <code className="rounded bg-muted px-1.5">lg:py-24</code>. Final CTA section goes{' '}
            <code className="rounded bg-muted px-1.5">py-32</code>.
          </p>
        </Panel>

        <Panel>
          <Eyebrow className="mb-3 block">Container widths</Eyebrow>
          <div className="mt-3 rounded-2xl border border-dashed border-border p-5">
            <div className="mb-1.5 font-mono text-[11px] text-muted-foreground">
              max-w-7xl · 1280 — sections
            </div>
            <div className="mb-2 h-4 rounded bg-muted" />
            <div className="mb-2 h-4 w-4/5 rounded bg-muted" />
            <div className="mb-2 h-4 w-3/5 rounded bg-muted" />
            <div className="mb-1.5 mt-3 font-mono text-[11px] text-muted-foreground">
              max-w-5xl · 1024 — hero text
            </div>
            <div className="mb-2 h-4 w-[70%] rounded bg-muted" />
            <div className="mb-2 h-4 w-[55%] rounded bg-muted" />
            <div className="mb-1.5 mt-3 font-mono text-[11px] text-muted-foreground">
              max-w-2xl · 672 — paragraphs
            </div>
            <div className="h-4 w-[45%] rounded bg-muted" />
          </div>
        </Panel>
      </div>
    </section>
  )
}

/* ========================================================================== */
/* BUTTONS                                                                    */
/* ========================================================================== */

function PreviewBtn({
  children,
  variant = 'brand',
  size = 'md',
  disabled = false,
  loading = false,
  focused = false,
  hover = false,
}: {
  children: React.ReactNode
  variant?: 'brand' | 'secondary' | 'default' | 'outline' | 'ghost' | 'link' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  focused?: boolean
  hover?: boolean
}) {
  const sizeClass =
    size === 'sm' ? 'h-8 px-3.5 text-[13px]' : size === 'lg' ? 'h-12 px-7 text-[15px]' : 'h-10 px-6 text-[14px]'
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all whitespace-nowrap'
  let style: React.CSSProperties = {}
  let cls = ''
  if (variant === 'brand') {
    style = {
      background: hover
        ? `linear-gradient(90deg, ${ORANGE_300}, ${ORANGE_400})`
        : `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
      color: '#fff',
      boxShadow: hover
        ? '0 15px 28px -8px rgba(251,145,76,0.35)'
        : '0 10px 20px -5px rgba(251,145,76,0.25)',
      outline: focused ? `2px solid ${ORANGE_400}` : 'none',
      outlineOffset: focused ? 2 : 0,
    }
  } else if (variant === 'secondary') {
    cls = 'border'
    style = {
      background: 'rgba(251,145,76,0.12)',
      borderColor: 'rgba(251,145,76,0.25)',
      color: ORANGE_300,
    }
  } else if (variant === 'default') {
    style = { background: '#fcfafa', color: '#333' }
  } else if (variant === 'outline') {
    cls = 'border bg-transparent text-foreground'
    style = { borderColor: 'rgba(251,145,76,0.3)' }
  } else if (variant === 'ghost') {
    cls = 'bg-transparent text-foreground hover:bg-muted'
  } else if (variant === 'link') {
    cls = 'h-auto bg-transparent p-0 underline-offset-4 underline'
    style = { color: ORANGE_400 }
  } else if (variant === 'destructive') {
    style = { background: '#7f1d1d', color: '#fff' }
  }
  return (
    <button
      className={`${base} ${sizeClass} ${cls} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      style={style}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

function Badge({
  children,
  tone = 'brand',
  className = '',
}: {
  children: React.ReactNode
  tone?: 'brand' | 'green' | 'yellow' | 'red' | 'neutral' | 'outline'
  className?: string
}) {
  const styles: Record<string, string> = {
    brand:
      'bg-[rgba(253,186,117,0.1)] text-[#FB914C] border-[rgba(253,186,117,0.3)] border',
    green: 'bg-[rgba(34,197,94,0.15)] text-[#4ade80]',
    yellow: 'bg-[rgba(234,179,8,0.15)] text-[#facc15]',
    red: 'bg-[rgba(239,68,68,0.15)] text-[#f87171]',
    neutral: 'bg-muted text-foreground',
    outline: 'border border-border text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium ${styles[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

function ButtonsSection() {
  return (
    <section id="buttons" className="scroll-mt-24">
      <SectionHead
        eyebrow="Components · Buttons & Badges"
        title={
          <>
            Endast en
            <br />
            viktig knapp
          </>
        }
        subtitle="The orange gradient is the single thing we want clicked on any screen. Everything else is neutral or outline. Arrows translate 3px right on hover; gradients flip direction."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <Eyebrow className="mb-2 block">Primary — brand gradient</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <PreviewBtn>
              Kom igång <ArrowRight className="h-3.5 w-3.5" />
            </PreviewBtn>
            <PreviewBtn size="lg">
              Boka din plats <ArrowRight className="h-3.5 w-3.5" />
            </PreviewBtn>
            <PreviewBtn size="sm">Prova gratis</PreviewBtn>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Used sparingly — the #1 action on any screen. Only one per viewport.
          </p>
        </Panel>

        <Panel>
          <Eyebrow className="mb-2 block">Secondary / Default</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <PreviewBtn variant="secondary">Gå med</PreviewBtn>
            <PreviewBtn variant="default">Logga in</PreviewBtn>
            <PreviewBtn variant="outline">Läs mer</PreviewBtn>
            <PreviewBtn variant="ghost">Avbryt</PreviewBtn>
            <PreviewBtn variant="link">Glömt lösenord?</PreviewBtn>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Secondary is a soft orange-tinted chip — present but quieter than the primary gradient.
            Default is a neutral swap; outline borders tint orange on hover.
          </p>
        </Panel>

        <Panel>
          <Eyebrow className="mb-3 block">States</Eyebrow>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Rest', node: <PreviewBtn>Kom igång</PreviewBtn> },
              { label: 'Hover', node: <PreviewBtn hover>Kom igång</PreviewBtn> },
              { label: 'Focus', node: <PreviewBtn focused>Kom igång</PreviewBtn> },
              { label: 'Disabled', node: <PreviewBtn disabled>Kom igång</PreviewBtn> },
              { label: 'Loading', node: <PreviewBtn loading>Laddar…</PreviewBtn> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="min-w-[80px] font-mono text-[11px] tracking-wide text-muted-foreground">
                  {s.label}
                </span>
                {s.node}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Eyebrow className="mb-3 block">Badges</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">Nybörjare</Badge>
            <Badge tone="green">Publicerad</Badge>
            <Badge tone="yellow">Utkast</Badge>
            <Badge tone="red">Arkiverad</Badge>
            <Badge tone="neutral">Ny</Badge>
            <Badge tone="outline">Avancerad</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">
              <Play className="h-2.5 w-2.5" fill="currentColor" /> 3 gratis moment
            </Badge>
            <Badge tone="brand" className="bg-[rgba(251,145,76,0.15)]">
              <Star className="h-2.5 w-2.5" /> Rekommenderad
            </Badge>
            <Badge tone="neutral" className="px-3 py-1.5">
              <Clock className="h-3 w-3" /> 45 min
            </Badge>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            All badges use sentence case; level badges use the brand-tint pair; status badges use
            semantic tints in dark mode.
          </p>
        </Panel>
      </div>
    </section>
  )
}

/* ========================================================================== */
/* CARDS                                                                      */
/* ========================================================================== */

function CardsSection() {
  return (
    <section id="cards" className="scroll-mt-24">
      <SectionHead
        eyebrow="Components · Cards"
        title={
          <>
            En stjärna,
            <br />
            resten stilla
          </>
        }
        subtitle="One featured card per page gets the premium gradient border. Everything else is a hairline on warm neutral. Mobile step cards use a left-accent border + ghost display number — don't reach for this pattern anywhere else."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Featured card */}
        <div
          className="relative rounded-[20px] p-0.5"
          style={{
            background: `linear-gradient(90deg, ${ORANGE_300}, ${ORANGE_400}, ${ORANGE_300})`,
            boxShadow: '0 0 60px -10px rgba(251,145,76,0.35)',
          }}
        >
          <div className="grid grid-cols-1 overflow-hidden rounded-[18px] bg-[#1a1a1a] md:grid-cols-[1fr_1.1fr]">
            <div
              className="relative flex min-h-[420px] items-end p-6"
              style={{ background: 'linear-gradient(135deg, #3a1f11, #6b3a1e)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/70" />
              <Wine className="relative z-10 h-32 w-32" style={{ color: ORANGE_300 }} strokeWidth={1.2} />
            </div>
            <div className="flex flex-col gap-4 p-8">
              <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
                <Badge tone="brand">Nybörjare</Badge>
                <span className="h-[3px] w-[3px] rounded-full bg-[rgba(251,145,76,0.5)]" />
                <span>Populärast just nu</span>
                <span className="h-[3px] w-[3px] rounded-full bg-[rgba(251,145,76,0.5)]" />
                <span className="inline-flex gap-0.5" style={{ color: ORANGE_400 }}>
                  ★★★★★
                </span>
                <span className="font-medium text-foreground">4.9</span>
                <span>(127)</span>
              </div>
              <div>
                <h3 className="font-heading text-[34px] font-bold leading-[1.05] tracking-tight">
                  Världens klassiska druvor — en rundresa i ditt eget vardagsrum
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
                  Sex vinprovningar, sex druvor som finns överallt. Efter den här serien vet du
                  varför Riesling doftar som det gör, och varför Pinot Noir är så envist svårt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(253,186,117,0.1)', color: ORANGE_400 }}
                  >
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">12</div>
                    <div className="text-[11px] text-muted-foreground">Moment</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(253,186,117,0.1)', color: ORANGE_400 }}
                  >
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">4.5h</div>
                    <div className="text-[11px] text-muted-foreground">Längd</div>
                  </div>
                </div>
              </div>
              <div>
                <Badge tone="brand">▸ 2 gratis moment</Badge>
              </div>
              <div className="flex items-center gap-3 border-t border-border pt-3.5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-[14px] font-semibold text-[#1a0f06]"
                  style={{ background: `linear-gradient(135deg, ${ORANGE_300}, ${ORANGE_400})` }}
                >
                  FM
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Instruktör
                  </div>
                  <div className="mt-0.5 text-[14px] font-medium">Fredrik Mortensen</div>
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 border-t border-border pt-3.5">
                <span
                  className="bg-clip-text font-heading text-[36px] font-bold text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                  }}
                >
                  399 kr
                </span>
                <span className="text-[13px] text-muted-foreground">engångskostnad</span>
              </div>
              <div
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg text-[15px] font-medium text-white"
                style={{
                  background: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
                  boxShadow: '0 10px 20px -5px rgba(251,145,76,0.3)',
                }}
              >
                Prova gratis <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-[#1a1a1a]">
            <div
              className="relative aspect-video"
              style={{ background: 'linear-gradient(135deg, #2d1f36, #6b4a8c)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <Badge tone="green">Nybörjare</Badge>
                <span className="text-[16px] font-semibold" style={{ color: ORANGE_400 }}>
                  249 kr
                </span>
              </div>
              <div>
                <h3 className="font-heading text-[22px] font-bold leading-[1.1] tracking-tight">
                  Bubbel bortom Champagne
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Cava, crémant, pet-nat och Franciacorta — fyra glas, fyra helt olika sätt att
                  göra bubbel.
                </p>
              </div>
              <div className="flex gap-3.5 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> 6 moment
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 2.5h
                </span>
                <span className="inline-flex items-center gap-1" style={{ color: ORANGE_400 }}>
                  <Star className="h-3 w-3" fill="currentColor" /> 1 gratis
                </span>
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-[#1a1a1a] p-5"
            style={{ borderLeft: `4px solid ${ORANGE_400}` }}
          >
            <div
              className="pointer-events-none absolute right-3 top-2 select-none font-heading text-[70px] font-bold leading-[1]"
              style={{ color: 'rgba(253,186,117,0.06)' }}
            >
              01
            </div>
            <div
              className="mb-3.5 h-11 w-11 rounded-full p-0.5"
              style={{ background: `linear-gradient(135deg, ${ORANGE_300}, ${ORANGE_400})` }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full bg-[#1a1a1a]"
                style={{ color: ORANGE_400 }}
              >
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: ORANGE_400 }}
            >
              Steg 01
            </div>
            <div className="mb-1.5 text-[17px] font-semibold">Välj en vinprovning</div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Bläddra bland våra provningar och välj det du är nyfiken på. Nybörjare eller
              entusiast — det finns en för dig.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================== */
/* FORMS                                                                      */
/* ========================================================================== */

function FormsSection() {
  return (
    <section id="forms" className="scroll-mt-24">
      <SectionHead
        eyebrow="Components · Forms"
        title={
          <>
            Lite friktion,
            <br />
            mycket varsamhet
          </>
        }
        subtitle="Hairline 1px inputs, subtle orange focus ring, and never-angry error states. The session-code input (uppercase, monospace, centered) is a signature micro-pattern worth reusing in any 'join with a code' flow."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Auth */}
        <Panel>
          <Eyebrow className="mb-2 block">Auth / sign-in</Eyebrow>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium">E-post</label>
            <input
              type="email"
              defaultValue="fredrik@vinakademin.se"
              className="h-9 rounded-md border border-border bg-transparent px-3 text-[14px] outline-none transition focus:border-[rgba(251,145,76,0.6)] focus:ring-1 focus:ring-[rgba(251,145,76,0.4)]"
            />
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-[13px] font-medium">Lösenord</label>
            <input
              type="password"
              defaultValue="••••••••••••"
              className="h-9 rounded-md border border-border bg-transparent px-3 text-[14px] outline-none transition focus:border-[rgba(251,145,76,0.6)] focus:ring-1 focus:ring-[rgba(251,145,76,0.4)]"
            />
            <span className="text-[11px] text-muted-foreground">Minst 10 tecken, en siffra.</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <span
                className="relative h-4 w-4 rounded"
                style={{ background: ORANGE_400, borderColor: ORANGE_400 }}
              >
                <span
                  className="absolute left-1 top-[1px] h-[9px] w-[5px] rotate-45 border-b-2 border-r-2"
                  style={{ borderColor: '#1a0f06' }}
                />
              </span>
              Kom ihåg mig
            </span>
            <a
              href="#"
              className="text-[12px] underline underline-offset-[3px]"
              style={{ color: ORANGE_400 }}
            >
              Glömt lösenord?
            </a>
          </div>
          <button
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md text-[14px] font-medium text-white"
            style={{
              background: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
              boxShadow: '0 8px 16px -4px rgba(251,145,76,0.3)',
            }}
          >
            Logga in <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Panel>

        {/* Session code */}
        <Panel>
          <Eyebrow className="mb-2 block">Gå med i live-provning</Eyebrow>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Skriv in koden från din värd så går du in i sessionen.
          </p>
          <div
            className="mt-4 flex items-center gap-3.5 rounded-xl p-4"
            style={{
              border: '2px solid transparent',
              background:
                'linear-gradient(hsl(var(--card)),hsl(var(--card))) padding-box,' +
                ` linear-gradient(90deg, ${ORANGE_300}, ${ORANGE_400}, ${ORANGE_300}) border-box`,
            }}
          >
            <span className="text-[13px] font-medium">Sessionskod</span>
            <input
              type="text"
              defaultValue="ABC123"
              maxLength={6}
              className="h-9 w-[132px] rounded-md border border-border bg-transparent px-3 text-center font-mono text-[14px] uppercase tracking-[0.15em] outline-none focus:border-[rgba(251,145,76,0.6)] focus:ring-1 focus:ring-[rgba(251,145,76,0.4)]"
            />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium text-[#1a0f06]"
              style={{ background: ORANGE_400 }}
            >
              Gå med <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            6 tecken, versaler, monospace — signaturpattern för alla &ldquo;join via kod&rdquo;-flöden.
          </p>
        </Panel>

        {/* States */}
        <Panel>
          <Eyebrow className="mb-3 block">States</Eyebrow>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Rest</label>
              <input
                placeholder="Ditt namn"
                className="h-9 rounded-md border border-border bg-transparent px-3 text-[14px] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Focus</label>
              <input
                defaultValue="Fredrik"
                className="h-9 rounded-md border bg-transparent px-3 text-[14px] outline-none"
                style={{
                  borderColor: 'rgba(251,145,76,0.6)',
                  boxShadow: '0 0 0 1px rgba(251,145,76,0.4)',
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Error</label>
              <input
                defaultValue="fredrik@"
                className="h-9 rounded-md border bg-transparent px-3 text-[14px] outline-none"
                style={{ borderColor: '#7f1d1d' }}
              />
              <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: '#f87171' }}>
                <Info className="h-3 w-3" />
                Kontrollera e-postadressen.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">Success</label>
              <input
                defaultValue="Fredrik Mortensen"
                className="h-9 rounded-md border bg-transparent px-3 text-[14px] outline-none"
                style={{ borderColor: 'rgba(34,197,94,0.5)' }}
              />
              <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: '#4ade80' }}>
                <Check className="h-3 w-3" />
                Ser bra ut.
              </span>
            </div>
          </div>
        </Panel>

        {/* Controls */}
        <Panel>
          <Eyebrow className="mb-3 block">Controls</Eyebrow>
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2.5 text-[13px] font-medium">Nivå</div>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { label: 'Nybörjare', on: true },
                  { label: 'Medel', on: false },
                  { label: 'Avancerad', on: false },
                ].map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] ${
                      r.on ? 'font-medium' : ''
                    }`}
                    style={
                      r.on
                        ? {
                            borderColor: ORANGE_400,
                            background: 'rgba(253,186,117,0.08)',
                            color: ORANGE_400,
                          }
                        : { borderColor: 'hsl(var(--border))' }
                    }
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border-[1.5px]"
                      style={
                        r.on
                          ? {
                              borderColor: ORANGE_400,
                              background: `radial-gradient(circle, ${ORANGE_400} 40%, transparent 44%)`,
                            }
                          : { borderColor: 'hsl(var(--border))' }
                      }
                    />
                    {r.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2.5 text-[13px] font-medium">Sötma — var är jag?</div>
              <div className="relative h-1 rounded bg-border">
                <div
                  className="absolute left-0 top-0 h-1 w-[65%] rounded"
                  style={{ background: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})` }}
                />
                <div
                  className="absolute -top-[7px] left-[65%] h-[18px] w-[18px] -translate-x-1/2 rounded-full bg-white shadow-md"
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Knastertorr</span>
                <span>Medelsöt</span>
                <span>Sylt</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3.5">
              <div>
                <div className="text-[13px] font-medium">Mörkt läge</div>
                <div className="text-[11px] text-muted-foreground">Följer systemet som standard.</div>
              </div>
              <Toggle on />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium">Nyhetsbrev</div>
                <div className="text-[11px] text-muted-foreground">Vi skickar aldrig spam.</div>
              </div>
              <Toggle on />
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <div
      className="relative h-5 w-[34px] rounded-full"
      style={{ background: on ? ORANGE_400 : 'hsl(var(--border))' }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
        style={{ left: on ? 'calc(100% - 18px)' : '2px' }}
      />
    </div>
  )
}

/* ========================================================================== */
/* ICONOGRAPHY                                                                */
/* ========================================================================== */

function IconsSection() {
  const icons = [
    { Icon: Wine, name: 'Wine' },
    { Icon: Sparkles, name: 'Sparkles' },
    { Icon: ArrowRight, name: 'ArrowRight' },
    { Icon: Star, name: 'Star' },
    { Icon: Play, name: 'Play' },
    { Icon: Users, name: 'Users' },
    { Icon: BookOpen, name: 'BookOpen' },
    { Icon: Clock, name: 'Clock' },
    { Icon: User, name: 'User' },
    { Icon: ShoppingCart, name: 'Cart' },
    { Icon: Video, name: 'Video' },
    { Icon: Check, name: 'Check' },
    { Icon: Info, name: 'Info' },
    { Icon: Mail, name: 'Mail' },
    { Icon: Sun, name: 'Sun' },
    { Icon: Moon, name: 'Moon' },
    { Icon: Instagram, name: 'Instagram' },
    { Icon: Music2, name: 'Music' },
  ]

  return (
    <section id="icons" className="scroll-mt-24">
      <SectionHead
        eyebrow="Brand · Iconography"
        title={
          <>
            Alltid Lucide.
            <br />
            Aldrig emoji.
          </>
        }
        subtitle="Lucide is the single icon library. Two strokes — 2px inline with text and in feature chips, 1.5px for very dense interfaces. Icons always pair with a word or sit inside a clearly meaningful container; decorative-only icons don't exist here."
      />

      <Panel className="mb-5">
        <Eyebrow className="mb-4 block">Common icons (Lucide, 2px stroke, 22px)</Eyebrow>
        <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 md:grid-cols-6">
          {icons.map((it) => (
            <div
              key={it.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-4"
            >
              <it.Icon className="h-[22px] w-[22px]" />
              <span className="font-mono text-[10px] text-muted-foreground">{it.name}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <Panel>
          <Eyebrow className="mb-4 block">Icon chip patterns</Eyebrow>
          <div className="flex flex-wrap items-end gap-5">
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-[72px] w-[72px] rounded-full p-0.5"
                style={{ background: `linear-gradient(135deg, ${ORANGE_300}, ${ORANGE_400})` }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full bg-card"
                  style={{ color: ORANGE_400 }}
                >
                  <Wine className="h-7 w-7" />
                </div>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">Hero · 72</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: 'rgba(253,186,117,0.1)', color: ORANGE_400 }}
              >
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">Meta · 44</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Instagram className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">Social · 32</span>
            </div>
          </div>
          <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
            Hero chips use a 2px orange gradient ring around a bg-matched inner — the orange shows
            through around the rim. Meta chips are flat orange tint. Social chips are neutral muted.
          </p>
        </Panel>

        <Panel>
          <Eyebrow className="mb-4 block">Inline with text</Eyebrow>
          <div className="flex flex-col gap-3.5 text-[14px]">
            {[
              { Icon: BookOpen, text: '12 moment' },
              { Icon: Clock, text: '4.5h längd' },
              { Icon: Star, text: '4.9 · 127 omdömen', filled: true },
              { Icon: Users, text: '42 deltar' },
            ].map((it) => (
              <div key={it.text} className="flex items-center gap-2.5">
                <it.Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: ORANGE_400 }}
                  fill={it.filled ? 'currentColor' : 'none'}
                />
                {it.text}
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
            16px inline, vertically centered with the cap-height of the adjacent text. Icon tints
            brand orange when it&rsquo;s the semantic anchor.
          </p>
        </Panel>
      </div>

      <Panel className="mt-5">
        <Eyebrow className="mb-4 block">Stroke consistency</Eyebrow>
        <div className="grid gap-3.5 md:grid-cols-3">
          <div
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5"
            style={{ borderColor: 'rgba(74,222,128,0.3)' }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: '#4ade80' }}
            >
              Do
            </span>
            <div className="flex gap-3.5">
              <Wine className="h-[22px] w-[22px]" />
              <Clock className="h-[22px] w-[22px]" />
              <ArrowRight className="h-[22px] w-[22px]" />
            </div>
            <span className="text-center text-[11px] text-muted-foreground">
              Same family, same stroke, same size within a screen.
            </span>
          </div>
          <div
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5"
            style={{ borderColor: 'rgba(248,113,113,0.3)' }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: '#f87171' }}
            >
              Don&rsquo;t — mix families
            </span>
            <div className="flex items-center gap-3.5">
              <Wine className="h-[22px] w-[22px]" fill="currentColor" />
              <Clock className="h-[22px] w-[22px]" strokeWidth={1.25} />
              <span className="text-[20px]">🍷</span>
            </div>
            <span className="text-center text-[11px] text-muted-foreground">
              No mixing filled + outline, no emoji in the product UI.
            </span>
          </div>
          <div
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5"
            style={{ borderColor: 'rgba(248,113,113,0.3)' }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: '#f87171' }}
            >
              Don&rsquo;t — hand-drawn SVG
            </span>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <path
                d="M5 30 Q20 5, 35 30 T 40 35"
                stroke={ORANGE_300}
                strokeWidth={2}
                fill="none"
              />
              <circle cx="20" cy="18" r="5" fill={ORANGE_300} opacity="0.5" />
            </svg>
            <span className="text-center text-[11px] text-muted-foreground">
              Don&rsquo;t invent custom SVG illustrations. Use placeholders or real photography.
            </span>
          </div>
        </div>
      </Panel>
    </section>
  )
}

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function StyleguidePage() {
  return (
    <div className="relative">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute left-10 top-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: ORANGE_300, opacity: 0.05 }}
      />
      <div
        className="pointer-events-none absolute right-20 top-[600px] h-72 w-72 rounded-full blur-3xl"
        style={{ background: ORANGE_400, opacity: 0.04 }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* Page header */}
        <header className="mb-16 max-w-3xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Vinakademin · Designsystem
          </span>
          <h1 className="mt-2 font-heading text-5xl font-bold leading-[1] tracking-tight md:text-6xl">
            Enkelt &amp;{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`,
              }}
            >
              opretentiöst
            </span>
            .
          </h1>
          <p className="mt-5 max-w-[60ch] text-[18px] leading-relaxed text-muted-foreground">
            Foundations and components that make Vinakademin look and sound like Vinakademin —
            warm, editorial and zero pretension. One brand orange. One quiet hierarchy. Endast en
            viktig knapp.
          </p>
        </header>

        {/* Quick nav */}
        <nav className="mb-16 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-[13px] font-medium">Snabbnavigering</div>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-[13px] text-muted-foreground transition hover:border-[rgba(251,145,76,0.4)] hover:bg-[rgba(253,186,117,0.05)] hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="flex flex-col gap-24">
          <LogoSection />
          <TypographySection />
          <PaletteSection />
          <SpacingSection />
          <ButtonsSection />
          <CardsSection />
          <FormsSection />
          <IconsSection />
        </div>
      </div>
    </div>
  )
}
