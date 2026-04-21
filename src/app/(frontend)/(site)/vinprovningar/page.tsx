import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, BookOpen, User, ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { transformCourseWithModules } from '@/lib/course-utils-server'
import { getTotalCourseItems, countFreeItems } from '@/lib/course-utils'
import { FeaturedCourseCard } from '@/components/course/FeaturedCourseCard'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('(frontend)-(site)-vinprovningar-page')

/**
 * Validates and returns a valid image URL, or null if invalid
 */
function getValidImageUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null
  // Check for invalid filenames (just a dash, empty, or undefined in path)
  if (url.includes('/-.') || url.endsWith('/-') || url.includes('undefined')) {
    log.warn('Invalid image URL detected:', url)
    return null
  }
  return url
}

export default async function KurserPage() {
  const payload = await getPayload({ config })

  // Fetch all published courses
  const courses = await payload.find({
    collection: 'vinprovningar',
    where: { _status: { equals: 'published' } },
    depth: 1, // Populate featuredImage and instructor
    limit: 1000,
  })

  // Transform courses with their modules - using helper function
  const coursesWithModules = await Promise.all(
    courses.docs.map(async (course) => {
      return await transformCourseWithModules(course)
    }),
  )

  // Fetch review averages for all courses
  const allCourseIds = coursesWithModules.map((c) => c.id)
  const reviewsResult = await payload.find({
    collection: 'course-reviews',
    where: {
      and: [
        { course: { in: allCourseIds } },
        { status: { equals: 'published' } },
      ],
    },
    limit: 1000,
    depth: 0,
  })

  // Build a map of courseId -> { averageRating, totalReviews }
  const courseReviewMap = new Map<number, { averageRating: number; totalReviews: number }>()
  const reviewsByCourse = new Map<number, number[]>()
  for (const review of reviewsResult.docs) {
    const courseId = typeof review.course === 'object' ? (review.course as any).id : review.course
    if (!reviewsByCourse.has(courseId)) reviewsByCourse.set(courseId, [])
    if (review.rating != null) reviewsByCourse.get(courseId)!.push(review.rating)
  }
  for (const [courseId, ratings] of reviewsByCourse) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
    courseReviewMap.set(courseId, {
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: ratings.length,
    })
  }

  // Separate featured and regular courses
  const featuredCourses = coursesWithModules.filter((c) => c.isFeatured)
  const regularCourses = coursesWithModules.filter((c) => !c.isFeatured)

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis'
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">Vinprovningar</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            En flaska vin, några glas och ett par vänner – mer behövs inte för en minnesvärd kväll.
            Våra guidade vinprovningar leder dig genom smaker och berättelser, direkt hem till ditt
            bord.
          </p>
        </div>

        {/* Featured Course */}
        {featuredCourses.length > 0 &&
          featuredCourses.map((course) => (
            <FeaturedCourseCard
              key={course.id}
              course={course}
              reviewData={courseReviewMap.get(course.id)}
            />
          ))}

        {/* Regular Courses Grid */}
        {regularCourses.length > 0 ? (
          <div>
            {featuredCourses.length > 0 && (
              <h2 className="text-2xl font-medium mb-6">Alla vinprovningar</h2>
            )}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularCourses.map((course) => {
                const totalItems = getTotalCourseItems(course.modules as any)
                const freeItems = countFreeItems(course.modules as any)
                const thumbnailUrl =
                  typeof course.featuredImage === 'object' && course.featuredImage
                    ? getValidImageUrl((course.featuredImage as any).url)
                    : null

                return (
                  <Card
                    key={course.id}
                    className="hover:shadow-lg transition-shadow group overflow-hidden"
                  >
                    {/* Thumbnail Image - Always 16:9 */}
                    {thumbnailUrl && (
                      <div className="relative w-full aspect-video overflow-hidden">
                        <Image
                          src={thumbnailUrl}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getLevelColor(course.level || 'beginner')}>
                          {course.level === 'beginner' && 'Nybörjare'}
                          {course.level === 'intermediate' && 'Medel'}
                          {course.level === 'advanced' && 'Avancerad'}
                          {!course.level && 'Nybörjare'}
                        </Badge>
                        <div className="text-lg font-semibold text-primary">
                          {formatPrice(course.price || 0)}
                        </div>
                      </div>
                      <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Course Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{totalItems} moment</span>
                          </div>
                          {course.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{course.duration}h</span>
                            </div>
                          )}
                          {freeItems > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{freeItems} gratis moment</span>
                            </div>
                          )}
                        </div>

                        {/* Rating */}
                        {courseReviewMap.has(course.id) && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    s <= Math.round(courseReviewMap.get(course.id)!.averageRating)
                                      ? 'fill-[#FB914C] text-[#FB914C]'
                                      : 'text-muted-foreground/20'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium text-foreground">
                              {courseReviewMap.get(course.id)!.averageRating}
                            </span>
                            <span className="text-muted-foreground">
                              ({courseReviewMap.get(course.id)!.totalReviews})
                            </span>
                          </div>
                        )}

                        {/* Instructor */}
                        {course.instructor && typeof course.instructor === 'object' && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>
                              {course.instructor.firstName} {course.instructor.lastName}
                            </span>
                          </div>
                        )}

                        {/* CTA Button */}
                        <Link href={`/vinprovningar/${course.slug}`} className="block">
                          <Button className="w-full group">
                            Läs mer
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : featuredCourses.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Inga vinprovningar tillgängliga</CardTitle>
              <CardDescription>
                Vinprovningar kommer att visas här när de har publicerats.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
