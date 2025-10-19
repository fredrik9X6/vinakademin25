'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { toast } from 'sonner'
import {
  Loader2,
  BookOpen,
  PlayCircle,
  CheckCircle,
  Calendar,
  Download,
  Clock,
  Trophy,
} from 'lucide-react'

// Types for course purchases and progress
interface PurchasedCourse {
  [key: string]: any // Keep it flexible to work with existing API data
}

interface CoursePurchasePanelProps {
  userId: string
  onCourseAccess?: (courseSlug: string) => void
}

export function CoursePurchasePanel({ userId, onCourseAccess }: CoursePurchasePanelProps) {
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [accessingCourse, setAccessingCourse] = useState<string | null>(null)

  useEffect(() => {
    loadCourseData()
  }, [userId])

  async function loadCourseData() {
    setIsLoading(true)
    try {
      // Load purchased courses and progress
      const coursesResponse = await fetch(`/api/users/${userId}/courses`, {
        credentials: 'include',
      })

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()

        // Transform enrollment data to flat structure for component
        const transformedCourses = (coursesData.data || []).map((enrollment: any) => {
          const course = enrollment.course || {}
          const progress = enrollment.progress || {}

          return {
            // Course fields at top level
            id: course.id,
            slug: course.slug,
            title: course.title,
            shortDescription: course.description || course.shortDescription || '',
            level: course.level || 'beginner',
            featuredImage: course.featuredImage,
            instructor: course.instructor || { firstName: '', lastName: 'Vinakademin' },
            purchaseDate: enrollment.enrolledAt || enrollment.createdAt,
            price: course.price || 0,
            access: enrollment.status === 'active' ? 'active' : 'pending',
            // Progress at top level
            progress: {
              percentage: progress.progressPercentage || 0,
              completedLessons: Array.isArray(progress.completedLessons)
                ? progress.completedLessons.length
                : progress.completedLessons || 0,
              totalLessons: course.totalLessons || 0,
              lastAccessed: progress.lastAccessedAt,
              completed: progress.status === 'completed',
              certificateAvailable: progress.status === 'completed',
            },
          }
        })

        setPurchasedCourses(transformedCourses)
      }
    } catch (error) {
      console.error('Error loading course data:', error)
      toast.error('Fel vid laddning', {
        description: 'Kunde inte ladda kursinformation.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCourseAccess(course: any) {
    const courseId = course.course?.id || course.id
    const courseSlug = course.course?.slug || course.slug

    setAccessingCourse(courseId)
    try {
      // You can add any access verification logic here if needed
      onCourseAccess?.(courseSlug)

      // Update last accessed time
      await fetch(`/api/users/${userId}/courses/${courseId}/access`, {
        method: 'POST',
        credentials: 'include',
      })

      // Refresh course data to update last accessed
      loadCourseData()
    } catch (error) {
      console.error('Error accessing course:', error)
      toast.error('Åtkomstfel', {
        description: 'Kunde inte komma åt kursen.',
      })
    } finally {
      setAccessingCourse(null)
    }
  }

  async function downloadCertificate(courseId: string) {
    try {
      const response = await fetch(`/api/users/${userId}/courses/${courseId}/certificate`, {
        credentials: 'include',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `course-certificate-${courseId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)

        toast.success('Certifikat nedladdat', {
          description: 'Ditt kurscertifikat har laddats ner.',
        })
      } else {
        throw new Error('Certificate download failed')
      }
    } catch (error) {
      console.error('Certificate download error:', error)
      toast.error('Nedladdningsfel', {
        description: 'Kunde inte ladda ner certifikatet.',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE')
  }

  const formatPrice = (amount: number) => {
    return `${amount} SEK`
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-blue-100 text-blue-800'
      case 'advanced':
        return 'bg-orange-100 text-orange-800'
      case 'expert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Nybörjare'
      case 'intermediate':
        return 'Fortsättning'
      case 'advanced':
        return 'Avancerad'
      case 'expert':
        return 'Expert'
      default:
        return level
    }
  }

  const getAccessStatusColor = (access: string) => {
    switch (access) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAccessStatusText = (access: string) => {
    switch (access) {
      case 'active':
        return 'Aktiv'
      case 'expired':
        return 'Utgången'
      case 'pending':
        return 'Väntande'
      default:
        return access
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for Course Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-24" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-80" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Skeleton for Course Cards */}
              {[...Array(2)].map((_, index) => (
                <Card key={index} className="border border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Course Image Skeleton */}
                      <div className="flex-shrink-0">
                        <Skeleton className="w-full lg:w-48 h-32 rounded-md" />
                      </div>

                      {/* Course Info Skeleton */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <Skeleton className="h-6 w-64" />
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-5 w-20" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-48" />
                        </div>

                        {/* Progress Skeleton */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="w-full h-2 rounded-full" />
                          <div className="flex items-center justify-between text-xs">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>

                        {/* Actions Skeleton */}
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-9 w-32" />
                          <Skeleton className="h-9 w-36" />
                        </div>

                        {/* Purchase Info Skeleton */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Purchased Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Mina vinprovningar</span>
          </CardTitle>
          <CardDescription>Vinprovningar du har köpt och deras framsteg.</CardDescription>
        </CardHeader>
        <CardContent>
          {purchasedCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Du har inte köpt några vinprovningar än.</p>
              <Button className="mt-4" onClick={() => (window.location.href = '/vinprovningar')}>
                Utforska vinprovningar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {purchasedCourses.map((course) => (
                <Card key={course.id} className="border border-border">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Course Image */}
                      {course.featuredImage && (
                        <div className="flex-shrink-0">
                          <img
                            src={course.featuredImage.url}
                            alt={course.featuredImage.alt}
                            className="w-full lg:w-48 h-32 object-cover rounded-md"
                          />
                        </div>
                      )}

                      {/* Course Info */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold">{course.title}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={getLevelColor(course.level)}>
                                {getLevelText(course.level)}
                              </Badge>
                              <Badge className={getAccessStatusColor(course.access)}>
                                {getAccessStatusText(course.access)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {course.shortDescription}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Instruktör: {course.instructor.firstName} {course.instructor.lastName}
                          </p>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Framsteg</span>
                            <span className="font-medium">{course.progress.percentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-secondary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${course.progress.percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {course.progress.completedLessons} av {course.progress.totalLessons}{' '}
                              moment
                            </span>
                            {course.progress.lastAccessed && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Senast: {formatDate(course.progress.lastAccessed)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-3">
                          <Button
                            onClick={() => handleCourseAccess(course)}
                            disabled={course.access !== 'active' || accessingCourse === course.id}
                            className="flex items-center space-x-2"
                          >
                            {accessingCourse === course.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : course.progress.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                            <span>
                              {course.progress.completed
                                ? 'Granska vinprovning'
                                : 'Fortsätt vinprovning'}
                            </span>
                          </Button>

                          {course.progress.certificateAvailable && (
                            <Button
                              variant="outline"
                              onClick={() => downloadCertificate(course.id)}
                              className="flex items-center space-x-2"
                            >
                              <Trophy className="h-4 w-4" />
                              <span>Ladda ner certifikat</span>
                            </Button>
                          )}
                        </div>

                        {/* Purchase Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Köpt: {formatDate(course.purchaseDate)}
                          </span>
                          <span>{formatPrice(course.price)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
