import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ArrowRight, BookOpen } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string
  }>
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = await searchParams
  const sessionId = resolvedSearchParams.session_id

  if (!sessionId) {
    redirect('/vinprovningar')
  }

  const user = await getUser()
  if (!user) {
    redirect('/logga-in')
  }

  const payload = await getPayload({ config })

  // Find the order by Stripe session ID
  let order = null
  let course = null
  let enrollment = null

  try {
    const orderResult = await payload.find({
      collection: 'orders',
      where: {
        stripeSessionId: { equals: sessionId },
      },
      limit: 1,
    })

    if (orderResult.docs.length > 0) {
      order = orderResult.docs[0]

      // Get the course
      if (order.items && order.items.length > 0) {
        const courseId =
          typeof order.items[0].course === 'object'
            ? order.items[0].course.id
            : order.items[0].course

        course = await payload.findByID({
          collection: 'courses',
          id: courseId,
        })
      }

      // Check if enrollment was created
      if (course) {
        const enrollmentResult = await payload.find({
          collection: 'enrollments',
          where: {
            and: [{ user: { equals: user.id } }, { course: { equals: course.id } }],
          },
          limit: 1,
        })
        enrollment = enrollmentResult.docs[0] || null
      }
    }
  } catch (error) {
    console.error('Error fetching order:', error)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">Betalning genomförd!</CardTitle>
          <p className="text-muted-foreground">
            Tack för ditt köp. Din beställning har bekräftats.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {course && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
              <h3 className="font-medium mb-2">Du har nu tillgång till:</h3>
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-green-600" />
                <span className="font-medium">{course.title}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold">Vad händer nu?</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">1.</span>
                <span>Du får ett e-postbekräftelse med kvitto</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>Kursen är tillgänglig i dina kurser omedelbart</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>Du har livstidsåtkomst till allt kursmaterial</span>
              </li>
            </ul>
          </div>

          {enrollment ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/vinprovningar/${course?.slug}`} className="flex-1">
                <Button className="w-full" size="lg">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Börja kursen nu
                </Button>
              </Link>
              <Link href="/profil" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Gå till mina kurser
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Din beställning behandlas. Du får tillgång till kursen inom några minuter. Om du
                inte ser kursen inom 10 minuter, kontakta vår support.
              </p>
              <Link href="/profil" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  Kontrollera mina kurser
                </Button>
              </Link>
            </div>
          )}

          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <p>
              Behöver du hjälp? Kontakta oss på{' '}
              <a href="mailto:support@vinakademin.se" className="underline">
                support@vinakademin.se
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = {
  title: 'Betalning genomförd - Vinakademin',
  description: 'Din beställning har bekräftats och kursen är nu tillgänglig.',
}
