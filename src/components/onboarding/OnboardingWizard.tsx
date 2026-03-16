'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface OptionItem {
  id: number
  label: string
}

interface OnboardingWizardProps {
  source: 'registration' | 'guest_checkout'
  nextPath: string
  grapeOptions: OptionItem[]
  regionOptions: OptionItem[]
}

export function OnboardingWizard({
  source,
  nextPath,
  grapeOptions,
  regionOptions,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [goal, setGoal] = useState('learn_basics')
  const [tastingExperience, setTastingExperience] = useState('Nybörjare')
  const [priceRange, setPriceRange] = useState('mid')
  const [preferredStyles, setPreferredStyles] = useState<string[]>([])
  const [favoriteGrapes, setFavoriteGrapes] = useState<number[]>([])
  const [favoriteRegions, setFavoriteRegions] = useState<number[]>([])
  const [newsletter, setNewsletter] = useState(true)
  const [courseProgress, setCourseProgress] = useState(true)
  const [newCourses, setNewCourses] = useState(true)

  const styleOptions = useMemo(
    () => [
      { value: 'light_red', label: 'Lätta röda viner' },
      { value: 'medium_red', label: 'Medeltunga röda viner' },
      { value: 'full_red', label: 'Fylliga röda viner' },
      { value: 'light_white', label: 'Lätta vita viner' },
      { value: 'full_white', label: 'Fylliga vita viner' },
      { value: 'sparkling', label: 'Mousserande viner' },
      { value: 'rose', label: 'Rosé' },
      { value: 'sweet', label: 'Sött vin' },
    ],
    [],
  )

  const toggleString = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  const toggleNumber = (arr: number[], value: number) =>
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
          favoriteGrapes,
          favoriteRegions,
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

      toast.success(action === 'skip' ? 'Onboarding hoppades över' : 'Onboarding sparad')
      router.push(nextPath)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ett fel inträffade'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Välkommen! Anpassa din vinprofil</CardTitle>
        <CardDescription>
          Svara på några snabba frågor så kan vi ge dig en bättre start. Du kan hoppa över detta och
          ändra senare i din profil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label>Vad är ditt mål just nu?</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option value="learn_basics">Lära mig grunderna i vin</option>
            <option value="pairing_confident">Bli bättre på mat- och vinkombinationer</option>
            <option value="explore_regions">Utforska nya regioner och druvor</option>
            <option value="deep_knowledge">Bygga djupare expertkunskap</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Erfarenhetsnivå</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tastingExperience}
              onChange={(e) => setTastingExperience(e.target.value)}
            >
              <option value="Nybörjare">Nybörjare</option>
              <option value="Medel">Medel</option>
              <option value="Avancerad">Avancerad</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Föredragen prisklass</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
            >
              <option value="budget">Under 200 kr</option>
              <option value="mid">200-500 kr</option>
              <option value="premium">500-1000 kr</option>
              <option value="luxury">Över 1000 kr</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Vilka vinstilar gillar du?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {styleOptions.map((style) => (
              <label key={style.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferredStyles.includes(style.value)}
                  onChange={() => setPreferredStyles((current) => toggleString(current, style.value))}
                />
                {style.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Favoritdruvor (valfritt)</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
              {grapeOptions.map((grape) => (
                <label key={grape.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={favoriteGrapes.includes(grape.id)}
                    onChange={() => setFavoriteGrapes((current) => toggleNumber(current, grape.id))}
                  />
                  {grape.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Favoritregioner (valfritt)</Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
              {regionOptions.map((region) => (
                <label key={region.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={favoriteRegions.includes(region.id)}
                    onChange={() => setFavoriteRegions((current) => toggleNumber(current, region.id))}
                  />
                  {region.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Utskick du vill få</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
              />
              Nyhetsbrev
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={courseProgress}
                onChange={(e) => setCourseProgress(e.target.checked)}
              />
              Påminnelser om kursprogress
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newCourses}
                onChange={(e) => setNewCourses(e.target.checked)}
              />
              Nya vinprovningar
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => submit('complete')} disabled={isSubmitting} className="flex-1">
            Spara och fortsätt
          </Button>
          <Button variant="outline" onClick={() => submit('skip')} disabled={isSubmitting} className="flex-1">
            Hoppa över tills vidare
          </Button>
        </div>

        <Input type="hidden" value={source} readOnly />
      </CardContent>
    </Card>
  )
}
