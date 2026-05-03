import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import { ReviewSubmissionForm } from '@/components/course/ReviewSubmissionForm'

interface ReviewPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { slug } = await params
  const { token } = await searchParams
  const payload = await getPayload({ config })

  // Fetch the course by slug
  const courseResult = await payload.find({
    collection: 'vinprovningar',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    depth: 1,
    limit: 1,
  })

  if (!courseResult.docs.length) {
    notFound()
  }

  const course = courseResult.docs[0]

  // Validate token if provided - find the enrollment with this token
  let isValidToken = false
  let enrollmentUserId: number | null = null

  if (token) {
    const enrollmentResult = await payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { course: { equals: course.id } },
          { 'reviewTracking.reviewEmailToken': { equals: token } },
        ],
      },
      limit: 1,
      depth: 1,
    })

    if (enrollmentResult.docs.length > 0) {
      isValidToken = true
      const enrollment = enrollmentResult.docs[0]
      enrollmentUserId =
        typeof enrollment.user === 'object' ? (enrollment.user as any).id : enrollment.user
    }
  }

  const featuredImage =
    typeof course.featuredImage === 'object' && course.featuredImage
      ? (course.featuredImage as any).url
      : null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-medium mb-2">
            Betygsätt vinprovningen
          </h1>
          <p className="text-muted-foreground">
            Berätta vad du tyckte om <span className="font-medium text-foreground">{course.title}</span>
          </p>
        </div>

        <ReviewSubmissionForm
          courseId={course.id}
          courseTitle={course.title}
          courseSlug={course.slug || ''}
          featuredImageUrl={featuredImage}
          token={token}
          isValidToken={isValidToken}
          enrollmentUserId={enrollmentUserId}
        />
      </div>
    </div>
  )
}
