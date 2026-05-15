'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { Step, EventData } from 'react-joyride'

const Joyride = dynamic(
  () => import('react-joyride').then((mod) => ({ default: mod.Joyride })),
  { ssr: false },
)

const STORAGE_KEY = 'vk_tour_plan_detail_done'

const STEPS: Step[] = [
  {
    target: '[data-tour="detail-start-session"]',
    content: 'Tryck här för att starta en grupp-session med QR-kod.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="detail-shopping-list"]',
    content: 'Få en handlingslista till Systembolaget.',
  },
  {
    target: '[data-tour="detail-print-guide"]',
    content: 'Skriv ut en värdguide som fusk-ark under provningen.',
  },
]

export function PlanDetailTour() {
  const [run, setRun] = React.useState(false)
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setRun(true)
    } catch {}
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
