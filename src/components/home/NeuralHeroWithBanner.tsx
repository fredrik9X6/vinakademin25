'use client'

import NeuralNetworkHero from '@/components/ui/neural-network-hero'

export function NeuralHeroWithBanner() {
  return (
    <NeuralNetworkHero
      title={
        <>
          <span className="block">Lär dig om vin,</span>
          <span className="text-brand-gradient block">enkelt &amp; opretentiöst.</span>
        </>
      }
      description="Färdiga vinkurser och provningsmallar att göra hemma — med vänner eller på egen hand."
      ctaButtons={[
        { text: 'Se vinkurser', href: '/vinkurser', primary: true },
        { text: 'Bläddra i provningsmallar', href: '/provningsmallar' },
      ]}
      microDetails={['300+ prenumeranter', 'Engångsbetalning', 'Livstidsåtkomst']}
    />
  )
}
