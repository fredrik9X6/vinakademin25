'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  Wine,
  Target,
  Zap,
  Star,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// TODO: Implement PostHog tracking
// import { usePostHog } from 'posthog-js/react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export default function VinkompassClient() {
  const router = useRouter()

  useEffect(() => {
    // TODO: Track page view with PostHog
    // const posthog = usePostHog()
    // posthog?.capture('vinkompass_landing_viewed')
  }, [])

  const handleStartQuiz = () => {
    // TODO: Track button click with PostHog
    // const posthog = usePostHog()
    // posthog?.capture('vinkompass_start_clicked', {
    //   source: 'landing_page',
    //   timestamp: new Date().toISOString(),
    // })

    // Navigate to quiz start page
    // TODO: Update this route when quiz funnel is implemented
    router.push('/vinkompass/start')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-300/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30">
                <Sparkles className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-medium text-brand-400">Upptäck din vinprofil</span>
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight"
            >
              Vinkompassen
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto"
            >
              Ta reda på vilken vinprofil du har och få personliga rekommendationer baserat på dina
              smakpreferenser
            </motion.p>

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleStartQuiz} className="btn-brand btn-brand-lg">
                Börja testet
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-400" />
                <span>Tar cirka 5 minuter</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-400" />
                <span>100% gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-400" />
                <span>1000+ har redan testat</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What You'll Get Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-96 h-96 bg-brand-300/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-72 h-72 bg-brand-400/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30 mb-6">
              <Target className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">Vad du får</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-4">
              Personliga vinrekommendationer
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Baserat på dina svar får du en unik vinprofil och rekommendationer för viner som passar
              just dig
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Wine,
                title: 'Din vinprofil',
                description:
                  'Upptäck vilken typ av vinsmakare du är och lär dig mer om din smakprofil',
              },
              {
                icon: Sparkles,
                title: 'Personliga rekommendationer',
                description:
                  'Få viner rekommenderade specifikt för dig baserat på dina preferenser och smak',
              },
              {
                icon: BarChart3,
                title: 'Dina smaktrender',
                description:
                  'Se en översikt över dina smakpreferenser och hur de jämförs med andra',
              },
            ].map((benefit, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-border hover:border-brand-400/20">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-300/20 to-brand-400/20 mb-4">
                      <benefit.icon className="h-8 w-8 text-brand-400" />
                    </div>
                    <h3 className="text-xl font-medium">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden bg-muted/30">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-10 w-96 h-96 bg-brand-300/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-72 h-72 bg-brand-400/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30 mb-6">
              <Zap className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">Så fungerar det</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-4">
              Enkelt och snabbt
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fyra enkla steg till din personliga vinprofil
            </p>
          </motion.div>

          {/* Desktop: Steps with connecting line */}
          <div className="hidden lg:block relative">
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-brand-gradient-tri opacity-20" />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={containerVariants}
              className="grid grid-cols-4 gap-8"
            >
              {[
                {
                  icon: Target,
                  title: 'Svara på frågor',
                  description: 'Svar på frågor om dina smakpreferenser och vinupplevelser',
                  step: '01',
                },
                {
                  icon: BarChart3,
                  title: 'Analysera dina svar',
                  description: 'Vårt system analyserar dina svar och identifierar dina smaktrender',
                  step: '02',
                },
                {
                  icon: Sparkles,
                  title: 'Få din profil',
                  description: 'Upptäck din unika vinprofil och vad den säger om dig',
                  step: '03',
                },
                {
                  icon: Wine,
                  title: 'Personliga rekommendationer',
                  description: 'Få viner rekommenderade specifikt för din smakprofil',
                  step: '04',
                },
              ].map((step, index) => (
                <motion.div key={index} variants={itemVariants} className="relative">
                  <div className="relative z-10 mx-auto w-24 h-24 rounded-full bg-brand-gradient-diagonal p-0.5 mb-6 group hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <step.icon className="h-10 w-10 text-brand-400" />
                    </div>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="inline-block px-3 py-1 rounded-full bg-brand-300/10 border border-brand-300/30">
                      <span className="text-xs font-semibold text-brand-400">STEG {step.step}</span>
                    </div>
                    <h3 className="text-xl font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Mobile/Tablet: Cards */}
          <div className="lg:hidden space-y-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={containerVariants}
            >
              {[
                {
                  icon: Target,
                  title: 'Svara på frågor',
                  description: 'Svar på frågor om dina smakpreferenser och vinupplevelser',
                  step: '01',
                },
                {
                  icon: BarChart3,
                  title: 'Analysera dina svar',
                  description: 'Vårt system analyserar dina svar och identifierar dina smaktrender',
                  step: '02',
                },
                {
                  icon: Sparkles,
                  title: 'Få din profil',
                  description: 'Upptäck din unika vinprofil och vad den säger om dig',
                  step: '03',
                },
                {
                  icon: Wine,
                  title: 'Personliga rekommendationer',
                  description: 'Få viner rekommenderade specifikt för din smakprofil',
                  step: '04',
                },
              ].map((step, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="relative overflow-hidden border-l-4 border-l-brand-400 hover:shadow-xl transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-gradient-diagonal p-0.5 group-hover:scale-110 transition-transform duration-300">
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <step.icon className="h-7 w-7 text-brand-400" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="inline-block px-3 py-1 rounded-full bg-brand-300/10 border border-brand-300/30">
                            <span className="text-xs font-semibold text-brand-400">
                              STEG {step.step}
                            </span>
                          </div>
                          <h3 className="text-xl font-medium">{step.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-96 h-96 bg-brand-300/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30 mb-6">
              <Star className="h-4 w-4 text-brand-400 fill-brand-400" />
              <span className="text-sm font-medium text-brand-400">Vad andra säger</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-4">
              Nöjda användare
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                quote:
                  'Jag trodde inte att ett quiz kunde vara så användbart. Mina rekommendationer har varit spot on!',
                author: 'Anna S.',
                rating: 5,
              },
              {
                quote:
                  'Perfekt för någon som är nybörjare och inte vet vad man ska välja. Mycket bra rekommendationer!',
                author: 'Erik L.',
                rating: 5,
              },
              {
                quote:
                  'Snabbt, enkelt och gav mig faktiskt bra tips på viner jag aldrig hade provat innan.',
                author: 'Maria K.',
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-border hover:border-brand-400/20">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-brand-400 text-brand-400"
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{testimonial.quote}</p>
                    <p className="text-sm font-medium">{testimonial.author}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-300/5 via-transparent to-brand-400/5" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-300/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-brand-400/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-300/10 border border-brand-300/30 mb-6">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">Redo att börja?</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Upptäck din vinprofil nu
            </h2>

            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Ta vinkompassen och få personliga rekommendationer baserat på dina smakpreferenser.
              Det tar bara några minuter och är helt gratis.
            </p>

            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <button onClick={handleStartQuiz} className="btn-brand btn-brand-lg">
                Börja testet nu
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 border-t border-brand-300/20"
            >
              {[
                {
                  icon: CheckCircle2,
                  title: '100% gratis',
                  description: 'Inga kostnader eller dolda avgifter',
                },
                {
                  icon: Clock,
                  title: 'Tar 5 minuter',
                  description: 'Snabb och enkel att genomföra',
                },
                {
                  icon: Users,
                  title: '1000+ nöjda',
                  description: 'Användare som redan har testat',
                },
              ].map((feature, index) => (
                <motion.div key={index} variants={itemVariants} className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-brand-300/20 to-brand-400/20">
                    <feature.icon className="h-7 w-7 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

