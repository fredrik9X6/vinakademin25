'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PRICE_RANGE_OPTIONS,
  TASTING_EXPERIENCE_OPTIONS,
  WINE_STYLE_OPTIONS,
} from '@/lib/wine-preferences-options'
import { ChevronLeft, Sparkles } from 'lucide-react'

const ONBOARDING_GOAL_OPTIONS = [
  {
    value: 'learn_basics',
    label: 'Grunderna i vin',
    description: 'Bygga trygghet kring glaset — utan krångel.',
  },
  {
    value: 'pairing_confident',
    label: 'Mat och vin',
    description: 'Känna dig säkrare när du väljer till middagen.',
  },
  {
    value: 'explore_regions',
    label: 'Utforska nytt',
    description: 'Nya regioner, druvor och stilar i din egen takt.',
  },
  {
    value: 'deep_knowledge',
    label: 'Djupare kunskap',
    description: 'Nörda ner dig i detaljer, terroir och stil.',
  },
] as const

interface OnboardingWizardProps {
  source: 'registration' | 'guest_checkout'
  nextPath: string
}

const STEP_COUNT = 6

export function OnboardingWizard({ source, nextPath }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [goal, setGoal] = useState('learn_basics')
  const [tastingExperience, setTastingExperience] = useState('Nybörjare')
  const [priceRange, setPriceRange] = useState('mid')
  const [preferredStyles, setPreferredStyles] = useState<string[]>([])
  const [newsletter, setNewsletter] = useState(true)
  const [courseProgress, setCourseProgress] = useState(true)
  const [newCourses, setNewCourses] = useState(true)

  const progressPercent = Math.round(((step + 1) / STEP_COUNT) * 100)

  const toggleString = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const submit = async (action: 'complete' | 'skip') => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          source,
          goal,
          tastingExperience,
          priceRange,
          preferredStyles,
          favoriteGrapes: [],
          favoriteRegions: [],
          notifications: {
            newsletter,
            courseProgress,
            newCourses,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte spara onboarding')
      }

      toast.success(action === 'skip' ? 'Onboarding hoppades över' : 'Välkommen — vi har sparat dina val')
      router.push(nextPath)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ett fel inträffade'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <Card className="w-full max-w-lg border-0 bg-transparent shadow-none sm:max-w-xl">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Steg {step + 1} av {STEP_COUNT}
          </span>
          <button
            type="button"
            className="shrink-0 underline-offset-4 hover:underline"
            onClick={() => submit('skip')}
            disabled={isSubmitting}
          >
            Hoppa över allt
          </button>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      <CardContent className="space-y-8 px-0">
        {step === 0 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
                Välkommen till Vinakademin
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
                Några korta frågor hjälper oss att anpassa din första tid här. Du kan alltid ändra
                svaren i din profil.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-medium tracking-tight">Vad vill du få ut av Vinakademin?</h2>
              <p className="text-muted-foreground text-sm">Välj det som känns mest rätt just nu.</p>
            </div>
            <div className="grid gap-3">
              {ONBOARDING_GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setGoal(opt.value)
                  }}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-colors',
                    goal === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted',
                  )}
                >
                  <div className="font-medium">{opt.label}</div>
                  <p className="text-muted-foreground mt-1 text-sm leading-snug">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-medium tracking-tight">Hur skulle du beskriva din vinkunskap?</h2>
              <p className="text-muted-foreground text-sm">Inget rätt eller fel — vi utgår från var du är.</p>
            </div>
            <div className="grid gap-3">
              {TASTING_EXPERIENCE_OPTIONS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setTastingExperience(level.value)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-colors',
                    tastingExperience === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted',
                  )}
                >
                  <div className="font-medium">{level.label}</div>
                  <p className="text-muted-foreground mt-1 text-sm leading-snug">{level.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-medium tracking-tight">Vilka vinstilar gillar du?</h2>
              <p className="text-muted-foreground text-sm">Välj en eller flera — eller gå vidare och fyll i senare.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {WINE_STYLE_OPTIONS.map((style) => {
                const on = preferredStyles.includes(style.value)
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setPreferredStyles((c) => toggleString(c, style.value))}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted',
                    )}
                  >
                    {style.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-medium tracking-tight">Ungefär vilken prisklass köper du oftast?</h2>
              <p className="text-muted-foreground text-sm">Vi använder det för att tipsa om innehåll som passar din vardag.</p>
            </div>
            <div className="grid gap-3">
              {PRICE_RANGE_OPTIONS.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => setPriceRange(range.value)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left font-medium transition-colors',
                    priceRange === range.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted',
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-medium tracking-tight">Hur vill vi hålla kontakten?</h2>
              <p className="text-muted-foreground text-sm">Du kan ändra detta när som helst under Notiser i profilen.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="onb-newsletter" className="text-base">
                    Nyhetsbrev
                  </Label>
                  <p className="text-muted-foreground text-xs">Tips, inspiration och nyheter från Vinakademin.</p>
                </div>
                <Switch
                  id="onb-newsletter"
                  checked={newsletter}
                  onCheckedChange={setNewsletter}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="onb-course" className="text-base">
                    Framsteg
                  </Label>
                  <p className="text-muted-foreground text-xs">Påminnelser om dina vinprovningar och lektioner.</p>
                </div>
                <Switch
                  id="onb-course"
                  checked={courseProgress}
                  onCheckedChange={setCourseProgress}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="onb-new" className="text-base">
                    Nya vinprovningar
                  </Label>
                  <p className="text-muted-foreground text-xs">När vi släpper något du kan vara intresserad av.</p>
                </div>
                <Switch
                  id="onb-new"
                  checked={newCourses}
                  onCheckedChange={setNewCourses}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className="sm:w-auto">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Tillbaka
            </Button>
          )}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            {step < STEP_COUNT - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isSubmitting}
                className="btn-brand sm:min-w-[8rem]"
              >
                {step === 0 ? 'Kom igång' : 'Nästa'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submit('complete')}
                disabled={isSubmitting}
                className="btn-brand sm:min-w-[8rem]"
              >
                {isSubmitting ? 'Sparar…' : 'Spara och gå vidare'}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
