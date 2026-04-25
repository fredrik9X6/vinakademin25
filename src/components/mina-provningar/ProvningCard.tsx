'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Wine, Play, RotateCcw } from 'lucide-react'
import { getLevelText, getLevelColor, type TransformedCourse } from '@/lib/course-enrollment-utils'

interface ProvningCardProps {
  course: TransformedCourse
}

export function ProvningCard({ course }: ProvningCardProps) {
  const { progress } = course
  const percentage = progress.percentage
  const imageUrl =
    course.featuredImage && typeof course.featuredImage === 'object'
      ? course.featuredImage.url
      : null

  // CTA text and icon
  let ctaText: string
  let CtaIcon: typeof Play
  if (percentage === 0) {
    ctaText = 'Starta provningen'
    CtaIcon = Play
  } else if (progress.completed) {
    ctaText = 'Se igen'
    CtaIcon = RotateCcw
  } else {
    ctaText = 'Fortsatt titta'
    CtaIcon = Play
  }

  return (
    <Card className="group overflow-hidden border-border hover:border-[#FB914C]/40 transition-colors bg-card">
      {/* Image area */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Wine className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Level badge overlay */}
        <div className="absolute top-3 left-3">
          <Badge className={`${getLevelColor(course.level)} text-xs font-medium shadow-sm`}>
            {getLevelText(course.level)}
          </Badge>
        </div>

        {/* Progress bar at bottom edge of image */}
        {percentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-[#FB914C] transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 leading-snug">{course.title}</h3>

        {/* Progress info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {progress.completedLessons} av {progress.totalLessons} moment
            </span>
            <span className="font-medium text-foreground">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-1.5 [&>div]:bg-brand-400" />
        </div>

        {/* CTA Button */}
        <Link href={`/vinprovningar/${course.slug}`} className="btn-brand w-full">
          <CtaIcon className="h-4 w-4" />
          {ctaText}
        </Link>
      </CardContent>
    </Card>
  )
}
