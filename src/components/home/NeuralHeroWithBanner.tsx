'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import NeuralNetworkHero from '@/components/ui/neural-network-hero'
import { JoinSessionBanner } from './JoinSessionBanner'

interface NeuralHeroWithBannerProps {
  featuredCourse?: any
}

export function NeuralHeroWithBanner({ featuredCourse }: NeuralHeroWithBannerProps) {
  const featuredSlug = featuredCourse?.slug || ''
  const freeItemCount = featuredCourse?.freeItemCount || 0
  const bannerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!bannerRef.current) return

      // Set initial state
      gsap.set(bannerRef.current, {
        autoAlpha: 0,
        y: -16,
      })

      // Wait for fonts to load and hero animation to complete
      document.fonts.ready.then(() => {
        // Animate banner in after a delay (hero animations take about 2 seconds)
        gsap.to(bannerRef.current, {
          autoAlpha: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          delay: 1.8, // Start after hero animations
        })
      })
    },
    { scope: containerRef },
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Neural Network Hero with overlay banner */}
      <NeuralNetworkHero
        title="Vinprovningar hemma, enkelt & opretentiöst."
        description="Guidade vinprovningar du kan göra hemma, med vänner, när det passar dig. Lär dig om vin genom att dofta, smaka och prata."
        ctaButtons={[
          { text: 'Kom igång', href: `/vinprovningar/${featuredSlug}`, primary: true },
          { text: 'Se alla vinprovningar', href: '/vinprovningar' },
        ]}
        microDetails={['300+ nöjda medlemmar', 'Prova gratis', 'Avsluta när du vill']}
      />

      {/* Join Session Banner Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <JoinSessionBanner ref={bannerRef} />
      </div>
    </div>
  )
}
