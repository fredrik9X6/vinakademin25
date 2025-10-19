import { formatPrice } from '@/lib/stripe'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookOpen, Clock, BarChart3 } from 'lucide-react'
import Image from 'next/image'
import type { Course } from '@/payload-types'

interface OrderSummaryProps {
  course: Course
  discountAmount?: number
  discountCode?: string
}

export function OrderSummary({ course, discountAmount = 0, discountCode }: OrderSummaryProps) {
  const originalPrice = course.price || 0
  const finalPrice = originalPrice - discountAmount

  // Get course image
  const courseImage =
    course.featuredImage && typeof course.featuredImage === 'object'
      ? course.featuredImage.url
      : null

  // Get instructor name
  const instructorName =
    course.instructor && typeof course.instructor === 'object'
      ? `${course.instructor.firstName || ''} ${course.instructor.lastName || ''}`.trim()
      : 'Vinakademin'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Course Details */}
      <div className="flex gap-3 sm:gap-4">
        {courseImage && (
          <div className="flex-shrink-0">
            <Image
              src={
                courseImage.startsWith('http')
                  ? courseImage
                  : `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${courseImage}`
              }
              alt={course.title}
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg leading-tight mb-2">{course.title}</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              {course.level === 'beginner' && 'Nybörjare'}
              {course.level === 'intermediate' && 'Medel'}
              {course.level === 'advanced' && 'Avancerad'}
            </Badge>

            {course.duration && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {course.duration} tim
              </Badge>
            )}

            <Badge variant="outline" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              Kurs
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">Instruktör: {instructorName}</p>
        </div>
      </div>

      {/* Course Description */}
      {course.description && (
        <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
        </div>
      )}

      <Separator />

      {/* Pricing Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm">Kurspris</span>
          <span className="font-medium">{formatPrice(originalPrice)}</span>
        </div>

        {discountAmount > 0 && discountCode && (
          <>
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm">Rabatt ({discountCode})</span>
              <span className="font-medium">-{formatPrice(discountAmount)}</span>
            </div>
            <Separator />
          </>
        )}

        <div className="flex justify-between items-center text-lg font-bold">
          <span>Totalt</span>
          <span className="text-orange-500">{formatPrice(finalPrice)}</span>
        </div>
      </div>

      {/* Course Benefits */}
      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base text-green-800 dark:text-green-200">
          Vad ingår i kursen:
        </h4>
        <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-green-700 dark:text-green-300">
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
            Livstillgång till kursmaterialet
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
            Alla lektioner och moduler
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
            Kunskapstest och certifikat
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3" />
            30 dagars pengarna-tillbaka-garanti
          </li>
        </ul>
      </div>
    </div>
  )
}
