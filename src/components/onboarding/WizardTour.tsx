'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { Step, EventData } from 'react-joyride'

// react-joyride v3 exports `Joyride` as a named export. Wrap it so next/dynamic
// can lazy-load the default-style component.
const Joyride = dynamic(
  () => import('react-joyride').then((mod) => ({ default: mod.Joyride })),
  { ssr: false },
)

const STORAGE_KEY = 'vk_tour_wizard_done'

const STEPS: Step[] = [
  {
    target: '[data-tour="wizard-title"]',
    content: 'Börja med en titel. Det här är vad både du och dina gäster ser.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="wizard-wines"]',
    content: 'Lägg till 3–8 viner. Du kan välja från vårt bibliotek eller skriva egna.',
  },
  {
    target: '[data-tour="wizard-save"]',
    content: 'Spara som utkast. Du kan komma tillbaka och ändra när som helst.',
  },
]

export function WizardTour() {
  const [run, setRun] = React.useState(false)
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setRun(true)
    } catch {
      // localStorage unavailable; skip
    }
  }, [])
  if (!run) return null
  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      locale={{
        back: 'Tillbaka',
        close: 'Stäng',
        last: 'Klar',
        next: 'Nästa',
        nextWithProgress: 'Nästa ({current}/{total})',
        skip: 'Hoppa över',
      }}
      options={{
        primaryColor: '#FB914C',
        zIndex: 10000,
        showProgress: true,
        overlayClickAction: false,
        buttons: ['back', 'skip', 'primary'],
        scrollOffset: 80,
      }}
      onEvent={(data: EventData) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          setRun(false)
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {}
        }
      }}
    />
  )
}
