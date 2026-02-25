import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  BookOpen,
  User,
  ArrowRight,
  Star,
  Play,
  Users,
  Wine,
  ShoppingCart,
  VideoIcon,
  BarChart3,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MuxPlayer from '@mux/mux-player-react'
import { transformCourseWithModules } from '@/lib/course-utils-server'
import { NewsletterSignupBlock } from '@/components/blocks/NewsletterSignupBlock'
import { NeuralHeroWithBanner } from '@/components/home/NeuralHeroWithBanner'
import { FeaturedCourseCard } from '@/components/course/FeaturedCourseCard'

export default async function HomePage() {
  const payload = await getPayload({ config })

  // Fetch featured course, recent courses, and recent blog posts
  const [featuredCourseResult, recentCoursesResult, recentBlogPostsResult] = await Promise.all([
    payload.find({
      collection: 'vinprovningar',
      where: {
        and: [{ isFeatured: { equals: true } }, { _status: { equals: 'published' } }],
      },
      depth: 1,
      limit: 1,
    }),
    payload.find({
      collection: 'vinprovningar',
      where: { _status: { equals: 'published' } },
      depth: 1,
      limit: 3,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'blog-posts',
      where: { _status: { equals: 'published' } },
      depth: 1,
      limit: 3,
      sort: '-publishedAt',
    }),
  ])

  const featuredCourse = featuredCourseResult.docs[0]
  const recentCourses = recentCoursesResult.docs
  const recentBlogPosts = recentBlogPostsResult.docs

  // Transform course with modules - using helper function
  const transformCourse = async (course: any) => {
    return await transformCourseWithModules(course)
  }

  // Transform featured course if it exists
  const transformedFeaturedCourse = featuredCourse ? await transformCourse(featuredCourse) : null

  const coursesWithModules = await Promise.all(recentCourses.map(transformCourse))

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis'
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Neural Network Hero with Join Session Banner */}
      <NeuralHeroWithBanner featuredCourse={transformedFeaturedCourse} />

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#FDBA75]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#FB914C]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
              <span className="text-sm font-medium text-[#FB914C]">Enkelt & intuitivt</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Så fungerar det</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fyra enkla steg till en minnesvärd vinupplevelse
            </p>
          </div>

          {/* Desktop: Steps with connecting line */}
          <div className="hidden lg:block relative">
            {/* Connecting line */}
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FDBA75] via-[#FB914C] to-[#FDBA75] opacity-20" />

            <div className="grid grid-cols-4 gap-8">
              {[
                {
                  icon: ShoppingCart,
                  title: 'Välj en vinprovning',
                  description:
                    'Bläddra bland våra kurerade vinprovningar och välj den som passar dig bäst.',
                  step: '01',
                },
                {
                  icon: Wine,
                  title: 'Köp vinen',
                  description:
                    'Få en lista med viner från Systembolaget. Enkla länkar så du hittar rätt.',
                  step: '02',
                },
                {
                  icon: VideoIcon,
                  title: 'Följ guiden',
                  description:
                    'Bjud in vänner eller gör det själv. Se videor, läs noter och utforska vinerna.',
                  step: '03',
                },
                {
                  icon: BarChart3,
                  title: 'Jämför resultat',
                  description:
                    'Se guidens smaknoter och jämför med dina egna (och gästernas) intryck.',
                  step: '04',
                },
              ].map((step, index) => (
                <div key={index} className="relative">
                  {/* Step number circle */}
                  <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-[#FDBA75] to-[#FB914C] p-0.5 mb-6 group hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <step.icon className="h-10 w-10 text-[#FB914C]" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-3">
                    <div className="inline-block px-3 py-1 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20">
                      <span className="text-xs font-semibold text-[#FB914C]">STEG {step.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet: Cards with vertical flow */}
          <div className="lg:hidden space-y-6">
            {[
              {
                icon: ShoppingCart,
                title: 'Välj en vinprovning',
                description:
                  'Bläddra bland våra kurerade vinprovningar och välj den som passar dig bäst.',
                step: '01',
              },
              {
                icon: Wine,
                title: 'Köp vinen',
                description:
                  'Få en lista med viner från Systembolaget. Enkla länkar så du hittar rätt.',
                step: '02',
              },
              {
                icon: VideoIcon,
                title: 'Följ guiden',
                description:
                  'Bjud in vänner eller gör det själv. Se videor, läs noter och utforska vinerna.',
                step: '03',
              },
              {
                icon: BarChart3,
                title: 'Jämför resultat',
                description:
                  'Se guidens smaknoter och jämför med dina egna (och gästernas) intryck.',
                step: '04',
              },
            ].map((step, index) => (
              <Card
                key={index}
                className="relative overflow-hidden border-l-4 border-l-[#FB914C] hover:shadow-xl transition-all duration-300 group"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Icon circle */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#FDBA75] to-[#FB914C] p-0.5 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <step.icon className="h-7 w-7 text-[#FB914C]" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="inline-block px-3 py-1 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20">
                        <span className="text-xs font-semibold text-[#FB914C]">
                          STEG {step.step}
                        </span>
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Decorative step number */}
                  <div className="absolute top-4 right-4 text-7xl font-bold text-[#FDBA75]/5 select-none">
                    {step.step}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Course Section */}
      {transformedFeaturedCourse && <FeaturedCourseCard course={transformedFeaturedCourse} />}

      {/* Articles Section */}
      {recentBlogPosts.length > 0 && (
        <section className="py-16 lg:py-24 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-10 w-96 h-96 bg-[#FDBA75]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-72 h-72 bg-[#FB914C]/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
                <BookOpen className="h-4 w-4 text-[#FB914C]" />
                <span className="text-sm font-medium text-[#FB914C]">Från vår blogg</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Senaste artiklarna
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Läs våra senaste artiklar om vin, provning och vinkultur
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {recentBlogPosts.map((post: any) => {
                const featuredImageUrl =
                  typeof post.featuredImage === 'object' && post.featuredImage
                    ? post.featuredImage.url
                    : null

                return (
                  <Link key={post.id} href={`/artiklar/${post.slug}`} className="group">
                    <Card className="h-full hover:shadow-xl transition-all duration-300 border-border hover:border-[#FB914C]/20 overflow-hidden">
                      {featuredImageUrl && (
                        <div className="relative w-full aspect-video overflow-hidden">
                          <Image
                            src={featuredImageUrl}
                            alt={post.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {/* Orange overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#FB914C]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {post.category && typeof post.category === 'object' && (
                            <Badge className="bg-[#FDBA75]/10 text-[#FB914C] border-[#FDBA75]/30 hover:bg-[#FDBA75]/20">
                              {post.category.name}
                            </Badge>
                          )}
                          {post.publishedAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.publishedAt).toLocaleDateString('sv-SE', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 group-hover:text-[#FB914C] transition-colors duration-300">
                          {post.title}
                        </CardTitle>
                        {post.excerpt && (
                          <CardDescription className="line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm font-medium text-[#FB914C] group-hover:gap-3 transition-all">
                          Läs artikel
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            <div className="text-center mt-12">
              <Link href="/artiklar">
                <Button
                  variant="outline"
                  size="lg"
                  className="group border-[#FB914C]/30 hover:border-[#FB914C] hover:bg-[#FDBA75]/5"
                >
                  Se alla artiklar
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About/Vision Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-10 w-96 h-96 bg-[#FDBA75]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-72 h-72 bg-[#FB914C]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
              <Wine className="h-4 w-4 text-[#FB914C]" />
              <span className="text-sm font-medium text-[#FB914C]">Vår historia</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Om Vinakademin</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Vi gör vinkunskap enkelt & opretentiöst
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Video */}
            <div className="order-first lg:order-first">
              <div className="relative group">
                {/* Video Container with Orange Border Gradient */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-transparent bg-gradient-to-br from-[#FDBA75] via-[#FB914C] to-[#FDBA75] p-[2px]">
                  <div className="bg-background rounded-2xl overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative">
                      {/* Video Placeholder - Replace with actual video URL */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#FDBA75]/10 to-[#FB914C]/10">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FDBA75] to-[#FB914C] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-lg">Vi är Fredrik & Max</p>
                          <p className="text-sm text-muted-foreground px-4">
                            Låt oss berätta om vår vision för Vinakademin
                          </p>
                        </div>
                      </div>
                      {/* 
                        Replace the placeholder above with actual video:
                        <video 
                          controls 
                          className="w-full h-full"
                          poster="/path-to-poster.jpg"
                        >
                          <source src="/path-to-video.mp4" type="video/mp4" />
                        </video>
                        
                        Or use YouTube/Vimeo embed:
                        <iframe
                          className="w-full h-full"
                          src="https://www.youtube.com/embed/VIDEO_ID"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      */}
                    </div>
                  </div>
                </div>

                {/* Decorative elements around video */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FDBA75]/20 rounded-full blur-2xl -z-10" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#FB914C]/20 rounded-full blur-2xl -z-10" />
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="space-y-8">
              {/* Mission Statement */}
              <div className="relative">
                <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-[#FDBA75] via-[#FB914C] to-[#FDBA75] rounded-full" />
                <blockquote className="text-xl md:text-2xl font-medium leading-relaxed text-foreground pl-4">
                  "Vi skapade Vinakademin för att vi själva{' '}
                  <span className="text-[#FB914C]">inte kunde hitta det</span> vi letade efter."
                </blockquote>
              </div>

              {/* Content */}
              <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                <p>
                  Vi fastnade för vin och hur mycket bättre det smakar när man förstår vad man
                  dricker. Djupet av historier, stilar och sorter är enormt. Efter att ha gått en
                  vinkurs ville vi lära oss mer, men{' '}
                  <span className="font-semibold text-foreground">
                    vi hittade inga resurser som passade oss
                  </span>
                  .
                </p>
                <p>
                  Så vi bestämde oss för att skapa det vi saknade: en plats där vinkunskap är enkelt
                  och opretentiöst. Där du kan lära dig genom att faktiskt smaka och uppleva – utan
                  pretentioner eller krångel.
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/vinprovningar" className="flex-1">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#FB914C] to-[#FDBA75] hover:from-[#FDBA75] hover:to-[#FB914C] text-white shadow-lg shadow-[#FB914C]/25 hover:shadow-xl hover:shadow-[#FB914C]/30"
                  >
                    Upptäck vinprovningar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/om-oss" className="flex-1">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-[#FB914C]/30 hover:border-[#FB914C] hover:bg-[#FDBA75]/5"
                  >
                    Läs mer om oss
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Hidden until we have real testimonials */}
      {/* <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 right-10 w-96 h-96 bg-[#FDBA75]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-10 w-72 h-72 bg-[#FB914C]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
              <Users className="h-4 w-4 text-[#FB914C]" />
              <span className="text-sm font-medium text-[#FB914C]">Medlemmar</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Vad andra säger</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Våra medlemmar delar sina erfarenheter
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote:
                  'Vinprovningarna är precis lagom långa och lärorika. Jag har lärt mig mer på en kväll än jag gjorde på flera års självstudier.',
                author: 'Anna S.',
                role: 'Medlem sedan 2023',
                rating: 5,
              },
              {
                quote:
                  'Fantastiskt koncept! Vi gjorde en vinprovning med vänner och det blev kvällens höjdpunkt. Alla ville veta var vi hade hittat det.',
                author: 'Erik L.',
                role: 'Medlem sedan 2024',
                rating: 5,
              },
              {
                quote:
                  'Äntligen en vinplattform som inte är pretentiös. Tydliga instruktioner och roliga jämförelser med expertens noter.',
                author: 'Maria K.',
                role: 'Medlem sedan 2023',
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="group relative hover:shadow-2xl transition-all duration-300 border-border hover:border-[#FB914C]/20 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FDBA75]/20 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />

                <CardContent className="pt-8 pb-6 px-6 relative">
                  <div className="absolute top-4 left-4 text-6xl font-serif text-[#FDBA75]/20 leading-none">
                    "
                  </div>

                  <div className="flex gap-1 mb-6 relative z-10">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-[#FB914C] text-[#FB914C] group-hover:scale-110 transition-transform"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>

                  <p className="text-base md:text-lg text-foreground mb-8 leading-relaxed relative z-10 min-h-[120px]">
                    {testimonial.quote}
                  </p>

                  <div className="flex items-center gap-4 pt-6 border-t border-[#FDBA75]/20">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FDBA75] to-[#FB914C] p-[2px]">
                        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                          <User className="h-6 w-6 text-[#FB914C]" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#FDBA75]/5 border border-[#FDBA75]/20">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FDBA75] to-[#FB914C] border-2 border-background flex items-center justify-center"
                  >
                    <User className="h-4 w-4 text-white" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">300+ nöjda medlemmar</span>
                <span className="text-muted-foreground"> • Betyg 4.9/5.0</span>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Newsletter Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FDBA75]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Premium Card Container */}
          <Card className="relative overflow-hidden border-2 border-[#FB914C]/20 shadow-2xl">
            {/* Orange gradient border accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FDBA75]/5 via-transparent to-[#FB914C]/5 pointer-events-none" />

            <CardContent className="p-8 md:p-12 relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
                  <Sparkles className="h-4 w-4 text-[#FB914C]" />
                  <span className="text-sm font-medium text-[#FB914C]">Nyhetsbrev</span>
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Håll dig uppdaterad
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                  Få tips om nya viner, vinprovningar och exklusiva erbjudanden direkt i din inbox
                </p>

                {/* Trust indicators with orange accents */}
                <div className="flex flex-wrap justify-center gap-8 mb-8">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[#FDBA75]/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#FB914C]" />
                    </div>
                    <span className="text-foreground font-medium">300+ prenumeranter</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[#FDBA75]/20 flex items-center justify-center">
                      <Star className="h-4 w-4 text-[#FB914C] fill-[#FB914C]" />
                    </div>
                    <span className="text-foreground font-medium">80%+ öppningsfrekvens</span>
                  </div>
                </div>
              </div>

              {/* Newsletter Form */}
              <div className="max-w-xl mx-auto">
                <NewsletterSignupBlock
                  title=""
                  description=""
                  buttonText="Prenumerera"
                  placeholderText="Din e-postadress"
                  style="minimal"
                  backgroundColor="transparent"
                  disclaimer="Gratis för alltid. Avsluta prenumerationen när du vill."
                />
              </div>

              {/* Benefits List */}
              <div className="mt-10 pt-8 border-t border-[#FDBA75]/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                  {[
                    {
                      icon: Wine,
                      title: 'Nya vinprovningar',
                      description: 'Var först att få veta',
                    },
                    {
                      icon: Sparkles,
                      title: 'Exklusiva erbjudanden',
                      description: 'Endast för prenumeranter',
                    },
                    {
                      icon: BookOpen,
                      title: 'Vintips & guider',
                      description: 'Lär dig mer om vin',
                    },
                  ].map((benefit, index) => (
                    <div key={index} className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#FDBA75]/20 to-[#FB914C]/20 mb-2">
                        <benefit.icon className="h-6 w-6 text-[#FB914C]" />
                      </div>
                      <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        {/* Background decorative elements - more prominent for final CTA */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FDBA75]/5 via-transparent to-[#FB914C]/5" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#FDBA75]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#FB914C]/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDBA75]/10 border border-[#FDBA75]/20 mb-6">
              <Sparkles className="h-4 w-4 text-[#FB914C]" />
              <span className="text-sm font-medium text-[#FB914C]">Börja din vinresa</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Redo att börja?</h2>

            {/* Description */}
            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Utforska våra vinprovningar och börja din vinresa idag. Det är enkelt, roligt och helt
              på dina villkor.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/vinprovningar">
                <Button
                  size="lg"
                  className="text-base px-8 py-6 bg-gradient-to-r from-[#FB914C] to-[#FDBA75] hover:from-[#FDBA75] hover:to-[#FB914C] text-white shadow-lg shadow-[#FB914C]/25 hover:shadow-xl hover:shadow-[#FB914C]/30 hover:scale-[1.02] transition-all"
                >
                  Utforska vinprovningar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/om-oss">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-[#FB914C]/30 hover:border-[#FB914C] hover:bg-[#FDBA75]/5"
                >
                  Läs mer om oss
                </Button>
              </Link>
            </div>

            {/* Feature highlights with orange accents */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 border-t border-[#FDBA75]/20">
              {[
                {
                  icon: CheckCircle2,
                  title: 'Gratis att prova',
                  description: 'Testa varje vinprovning innan du köper',
                },
                {
                  icon: Wine,
                  title: '30-dagars garanti',
                  description: '100% pengarna tillbaka, inga frågor ställs',
                },
                {
                  icon: Users,
                  title: '300+ nöjda medlemmar',
                  description: 'Gå med i vår växande community',
                },
              ].map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FDBA75]/20 to-[#FB914C]/20 flex items-center justify-center">
                    <feature.icon className="h-7 w-7 text-[#FB914C]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
