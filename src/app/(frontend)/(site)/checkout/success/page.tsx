import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, BookOpen, Sparkles, Mail, Clock, Shield } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/stripe'

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
      depth: 1, // Populate course relationship
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
          collection: 'vinprovningar',
          id: courseId,
          depth: 1, // Populate featuredImage and instructor
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

  const courseImage =
    course?.featuredImage && typeof course.featuredImage === 'object'
      ? course.featuredImage.url
      : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Success Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-500 bg-clip-text text-transparent">
            Betalning genomförd!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tack för ditt köp! Din beställning har bekräftats och din vinprovning är nu tillgänglig.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden">
          {course && (
            <div className="bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 p-6 sm:p-8 border-b border-border">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {courseImage && (
                  <div className="flex-shrink-0">
                    <Image
                      src={
                        courseImage.startsWith('http')
                          ? courseImage
                          : `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${courseImage}`
                      }
                      alt={course.title}
                      width={120}
                      height={120}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-border shadow-md"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <h2 className="text-xl sm:text-2xl font-bold">Du har nu tillgång till:</h2>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  )}
                  {order && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Totalt betalat:</span>
                        <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                          {formatPrice(order.amount || 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-8">
            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Vad händer nu?
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-start sm:items-center text-center sm:text-center p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 text-green-600 dark:text-green-400 font-bold text-lg">
                    1
                  </div>
                  <Mail className="w-5 h-5 text-muted-foreground mb-2 mx-auto sm:mx-auto" />
                  <p className="text-sm font-medium">E-postbekräftelse</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Du får ett kvitto på din e-post
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-center text-center sm:text-center p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 text-green-600 dark:text-green-400 font-bold text-lg">
                    2
                  </div>
                  <BookOpen className="w-5 h-5 text-muted-foreground mb-2 mx-auto sm:mx-auto" />
                  <p className="text-sm font-medium">Omedelbar tillgång</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vinprovningen är tillgänglig direkt
                  </p>
                </div>
                <div className="flex flex-col items-start sm:items-center text-center sm:text-center p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 text-green-600 dark:text-green-400 font-bold text-lg">
                    3
                  </div>
                  <Shield className="w-5 h-5 text-muted-foreground mb-2 mx-auto sm:mx-auto" />
                  <p className="text-sm font-medium">Livstidsåtkomst</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tillgång till allt material
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {enrollment ? (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                <Link href={`/vinprovningar/${course?.slug}`} className="flex-1">
                  <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" size="lg">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Börja vinprovningen nu
                  </Button>
                </Link>
                <Link href="/profil" className="flex-1">
                  <Button variant="outline" className="w-full h-12 text-base font-semibold" size="lg">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Gå till mina vinprovningar
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-800/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                      Din beställning behandlas
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                      Du får tillgång till vinprovningen inom några minuter. Om du inte ser
                      vinprovningen inom 10 minuter, kontakta vår support.
                    </p>
                    <Link href="/profil">
                      <Button variant="outline" size="sm" className="border-amber-300 dark:border-amber-700">
                        Kontrollera mina vinprovningar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Support Section */}
            <div className="pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Behöver du hjälp eller har du frågor?
              </p>
              <a
                href="mailto:support@vinakademin.se"
                className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                support@vinakademin.se
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Betalning genomförd - Vinakademin',
  description: 'Din beställning har bekräftats och vinprovningen är nu tillgänglig.',
}
