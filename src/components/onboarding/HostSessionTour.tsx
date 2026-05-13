'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import type { Step, EventData } from 'react-joyride'

const Joyride = dynamic(
  () => import('react-joyride').then((mod) => ({ default: mod.Joyride })),
  { ssr: false },
)

const STORAGE_KEY = 'vk_tour_host_session_done'

export interface HostSessionTourProps {
  blind: boolean
  hasTimer: boolean
}

export function HostSessionTour({ blind, hasTimer }: HostSessionTourProps) {
  const [run, setRun] = React.useState(false)
  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setRun(true)
    } catch {}
  }, [])

  const steps: Step[] = React.useMemo(() => {
    const out: Step[] = [
      {
        target: '[data-tour="session-set-focus"]',
        content: 'Tryck här för att tala om vilket vin ni provar nu.',
        skipBeacon: true,
      },
    ]
    if (blind) {
      out.push({
        target: '[data-tour="session-reveal"]',
        content: 'I blindprovning kan du avslöja vinerna ett i taget.',
      })
    }
    if (hasTimer) {
      out.push({
        target: '[data-tour="session-timer"]',
        content: 'Räknaren håller takten. Klar med ett vin? Gå vidare när du vill.',
      })
    }
    return out
  }, [blind, hasTimer])

  if (!run) return null
  return (
    <Joyride
      steps={steps}
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
