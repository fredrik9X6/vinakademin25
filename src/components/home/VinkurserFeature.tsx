import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Check, PlayCircle, Sparkles, Users } from 'lucide-react'
import type { Vinkurser, Media } from '@/payload-types'

interface VinkurserFeatureProps {
  courses: Vinkurser[]
  totalCount: number
}

const HEADING = 'font-heading tracking-[-0.015em] leading-[1.05]'

function getCourseImageUrl(image: Vinkurser['featuredImage']): string | null {
  if (image && typeof image === 'object') {
    const url = (image as Media).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function formatPrice(price: number | null | undefined): string {
  if (!price || price <= 0) return 'Gratis'
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Homepage feature for the Vinkurser (video courses) library — mirrors
 * ProvningsmallarFeature visually so the two product showcases parallel each
 * other under the comparison strip.
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (Workstream C)
 */
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
}

export function VinkurserFeature({ courses, totalCount }: VinkurserFeatureProps) {
  if (courses.length === 0) return null

  // One course: render a full-width hero card (image left, content right) so
  // the section reads as "today's flagship course" instead of a sparse single
  // tile in a 3-col grid. >1 courses falls back to the multi-card grid.
  const singleCourse = courses.length === 1 ? courses[0] : null

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 right-1/2 translate-x-1/2 h-[420px] w-[420px] rounded-full bg-brand-400/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <BookOpen className="h-3 w-3" />
            Vinkvällen
          </span>
          <h2 className={`${HEADING} mt-5 text-4xl md:text-5xl lg:text-6xl`}>
            En vinprovning hemma
            <br />
            <span className="text-brand-gradient">vi guidar hela kvällen</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
            Bjud hem några vänner och håll en vinprovning ni pratar om länge efteråt. Filmerna
            guidar hela kvällen — du behöver inte kunna något om vin. En betalar, hela
            sällskapet är med.
          </p>
        </div>

        {/* Three benefit chips */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: PlayCircle, label: 'Filmerna guidar hela kvällen' },
            { icon: Sparkles, label: 'Inköpslista till Systembolaget' },
            { icon: Users, label: 'En betalar, hela sällskapet med' },
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

        {singleCourse ? (
          <SingleCourseHero course={singleCourse} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => {
              const imageUrl = getCourseImageUrl(course.featuredImage)
              return (
                <Link
                  key={course.id}
                  href={`/vinkurser/${course.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-brand-400/40 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] w-full bg-muted">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={course.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <PlayCircle className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-medium leading-snug text-foreground group-hover:text-brand-400">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {course.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="text-brand-gradient text-lg font-bold">
                        {formatPrice(course.price)}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {LEVEL_LABEL[course.level || ''] ?? ''}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Footer CTA — only renders when there's more than one course. With
            one course the SingleCourseHero already has its own "Läs om
            Vinkvällen" primary CTA, so a second link here would be noise. */}
        {!singleCourse && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <Link href="/vinkurser" className="btn-brand btn-brand-lg group">
              Läs om Vinkvällen
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'kväll' : 'kvällar'} att boka
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

interface SingleCourseHeroProps {
  course: Vinkurser
}

/**
 * Hero treatment for the section when only one course is published. Mirrors
 * the side-by-side card style of OfferingsComparison so the homepage stays
 * visually coherent: image left (3/5 width on desktop), copy + CTA right.
 */
function SingleCourseHero({ course }: SingleCourseHeroProps) {
  const imageUrl = getCourseImageUrl(course.featuredImage)
  const levelLabel = LEVEL_LABEL[course.level || ''] ?? ''
  const includes = [
    'Filmerna guidar kvällen — du behöver inte kunna något om vin',
    'Färdig inköpslista till Systembolaget',
    'En betalar, hela sällskapet är med i samma session',
    'Alla fyller i egna smakblad och jämför på slutet',
  ]

  return (
    <article className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:grid md:grid-cols-5">
      <div className="relative aspect-[16/10] w-full bg-muted md:col-span-3 md:aspect-auto">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlayCircle className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
        {/* Play badge in the corner — same visual language as the OfferingsComparison cards */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground backdrop-blur-sm">
          <PlayCircle className="h-3 w-3 text-brand-400" />
          Vinkväll
        </div>
      </div>

      <div className="flex flex-col p-6 sm:p-8 md:col-span-2">
        {levelLabel && (
          <span className="mb-3 inline-flex w-fit items-center rounded-full border border-brand-300/30 bg-brand-300/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            {levelLabel}
          </span>
        )}
        <h3 className={`${HEADING} text-2xl md:text-3xl`}>{course.title}</h3>
        {course.description && (
          <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
            {course.description}
          </p>
        )}

        <ul className="mt-5 space-y-2 text-[13px] text-foreground">
          {includes.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          <p className="text-[15px] font-medium">
            <span className="text-brand-gradient text-xl font-bold">
              {formatPrice(course.price)}
            </span>{' '}
            <span className="text-sm text-muted-foreground">· för hela sällskapet</span>
          </p>
          <Link href={`/vinkurser/${course.slug}`} className="btn-brand mt-4 w-full group">
            Läs om Vinkvällen
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
