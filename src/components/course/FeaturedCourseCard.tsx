import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BookOpen, Clock, ArrowRight, Sparkles, Play } from 'lucide-react'
import { getTotalCourseItems, countFreeItems } from '@/lib/course-utils'

interface FeaturedCourseCardProps {
  course: any
}

export function FeaturedCourseCard({ course }: FeaturedCourseCardProps) {
  const totalItems = getTotalCourseItems(course.modules as any)
  const freeItems = countFreeItems(course.modules as any)
  const instructor =
    typeof course.instructor === 'object' && course.instructor ? course.instructor : null
  const instructorName =
    (instructor &&
      `${instructor.firstName || ''} ${instructor.lastName || ''}`.replace(/\s+/g, ' ').trim()) ||
    instructor?.name ||
    'Okänd instruktör'
  const featuredImageUrl =
    typeof course.featuredImage === 'object' && course.featuredImage
      ? (course.featuredImage as any).url
      : null

  const resolveMediaUrl = (media: any): string | null => {
    if (!media || typeof media !== 'object') return null
    if (typeof media.url === 'string') return media.url
    if (media.sizes && typeof media.sizes === 'object') {
      for (const size of Object.values(media.sizes)) {
        if (size && typeof size === 'object' && typeof (size as any).url === 'string') {
          return (size as any).url
        }
      }
    }
    return null
  }

  const instructorAvatarUrl = instructor ? resolveMediaUrl((instructor as any).avatar) : null
  const instructorInitials = (() => {
    const segments = instructorName.split(' ').filter((segment) => segment.trim().length > 0)
    if (segments.length === 0) {
      return 'I'
    }
    return segments
      .map((segment) => segment.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  })()

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis'
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)
  }

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FDBA75]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FDBA75]/10 to-[#FB914C]/10 border border-[#FDBA75]/20 mb-6">
            <Sparkles className="h-4 w-4 text-[#FB914C]" />
            <span className="text-sm font-medium text-[#FB914C]">Rekommenderad vinprovning</span>
          </div>
        </div>

        {/* Featured Course Card */}
        <div className="relative group">
          {/* Gradient border wrapper */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FDBA75] via-[#FB914C] to-[#FDBA75] rounded-2xl opacity-75 blur group-hover:opacity-100 transition duration-500" />

          <div className="relative bg-card rounded-2xl overflow-hidden border border-border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image Section */}
              {featuredImageUrl && (
                <div className="relative h-64 lg:h-auto">
                  <Image src={featuredImageUrl} alt={course.title} fill className="object-cover" />
                  {/* Image overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent lg:bg-gradient-to-r" />
                </div>
              )}

              {/* Content Section */}
              <div className="p-6 lg:p-8 flex flex-col justify-between space-y-6">
                {/* Top Content */}
                <div className="space-y-4">
                  {/* Level Badge */}
                  <div className="flex items-center gap-3">
                    <Badge className="bg-[#FDBA75]/10 text-[#FB914C] border-[#FDBA75]/30 hover:bg-[#FDBA75]/20">
                      {course.level === 'beginner'
                        ? 'Nybörjare'
                        : course.level === 'intermediate'
                          ? 'Fortsättning'
                          : 'Avancerad'}
                    </Badge>
                    <div className="h-1 w-1 rounded-full bg-[#FB914C]/40" />
                    <span className="text-sm text-muted-foreground">Populärast just nu</span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-3">
                    <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight text-foreground">
                      {course.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Meta Info */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-2 rounded-lg bg-[#FDBA75]/10">
                        <BookOpen className="h-4 w-4 text-[#FB914C]" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{totalItems}</div>
                        <div className="text-xs text-muted-foreground">Moment</div>
                      </div>
                    </div>
                    {course.duration && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 rounded-lg bg-[#FDBA75]/10">
                          <Clock className="h-4 w-4 text-[#FB914C]" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{course.duration}h</div>
                          <div className="text-xs text-muted-foreground">Längd</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Free Items Badge */}
                  {freeItems > 0 && (
                    <div className="pt-2">
                      <Badge
                        variant="secondary"
                        className="bg-[#FDBA75]/10 text-[#FB914C] border-[#FDBA75]/30"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {freeItems} gratis moment
                      </Badge>
                    </div>
                  )}

                  {/* Instructor */}
                  <div className="flex items-center gap-3 pt-2 pb-4 border-t border-border">
                    <Avatar className="h-12 w-12 border border-border bg-[#FDBA75]/10">
                      {instructorAvatarUrl ? (
                        <AvatarImage src={instructorAvatarUrl} alt={instructorName} />
                      ) : null}
                      <AvatarFallback className="bg-[#FDBA75]/10 text-[#FB914C]">
                        {instructorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-left">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        Instruktör
                      </div>
                      <div className="font-medium text-foreground">{instructorName}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="space-y-4 pt-4 border-t border-border">
                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#FB914C] to-[#FDBA75] bg-clip-text text-transparent">
                      {formatPrice(course.price)}
                    </span>
                    {course.price > 0 && (
                      <span className="text-sm text-muted-foreground">engångskostnad</span>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link href={`/vinprovningar/${course.slug || course.id}`} className="block">
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-[#FB914C] to-[#FDBA75] hover:from-[#FDBA75] hover:to-[#FB914C] text-white border-0 shadow-lg shadow-[#FB914C]/20 group transition-all duration-300"
                    >
                      {freeItems > 0 ? 'Prova gratis' : 'Läs mer'}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
