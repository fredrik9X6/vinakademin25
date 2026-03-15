'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface ReviewSubmissionFormProps {
  courseId: number
  courseTitle: string
  courseSlug: string
  featuredImageUrl: string | null
  token?: string
  isValidToken: boolean
  enrollmentUserId: number | null
}

export function ReviewSubmissionForm({
  courseId,
  courseTitle,
  courseSlug,
  featuredImageUrl,
  token,
  isValidToken,
  enrollmentUserId,
}: ReviewSubmissionFormProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = isValidToken || !!user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || !content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/reviews/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          rating,
          content: content.trim(),
          token,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Något gick fel')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-medium">Tack för din recension!</h2>
          <p className="text-muted-foreground">
            Din recension hjälper andra att upptäcka bra vinprovningar.
          </p>
          <Link href={`/vinprovningar/${courseSlug}`}>
            <Button variant="outline" className="mt-4">
              Tillbaka till vinprovningen
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!canSubmit) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-medium">Logga in för att skriva en recension</h2>
          <p className="text-muted-foreground">
            Du behöver vara inloggad för att skriva en recension.
          </p>
          <Link href={`/logga-in?from=${encodeURIComponent(`/vinprovningar/${courseSlug}/recension${token ? `?token=${token}` : ''}`)}`}>
            <Button className="mt-4">Logga in</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {featuredImageUrl && (
        <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
          <Image
            src={featuredImageUrl}
            alt={courseTitle}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardHeader>
        <h2 className="text-lg font-medium">{courseTitle}</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-3">Betyg</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-[#FB914C] text-[#FB914C]'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {rating === 1 && 'Dålig'}
                {rating === 2 && 'Okej'}
                {rating === 3 && 'Bra'}
                {rating === 4 && 'Mycket bra'}
                {rating === 5 && 'Fantastisk'}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div>
            <label htmlFor="review-content" className="block text-sm font-medium mb-2">
              Din recension
            </label>
            <textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Berätta om din upplevelse av vinprovningen..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {content.length}/2000
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={!rating || !content.trim() || isSubmitting}
            className="w-full bg-gradient-to-r from-[#FB914C] to-[#FDBA75] hover:from-[#FDBA75] hover:to-[#FB914C] text-white"
          >
            {isSubmitting ? 'Skickar...' : 'Skicka recension'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
