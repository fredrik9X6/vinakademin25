'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/components/analytics'

interface OnboardingChecklistProps {
  userId: number
  /** Whether the user already owns a tasting plan. */
  hasTastingPlan: boolean
  /** Whether the user has set their handle (proxy for "touched profile"). */
  hasHandle: boolean
  /** Drives the 14-day auto-hide. ISO string. */
  welcomeEmailSentAt: string | null
}

const STORAGE_KEY_VISITED_LIBRARY = 'vinakademin:onboarding:visited-library'
const STORAGE_KEY_DISMISSED = 'vinakademin:onboarding:dismissed'

/** 14 days in ms — onboarding panel auto-hides after this. */
const AUTO_HIDE_MS = 14 * 24 * 60 * 60 * 1000

export function OnboardingChecklist({
  userId,
  hasTastingPlan,
  hasHandle,
  welcomeEmailSentAt,
}: OnboardingChecklistProps) {
  const [visitedLibrary, setVisitedLibrary] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setVisitedLibrary(localStorage.getItem(STORAGE_KEY_VISITED_LIBRARY) === '1')
      setDismissed(localStorage.getItem(STORAGE_KEY_DISMISSED) === '1')
    } catch {
      // localStorage unavailable — fall through, panel shows.
    }
  }, [])

  if (!mounted) return null
  if (dismissed) return null

  const ageMs = welcomeEmailSentAt
    ? Date.now() - new Date(welcomeEmailSentAt).getTime()
    : 0
  if (welcomeEmailSentAt && ageMs > AUTO_HIDE_MS) return null

  const steps = [
    {
      key: 'library',
      label: 'Bläddra i biblioteket',
      done: visitedLibrary,
      href: '/provningsmallar',
      ctaLabel: 'Öppna biblioteket',
      onClick: () => {
        try {
          localStorage.setItem(STORAGE_KEY_VISITED_LIBRARY, '1')
        } catch {
          // ignore
        }
        trackEvent('onboarding_step_clicked', { step: 'library', userId })
      },
    },
    {
      key: 'plan',
      label: 'Skapa din första provning',
      done: hasTastingPlan,
      href: '/skapa-provning',
      ctaLabel: 'Starta',
      onClick: () => {
        trackEvent('onboarding_step_clicked', { step: 'plan', userId })
      },
    },
    {
      key: 'profile',
      label: 'Anpassa din profil',
      done: hasHandle,
      href: '/profil',
      ctaLabel: 'Öppna profilen',
      onClick: () => {
        trackEvent('onboarding_step_clicked', { step: 'profile', userId })
      },
    },
  ] as const

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
    trackEvent('onboarding_panel_dismissed', { userId, completedCount })
  }

  return (
    <Card className="border-brand-400/40 bg-brand-400/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">
              {allDone ? 'Du är redo att börja!' : 'Kom igång med Vinakademin+'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allDone
                ? 'Alla steg klara. Stäng panelen när du vill.'
                : `${completedCount} av ${steps.length} klara`}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground rounded p-1 -m-1"
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.key}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-background/60 transition-colors"
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={`flex-1 text-sm ${step.done ? 'text-muted-foreground line-through' : ''}`}
              >
                {step.label}
              </span>
              {!step.done && (
                <Button asChild variant="ghost" size="sm" onClick={step.onClick}>
                  <Link href={step.href}>
                    {step.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
