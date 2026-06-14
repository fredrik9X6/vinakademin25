import Link from 'next/link'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { BookOpen, ArrowRight, Wine, Sparkles, Users } from 'lucide-react'
import type { TastingTemplate } from '@/payload-types'

interface ProvningsmallarFeatureProps {
  templates: TastingTemplate[]
  totalCount: number
}

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

/**
 * Homepage feature for the Provningsmallar (tasting templates) library.
 * Designed against /styleguide: eyebrow + heading + showcase + brand CTA.
 */
export function ProvningsmallarFeature({ templates, totalCount }: ProvningsmallarFeatureProps) {
  if (templates.length === 0) return null

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* Subtle brand glow — keeps the section tied to the rest of the site */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-brand-400/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow + heading + subline — styleguide section-head pattern */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <BookOpen className="h-3 w-3" />
            Provningsmallar
          </span>
          <h2 className={`${HEADING} mt-5 text-4xl md:text-5xl lg:text-6xl`}>
            Färdiga provningsupplägg
            <br />
            <span className="text-brand-gradient">på några minuter</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
            Bläddra bland kurerade mallar med tema, vinval och värdmanus. Klona en mall, anpassa
            den till din grupp, och bjud in dina vänner — färdigt på under fem minuter.
          </p>
        </div>

        {/* Three benefit chips — styleguide stat-tile pattern */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, label: 'Tema redo att köra' },
            { icon: Wine, label: 'Vinval med smakprofil' },
            { icon: Users, label: 'Värdmanus inkluderat' },
          ].map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400">
                <b.icon className="h-4 w-4" />
              </div>
              <span className="text-[14px] font-medium">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Showcase: 3 real template cards from the library */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.slice(0, 3).map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        {/* Brand CTA + count */}
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/provningsmallar"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand-gradient px-7 text-[15px] font-medium text-white shadow-[0_10px_20px_-5px_rgba(251,145,76,0.25)] transition-all hover:bg-brand-gradient-reverse hover:shadow-[0_15px_28px_-8px_rgba(251,145,76,0.35)] active:scale-[0.99]"
          >
            Utforska biblioteket
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'mall' : 'mallar'} att välja bland — och fler kommer
            varje månad
          </p>
        </div>
      </div>
    </section>
  )
}
