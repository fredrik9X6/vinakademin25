'use client'

import NeuralNetworkHero from '@/components/ui/neural-network-hero'

interface NeuralHeroWithBannerProps {
  featuredCourse?: any
}

export function NeuralHeroWithBanner({ featuredCourse }: NeuralHeroWithBannerProps) {
  const featuredSlug = featuredCourse?.slug || ''

  return (
    <NeuralNetworkHero
      title={
        <>
          Vinprovningar hemma,
          <br />
          <span className="text-brand-gradient">enkelt &amp; opretentiöst.</span>
        </>
      }
      description="Guidade vinprovningar du kan göra hemma, med vänner, när det passar dig. Lär dig om vin genom att dofta, smaka och prata."
      ctaButtons={[
        { text: 'Kom igång', href: `/vinprovningar/${featuredSlug}`, primary: true },
        { text: 'Se alla vinprovningar', href: '/vinprovningar' },
      ]}
      microDetails={['300+ prenumeranter', 'Prova gratis', 'Livstidsåtkomst']}
    />
  )
}
