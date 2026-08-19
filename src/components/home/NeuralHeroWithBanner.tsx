'use client'

import NeuralNetworkHero from '@/components/ui/neural-network-hero'

export function NeuralHeroWithBanner() {
  return (
    <NeuralNetworkHero
      title={
        <>
          <span className="block">Bjud hem vänner.</span>
          <span className="text-brand-gradient block">Vi fixar vinprovningen.</span>
        </>
      }
      description="Färdiga provningar, inköpslista till Systembolaget och ett värdmanus du kan läsa innantill — gratis. Eller låt Vinkvällen guida hela kvällen åt er."
      ctaButtons={[
        { text: 'Kom igång gratis', href: '/provningsverktyget', primary: true },
        { text: 'Läs om Vinkvällen', href: '/vinkurser' },
      ]}
      microDetails={['300+ prenumeranter', 'Gratis att komma igång', 'Inget abonnemang']}
    />
  )
}
