'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { ExternalLink, BookOpen, Clock, User, Star } from 'lucide-react'
import type { Course, Media, User as UserType } from '../../payload-types'

interface CourseReferenceBlockData {
  course: Course
  displayStyle: 'card' | 'banner' | 'link'
  showDetails?: {
    showImage?: boolean
    showPrice?: boolean
    showLevel?: boolean
    showDuration?: boolean
    showInstructor?: boolean
  }
  customText?: string
  callToAction?: string
  caption?: string
  openInNewTab?: boolean
}

interface CourseReferenceBlockProps {
  course: Course
  displayStyle: CourseReferenceBlockData['displayStyle']
  showDetails?: CourseReferenceBlockData['showDetails']
  customText?: string
  callToAction?: string
  caption?: string
  openInNewTab?: boolean
}

export function CourseReferenceBlock({
  course,
  displayStyle,
  showDetails,
  customText,
  callToAction = 'Visa kurs',
  caption,
  openInNewTab,
}: CourseReferenceBlockProps) {
  const linkProps = {
    href: `/vinprovningar/${course.slug}`,
    ...(openInNewTab && { target: '_blank', rel: 'noopener noreferrer' }),
  }

  const displayText = customText || course.title
  const courseImage = course.featuredImage as Media | null
  const instructor = course.instructor as UserType | null

  // Format price with Swedish currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Get level badge styling
  const getLevelBadge = (level: string) => {
    const styles = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      intermediate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    const labels = {
      beginner: 'Nybörjare',
      intermediate: 'Medel',
      advanced: 'Avancerad',
    }

    return {
      className: styles[level as keyof typeof styles] || styles.beginner,
      label: labels[level as keyof typeof labels] || level,
    }
  }

  // Simple link style
  if (displayStyle === 'link') {
    return (
      <Link
        {...linkProps}
        className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 underline underline-offset-2 transition-colors font-medium"
      >
        <BookOpen className="h-4 w-4" />
        {displayText}
        {openInNewTab && <ExternalLink className="h-3 w-3" />}
      </Link>
    )
  }

  // Compact banner style
  if (displayStyle === 'banner') {
    const levelBadge = getLevelBadge(course.level)

    return (
      <div className="my-6 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Course info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <BookOpen className="h-5 w-5" />
              <h3 className="text-lg font-semibold">{course.title}</h3>
            </div>
            <p className="text-orange-100 text-sm mb-2 line-clamp-2">{course.description}</p>

            <div className="flex items-center gap-3 justify-center md:justify-start text-sm">
              <Badge className={`${levelBadge.className} text-xs border-0`}>
                {levelBadge.label}
              </Badge>
              {course.price && (
                <span className="text-orange-100 font-medium">{formatPrice(course.price)}</span>
              )}
              {course.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-orange-100">{course.duration}h</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <Button asChild className="bg-white text-orange-500 hover:bg-gray-100 font-medium px-6">
            <Link {...linkProps}>
              {callToAction}
              {openInNewTab && <ExternalLink className="h-4 w-4 ml-2" />}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Featured card style (default)
  const levelBadge = getLevelBadge(course.level)

  return (
    <Card className="my-6 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-sidebar shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col">
          {/* Course image */}
          {showDetails?.showImage && courseImage && (
            <div className="relative w-full h-48 flex-shrink-0">
              <Image
                src={courseImage.url || ''}
                alt={courseImage.alt || course.title}
                fill
                className="object-cover rounded-t-lg"
                sizes="100vw"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Title and description */}
              <div>
                <Link
                  {...linkProps}
                  className="text-xl font-bold text-sidebar-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-2 group"
                >
                  {course.title}
                  {openInNewTab && (
                    <ExternalLink className="inline h-4 w-4 ml-1 align-text-top opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
                <p className="text-sidebar-foreground/70 mt-2 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Course details */}
              <div className="flex flex-wrap gap-3 items-center">
                {showDetails?.showLevel && (
                  <Badge className={levelBadge.className}>{levelBadge.label}</Badge>
                )}

                {showDetails?.showPrice && course.price && (
                  <div className="text-lg font-bold text-orange-500 dark:text-orange-400">
                    {formatPrice(course.price)}
                  </div>
                )}

                {showDetails?.showDuration && course.duration && (
                  <div className="flex items-center gap-1 text-sm text-sidebar-foreground/60">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration} timmar</span>
                  </div>
                )}

                {showDetails?.showInstructor && instructor && (
                  <div className="flex items-center gap-1 text-sm text-sidebar-foreground/60">
                    <User className="h-4 w-4" />
                    <span>
                      {instructor.firstName && instructor.lastName
                        ? `${instructor.firstName} ${instructor.lastName}`
                        : instructor.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Call to action */}
            <div className="mt-4 pt-4 border-t border-sidebar-border">
              <Button
                asChild
                className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
              >
                <Link {...linkProps}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {callToAction}
                  {openInNewTab && <ExternalLink className="h-4 w-4 ml-2" />}
                </Link>
              </Button>
            </div>

            {/* Caption */}
            {caption && (
              <p className="text-sm text-sidebar-foreground/50 italic mt-3 line-clamp-2">
                {caption}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
