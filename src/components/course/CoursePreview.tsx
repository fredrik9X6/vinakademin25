'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Clock,
  Users,
  Star,
  BookOpen,
  Award,
  Play,
  ChevronRight,
  Lock,
  Check,
  Calendar,
  DollarSign,
  Globe,
  User,
  MessageSquare,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CoursePreviewProps {
  course: {
    id: string
    title: string
    shortDescription: string
    description: string
    thumbnailImage?: {
      url: string
      alt: string
    }
    price: number
    originalPrice?: number
    isFree: boolean
    subscriptionRequired: boolean
    level: string
    category: string
    featured: boolean
    duration: number
    tags: Array<{ tag: string }>
    instructor: {
      id: string
      name: string
      email: string
      profileImage?: {
        url: string
      }
      bio?: string
    }
    modules: Array<{
      id: string
      title: string
      shortDescription: string
      lessons: Array<{
        id: string
        title: string
        type: string
        estimatedDuration: number
        isPreview: boolean
      }>
    }>
    prerequisites: Array<{
      id: string
      title: string
    }>
    learningOutcomes: Array<{ outcome: string }>
    seo: {
      metaTitle?: string
      metaDescription?: string
      keywords?: Array<{ keyword: string }>
    }
    settings: {
      maxEnrollments?: number
      enrollmentStartDate?: string
      enrollmentEndDate?: string
      courseStartDate?: string
      courseEndDate?: string
      certificateEnabled: boolean
      passingScore: number
    }
    analytics: {
      totalEnrollments: number
      completionRate: number
      averageRating: number
      totalRatings: number
    }
  }
  reviews?: Array<{
    id: string
    user: {
      name: string
      profileImage?: { url: string }
    }
    rating: number
    comment: string
    createdAt: string
    helpful: number
  }>
  isEnrolled?: boolean
  userProgress?: {
    completedLessons: string[]
    progressPercentage: number
  }
}

export default function CoursePreview({
  course,
  reviews = [],
  isEnrolled = false,
  userProgress,
}: CoursePreviewProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const totalLessons = course.modules.reduce((count, module) => count + module.lessons.length, 0)
  const previewLessons = course.modules.flatMap((module) =>
    module.lessons.filter((lesson) => lesson.isPreview),
  )

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(price)
  }

  const canEnroll = () => {
    if (
      course.settings.maxEnrollments &&
      course.analytics.totalEnrollments >= course.settings.maxEnrollments
    ) {
      return false
    }
    if (
      course.settings.enrollmentEndDate &&
      new Date() > new Date(course.settings.enrollmentEndDate)
    ) {
      return false
    }
    return true
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {course.category}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {course.level}
                </Badge>
                {course.featured && (
                  <Badge variant="secondary" className="bg-yellow-500 text-black">
                    Featured
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-medium mb-4">{course.title}</h1>
              <p className="text-lg md:text-xl mb-6 text-muted-foreground">
                {course.shortDescription}
              </p>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {renderStars(Math.floor(course.analytics.averageRating))}
                  </div>
                  <span className="text-sm">
                    {course.analytics.averageRating.toFixed(1)} ({course.analytics.totalRatings}{' '}
                    reviews)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{course.analytics.totalEnrollments} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{course.duration} hours</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={course.instructor.profileImage?.url} />
                  <AvatarFallback>{course.instructor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{course.instructor.name}</p>
                  <p className="text-sm text-muted-foreground">Course Instructor</p>
                </div>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <Card className="w-full max-w-md">
                <CardHeader>
                  {course.thumbnailImage && (
                    <div className="relative aspect-video mb-4 overflow-hidden rounded-lg">
                      <img
                        src={course.thumbnailImage.url}
                        alt={course.thumbnailImage.alt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Button size="lg" variant="secondary">
                          <Play className="w-5 h-5 mr-2" />
                          Preview Course
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    {course.isFree ? (
                      <div className="text-2xl font-medium text-secondary">Free</div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl font-medium">{formatPrice(course.price)}</span>
                        {course.originalPrice && (
                          <span className="text-lg text-muted-foreground line-through">
                            {formatPrice(course.originalPrice)}
                          </span>
                        )}
                      </div>
                    )}

                    {course.subscriptionRequired && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Included with subscription
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {isEnrolled ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">
                            {userProgress?.progressPercentage || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-secondary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${userProgress?.progressPercentage || 0}%` }}
                          />
                        </div>
                        <Button className="w-full" size="lg">
                          Continue Learning
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" size="lg" disabled={!canEnroll()}>
                        {canEnroll() ? 'Enroll Now' : 'Enrollment Closed'}
                      </Button>
                    )}

                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{totalLessons} lessons</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration} hours of content</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>Access on all devices</span>
                      </div>
                      {course.settings.certificateEnabled && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          <span>Certificate of completion</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p>{course.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Learning Outcomes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {course.learningOutcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{outcome.outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {course.prerequisites.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Prerequisites</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {course.prerequisites.map((prereq) => (
                          <li key={prereq.id} className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span>{prereq.title}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                    <CardDescription>
                      {course.modules.length} modules • {totalLessons} lessons • {course.duration}{' '}
                      hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {course.modules.map((module, index) => (
                        <div key={module.id} className="border rounded-lg">
                          <button
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                            onClick={() =>
                              setSelectedModule(selectedModule === module.id ? null : module.id)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">
                                  Module {index + 1}: {module.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {module.shortDescription}
                                </p>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {module.lessons.length} lessons
                              </div>
                            </div>
                          </button>

                          {selectedModule === module.id && (
                            <div className="border-t">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <div key={lesson.id} className="p-4 border-b last:border-b-0">
                                  <div className="flex items-center gap-3">
                                    {lesson.isPreview ? (
                                      <Play className="w-4 h-4 text-secondary" />
                                    ) : (
                                      <Lock className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <div className="flex-1">
                                      <h4 className="font-medium">{lesson.title}</h4>
                                      <div className="flex items-center gap-4 mt-1">
                                        <span className="text-sm text-muted-foreground">
                                          {lesson.type}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {lesson.estimatedDuration} min
                                        </span>
                                        {lesson.isPreview && (
                                          <Badge variant="outline" className="text-xs">
                                            Preview
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Meet Your Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={course.instructor.profileImage?.url} />
                        <AvatarFallback className="text-2xl">
                          {course.instructor.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-medium">{course.instructor.name}</h3>
                        <p className="text-muted-foreground mt-2">{course.instructor.bio}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Reviews</CardTitle>
                    <CardDescription>
                      {course.analytics.totalRatings} reviews •{' '}
                      {course.analytics.averageRating.toFixed(1)} average rating
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-b-0">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarImage src={review.user.profileImage?.url} />
                              <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{review.user.name}</h4>
                                <div className="flex">{renderStars(review.rating)}</div>
                              </div>
                              <p className="text-foreground mb-2">{review.comment}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{formatDistanceToNow(new Date(review.createdAt))} ago</span>
                                <button className="flex items-center gap-1 hover:text-foreground">
                                  <MessageSquare className="w-4 h-4" />
                                  Helpful ({review.helpful})
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-secondary" />
                    <span className="text-sm">{totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span className="text-sm">{course.duration} hours total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-secondary" />
                    <span className="text-sm">Lifetime access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-secondary" />
                    <span className="text-sm">Certificate included</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {course.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag.tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
