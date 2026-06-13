import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, PlayCircle, Sparkles, Users } from 'lucide-react'
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
export function VinkurserFeature({ courses, totalCount }: VinkurserFeatureProps) {
  if (courses.length === 0) return null

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 right-1/2 translate-x-1/2 h-[420px] w-[420px] rounded-full bg-brand-400/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-300/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
            <BookOpen className="h-3 w-3" />
            Vinkurser
          </span>
          <h2 className={`${HEADING} mt-5 text-4xl md:text-5xl lg:text-6xl`}>
            Videokurser för
            <br />
            <span className="text-brand-gradient">vinens nyfikna</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
            Korta videolektioner, quiz som faktiskt sätter sig, vinval du kan handla direkt på
            Systembolaget — och möjlighet att bjuda in vänner till en gemensam session.
          </p>
        </div>

        {/* Three benefit chips */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: PlayCircle, label: 'Videolektioner & quiz' },
            { icon: Sparkles, label: 'Vinval till Systembolaget' },
            { icon: Users, label: 'Bjud in vänner till session' },
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

        {/* Showcase: 3 published courses */}
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
                      {course.level === 'beginner' && 'Nybörjare'}
                      {course.level === 'intermediate' && 'Medel'}
                      {course.level === 'advanced' && 'Avancerad'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/vinkurser"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand-gradient px-7 text-[15px] font-medium text-white shadow-[0_10px_20px_-5px_rgba(251,145,76,0.25)] transition-all hover:bg-brand-gradient-reverse hover:shadow-[0_15px_28px_-8px_rgba(251,145,76,0.35)] active:scale-[0.99]"
          >
            Se alla kurser
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'kurs' : 'kurser'} att utforska
          </p>
        </div>
      </div>
    </section>
  )
}
