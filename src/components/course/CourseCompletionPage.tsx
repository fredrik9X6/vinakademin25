'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Award, Clock, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { Confetti } from '@/components/magicui/confetti'
import type { Vinprovningar } from '@/payload-types'
import Link from 'next/link'

interface CourseCompletionPageProps {
  course: Vinprovningar & {
    modules?: any[]
  }
  progressData?: {
    completedAt?: string
    timeSpent?: number
    progressPercentage?: number
    certificateIssued?: boolean
  }
}

export default function CourseCompletionPage({ course, progressData }: CourseCompletionPageProps) {
  const [showConfetti, setShowConfetti] = React.useState(false)

  React.useEffect(() => {
    // Trigger confetti on mount
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const completedDate = progressData?.completedAt
    ? new Date(progressData.completedAt).toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const timeSpentHours = progressData?.timeSpent ? Math.round(progressData.timeSpent / 60) : null

  const totalLessons =
    course.modules?.reduce<number>((acc, module) => {
      const lessons = (module as any)?.lessons
      const count = Array.isArray(lessons) ? lessons.length : 0
      return acc + count
    }, 0) || 0

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && (
        <Confetti
          className="absolute left-0 top-0 z-50 size-full"
          options={{ particleCount: 200, scalar: 0.8 }}
        />
      )}

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Grattis! Du är klar! 🎉
            </h1>
            <p className="text-xl text-muted-foreground">Du har slutfört {course.title}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Moment klara</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {timeSpentHours && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{timeSpentHours}h</p>
                    <p className="text-sm text-muted-foreground">Tid investerad</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {completedDate && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{completedDate}</p>
                    <p className="text-sm text-muted-foreground">Slutförd</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Certificate Section */}
        {progressData?.certificateIssued && (
          <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Ditt certifikat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Grattis! Du har förtjänat ett certifikat för att ha slutfört denna vinprovning.
              </p>
              <Button variant="secondary" className="w-full md:w-auto">
                <Award className="mr-2 h-4 w-4" />
                Ladda ner certifikat
              </Button>
            </CardContent>
          </Card>
        )}

        {/* What's Next Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Vad händer nu?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Gå igenom materialet igen</p>
                  <p className="text-sm text-muted-foreground">
                    Alla moment är fortfarande tillgängliga för dig
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Dela dina kunskaper</p>
                  <p className="text-sm text-muted-foreground">
                    Använd dina nya färdigheter och dela med vänner och familj
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium">Utforska fler vinprovningar</p>
                  <p className="text-sm text-muted-foreground">
                    Fortsätt din vinresa med våra andra provningar
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="secondary" size="lg" asChild>
            <Link href={`/vinprovningar/${course.slug || course.id}`}>Tillbaka till översikt</Link>
          </Button>

          <Button size="lg" asChild>
            <Link href="/vinprovningar">
              Utforska fler vinprovningar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
