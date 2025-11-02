import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, BarChart3, User } from 'lucide-react'
import Image from 'next/image'
import type { Vinprovningar } from '@/payload-types'

interface OrderSummaryProps {
  course: Vinprovningar
}

export function OrderSummary({ course }: OrderSummaryProps) {
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
    <div className="space-y-4">
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
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-border"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg leading-tight mb-2">{course.title}</h3>

          <div className="flex flex-wrap gap-2 mb-2">
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
              Vinprovning
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span>{instructorName}</span>
          </div>
        </div>
      </div>

      {/* Course Description */}
      {course.description && (
        <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {course.description}
          </p>
        </div>
      )}

      {/* Course Benefits */}
      <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 rounded-lg p-4 border border-green-200/50 dark:border-green-800/30">
        <h4 className="font-semibold mb-3 text-sm sm:text-base text-green-900 dark:text-green-100 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Vad ingår i vinprovningen:
        </h4>
        <ul className="space-y-2 text-xs sm:text-sm text-green-800 dark:text-green-200">
          <li className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <span>Livstillgång till vinprovningsmaterialet</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <span>Alla lektioner och moduler</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <span>Dela vinprovningen med vänner via gruppfunktionen</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <span>30 dagars pengarna-tillbaka-garanti</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
