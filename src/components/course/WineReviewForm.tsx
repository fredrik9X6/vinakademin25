'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ReviewComparison, { WineReview as ComparisonReview } from './ReviewComparison'
import { Section, InputRow } from './WineReviewFormHelpers'

interface WineReviewFormProps {
  lessonId: number
  courseId?: number
  sessionId?: string
  onSubmit?: () => void
  wineIdProp?: number | string // Accept wine ID from parent to bypass permission issues
}

type ReviewDoc = {
  id: number | string
  rating?: number
  reviewText?: any
  wsetTasting?: any
  createdAt?: string
}

export function WineReviewForm({
  lessonId,
  courseId,
  sessionId,
  onSubmit,
  wineIdProp,
}: WineReviewFormProps) {
  const [rating, setRating] = React.useState<number>(3)
  const [notes, setNotes] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submittedReview, setSubmittedReview] = React.useState<ReviewDoc | null>(null)
  const [answerKey, setAnswerKey] = React.useState<ReviewDoc | null>(null)
  const [history, setHistory] = React.useState<ReviewDoc[]>([])
  const [attemptSubmit, setAttemptSubmit] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [wineId, setWineId] = React.useState<number | string | null>(wineIdProp || null)

  // Get participant ID from localStorage if in a session
  const participantId = React.useMemo(() => {
    if (typeof window !== 'undefined' && sessionId) {
      return localStorage.getItem('participantId')
    }
    return null
  }, [sessionId])

  // WSET field state
  const [appearanceClarity, setAppearanceClarity] = React.useState<string>('')
  const [appearanceIntensity, setAppearanceIntensity] = React.useState<string>('')
  const [appearanceColor, setAppearanceColor] = React.useState<string>('')

  const [noseIntensity, setNoseIntensity] = React.useState<string>('')
  const [primaryAromas, setPrimaryAromas] = React.useState<string[]>([])
  const [secondaryAromas, setSecondaryAromas] = React.useState<string[]>([])
  const [tertiaryAromas, setTertiaryAromas] = React.useState<string[]>([])

  const [palateSweetness, setPalateSweetness] = React.useState<string>('')
  const [palateAcidity, setPalateAcidity] = React.useState<string>('')
  const [palateTannin, setPalateTannin] = React.useState<string>('')
  const [palateAlcohol, setPalateAlcohol] = React.useState<string>('')
  const [palateBody, setPalateBody] = React.useState<string>('')
  const [palateIntensity, setPalateIntensity] = React.useState<string>('')
  const [primaryFlavours, setPrimaryFlavours] = React.useState<string[]>([])
  const [secondaryFlavours, setSecondaryFlavours] = React.useState<string[]>([])
  const [tertiaryFlavours, setTertiaryFlavours] = React.useState<string[]>([])
  const [palateFinish, setPalateFinish] = React.useState<string>('')

  const [quality, setQuality] = React.useState<string>('')

  

  const fetchAnswerKey = React.useCallback(async () => {
    try {
      // depth=2 to resolve answerKeyReview.wine
      const res = await fetch(`/api/lessons/${lessonId}?depth=2`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const key = json?.answerKeyReview
      if (key) {
        setAnswerKey(key)
      }
      // Prefer wine from answer key, fallback to assignedWine
      let derivedWineId: number | string | null = null
      const keyWine = key?.wine
      if (keyWine) {
        derivedWineId = typeof keyWine === 'object' ? keyWine.id : keyWine
      } else if (json?.assignedWine) {
        derivedWineId =
          typeof json.assignedWine === 'object' ? json.assignedWine.id : json.assignedWine
      }
      if (derivedWineId) setWineId(derivedWineId)
    } catch {}
  }, [lessonId])

  const fetchLatestSubmission = React.useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('where[lesson][equals]', String(lessonId))
      params.set('sort', '-createdAt')
      params.set('limit', '5')
      const res = await fetch(`/api/reviews?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const docs = json?.docs || []
      setHistory(docs)
      const latest = docs[0]
      if (latest) setSubmittedReview(latest)
    } catch {}
  }, [lessonId])

  React.useEffect(() => {
    fetchAnswerKey()
    fetchLatestSubmission()
  }, [fetchAnswerKey, fetchLatestSubmission])

  // Function to populate form with existing review data
  const populateFormWithReview = React.useCallback((review: ReviewDoc) => {
    if (!review) return

    // Basic fields
    if (review.rating) setRating(review.rating)
    if (typeof review.reviewText === 'string') setNotes(review.reviewText)

    // WSET fields
    const wset = (review as any).wsetTasting
    if (!wset) return

    // Appearance
    if (wset.appearance?.clarity) setAppearanceClarity(wset.appearance.clarity)
    if (wset.appearance?.intensity) setAppearanceIntensity(wset.appearance.intensity)
    if (wset.appearance?.color) setAppearanceColor(wset.appearance.color)

    // Nose
    if (wset.nose?.intensity) setNoseIntensity(wset.nose.intensity)
    if (wset.nose?.primaryAromas) setPrimaryAromas(wset.nose.primaryAromas)
    if (wset.nose?.secondaryAromas) setSecondaryAromas(wset.nose.secondaryAromas)
    if (wset.nose?.tertiaryAromas) setTertiaryAromas(wset.nose.tertiaryAromas)

    // Palate
    if (wset.palate?.sweetness) setPalateSweetness(wset.palate.sweetness)
    if (wset.palate?.acidity) setPalateAcidity(wset.palate.acidity)
    if (wset.palate?.tannin) setPalateTannin(wset.palate.tannin)
    if (wset.palate?.alcohol) setPalateAlcohol(wset.palate.alcohol)
    if (wset.palate?.body) setPalateBody(wset.palate.body)
    if (wset.palate?.flavourIntensity) setPalateIntensity(wset.palate.flavourIntensity)
    if (wset.palate?.primaryFlavours) setPrimaryFlavours(wset.palate.primaryFlavours)
    if (wset.palate?.secondaryFlavours) setSecondaryFlavours(wset.palate.secondaryFlavours)
    if (wset.palate?.tertiaryFlavours) setTertiaryFlavours(wset.palate.tertiaryFlavours)
    if (wset.palate?.finish) setPalateFinish(wset.palate.finish)

    // Conclusion
    if (wset.conclusion?.quality) setQuality(wset.conclusion.quality)
    if (wset.conclusion?.summary && typeof wset.conclusion.summary === 'string') {
      setNotes(wset.conclusion.summary)
    }
  }, [])

  const { verifiedComparison, historyComparisons } = React.useMemo<{
    verifiedComparison: ComparisonReview | null
    historyComparisons: ComparisonReview[]
  }>(() => {
    const toArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter(Boolean).map(String) : []

    const formatTimestamp = (value?: string) => {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString('sv-SE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    }

    const toComparison = (
      review: ReviewDoc | null,
      options: { label: string; isVerified?: boolean; fallbackId: string },
    ): ComparisonReview | null => {
      if (!review) return null
      const wset = (review as any).wsetTasting || {}
      const appearance = wset.appearance || {}
      const nose = wset.nose || {}
      const palate = wset.palate || {}
      const conclusion = wset.conclusion || wset.conclusions || {}

      return {
        id: review.id ?? options.fallbackId,
        participantName: options.label,
        isVerified: options.isVerified ?? false,
        rating: (review as any).rating,
        clarity: appearance.clarity,
        brightness: appearance.intensity,
        color: appearance.color,
        noseIntensity: nose.intensity,
        noseDevelopment: nose.development,
        aromas: [
          ...toArray(nose.primaryAromas),
          ...toArray(nose.secondaryAromas),
          ...toArray(nose.tertiaryAromas),
        ],
        sweetness: palate.sweetness,
        acidity: palate.acidity,
        tannin: palate.tannin,
        alcohol: palate.alcohol,
        body: palate.body,
        flavors: [
          ...toArray(palate.primaryFlavours),
          ...toArray(palate.secondaryFlavours),
          ...toArray(palate.tertiaryFlavours),
        ],
        finish: palate.finish,
        quality: conclusion.quality,
        readiness: conclusion.readiness,
        notes:
          (review as any).reviewText ??
          conclusion.summary ??
          conclusion.ageingPotential ??
          conclusion.notes,
      }
    }

    const historyReviews = history
      .map((entry, index) => {
        const timestamp = formatTimestamp(entry.createdAt)
        const label =
          index === 0
            ? timestamp
              ? `Din senaste smaknotering (${timestamp})`
              : 'Din senaste smaknotering'
            : timestamp
              ? `Tidigare smaknotering ${index + 1} (${timestamp})`
              : `Tidigare smaknotering ${index + 1}`

        return toComparison(entry, {
          label,
          fallbackId: `user-${index}`,
        })
      })
      .filter(Boolean) as ComparisonReview[]

    const verified = toComparison(answerKey, {
      label: 'Vinakademins smaknotering',
      isVerified: true,
      fallbackId: 'answer-key',
    })

    return {
      verifiedComparison: verified,
      historyComparisons: historyReviews,
    }
  }, [history, answerKey])

  const [selectedHistoryId, setSelectedHistoryId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const next = historyComparisons[0]?.id
    const nextId = next !== undefined && next !== null ? String(next) : null
    setSelectedHistoryId((prev) => (prev === nextId ? prev : nextId))
  }, [historyComparisons])

  const selectedHistoryReview = React.useMemo(() => {
    if (!historyComparisons.length) return null
    if (!selectedHistoryId) return historyComparisons[0]
    return (
      historyComparisons.find((review) => String(review.id) === selectedHistoryId) ??
      historyComparisons[0]
    )
  }, [historyComparisons, selectedHistoryId])

  const reviewsForComparison = React.useMemo(() => {
    const entries: ComparisonReview[] = []
    if (verifiedComparison) entries.push(verifiedComparison)
    if (selectedHistoryReview) entries.push(selectedHistoryReview)
    return entries
  }, [verifiedComparison, selectedHistoryReview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptSubmit(true)

    const newErrors: Record<string, string> = {}
    const requiredPairs: Array<[string, string]> = [
      ['appearanceClarity', appearanceClarity],
      ['appearanceIntensity', appearanceIntensity],
      ['appearanceColor', appearanceColor],
      ['noseIntensity', noseIntensity],
      ['palateSweetness', palateSweetness],
      ['palateAcidity', palateAcidity],
      ['palateTannin', palateTannin],
      ['palateAlcohol', palateAlcohol],
      ['palateBody', palateBody],
      ['palateIntensity', palateIntensity],
      ['palateFinish', palateFinish],
      ['quality', quality],
    ]
    requiredPairs.forEach(([key, val]) => {
      if (!val) newErrors[key] = 'Detta fält är obligatoriskt'
    })
    if (!(rating >= 1 && rating <= 5)) newErrors['rating'] = 'Betyg måste vara 1–5'
    if (!primaryAromas || primaryAromas.length === 0)
      newErrors['primaryAromas'] = 'Välj minst en primär arom'
    if (!primaryFlavours || primaryFlavours.length === 0)
      newErrors['primaryFlavours'] = 'Välj minst en primär smak'
    if (!wineId) newErrors['wine'] = 'Inget vin kopplat till denna lektion'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vänligen fyll i alla obligatoriska fält')
      return
    }

    setIsSubmitting(true)
    try {
      // Convert IDs to numbers for Payload relationships
      const wineIdNum = wineId ? Number(wineId) : undefined
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      const participantIdNum = participantId ? Number(participantId) : undefined

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lesson: lessonId,
          wine: wineIdNum,
          rating,
          reviewText: notes,
          session: sessionIdNum || undefined,
          sessionParticipant: participantIdNum || undefined,
          wsetTasting: {
            appearance: {
              clarity: appearanceClarity || undefined,
              intensity: appearanceIntensity || undefined,
              color: appearanceColor || undefined,
            },
            nose: {
              intensity: noseIntensity || undefined,
              primaryAromas: primaryAromas,
              secondaryAromas: secondaryAromas,
              tertiaryAromas: tertiaryAromas,
            },
            palate: {
              sweetness: palateSweetness || undefined,
              acidity: palateAcidity || undefined,
              tannin: palateTannin || undefined,
              alcohol: palateAlcohol || undefined,
              body: palateBody || undefined,
              flavourIntensity: palateIntensity || undefined,
              primaryFlavours,
              secondaryFlavours,
              tertiaryFlavours,
              finish: palateFinish || undefined,
            },
            conclusion: {
              quality: quality || undefined,
              summary: notes || undefined,
            },
          },
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage =
          errorData?.errors?.[0]?.message || errorData?.message || 'Kunde inte spara vinrecensionen'
        console.error('Review submission error:', errorData)
        throw new Error(errorMessage)
      }
      const json = await res.json()
      setSubmittedReview(json)
      // Prepend to history list
      setHistory((prev) => [json, ...prev])
      toast.success('Din vinrecension har skickats')
      // Immediately show comparison
      await fetchAnswerKey()
      // Call onSubmit callback if provided (for group sessions)
      onSubmit?.()
      // Mark lesson as completed in progress API
      if (courseId) {
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ courseId, lessonId, isCompleted: true }),
          })
        } catch {}
      }
    } catch (err: any) {
      toast.error(err?.message || 'Ett fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  // In group sessions, show a success message instead of the comparison
  if (submittedReview && sessionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Din smaknotering är inskickad!</h3>
            <p className="text-muted-foreground">
              Din vinrecension har sparats. Scrolla ned för att se och jämföra alla deltagarnas
              svar.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                populateFormWithReview(submittedReview)
                setSubmittedReview(null)
              }}
            >
              Redigera recension
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // In regular mode (not group session), reuse the comparison UI
  if (submittedReview && !sessionId) {
    const hasReference = Boolean(verifiedComparison)
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Din smaknotering är inskickad!</h3>
              <p className="text-muted-foreground">
                {hasReference
                  ? 'Din vinrecension har sparats. Scrolla ned för att jämföra med Vinakademins smaknotering och dina tidigare inskick.'
                  : 'Din vinrecension har sparats. Scrolla ned för att se dina tidigare inskick.'}
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  populateFormWithReview(submittedReview)
                  setSubmittedReview(null)
                }}
              >
                Redigera recension
              </Button>
            </div>
          </CardContent>
        </Card>

        {historyComparisons.length > 1 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Tidigare inskick</CardTitle>
              <CardDescription>Visa ett annat av dina vinrecensioner.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedHistoryId ?? ''}
                onValueChange={(val) => setSelectedHistoryId(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Välj inskick" />
                </SelectTrigger>
                <SelectContent>
                  {historyComparisons.map((review) => (
                    <SelectItem key={String(review.id)} value={String(review.id)}>
                      {review.participantName}
                      {review.rating ? ` • Betyg ${review.rating}/5` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <ReviewComparison lessonId={lessonId} reviews={reviewsForComparison} />
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Betyg">
          <InputRow label="Betyg (1–5)" error={errors['rating']} attemptSubmit={attemptSubmit}>
            <Input
              id="rating"
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </InputRow>
        </Section>

        <Section title="Utseende">
          <InputRow
            label="Klarhet"
            error={errors['appearanceClarity']}
            attemptSubmit={attemptSubmit}
          >
            <Select value={appearanceClarity} onValueChange={setAppearanceClarity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Klar">Klar</SelectItem>
                <SelectItem value="Oklar">Oklar</SelectItem>
              </SelectContent>
            </Select>
          </InputRow>
          <InputRow
            label="Intensitet"
            error={errors['appearanceIntensity']}
            attemptSubmit={attemptSubmit}
          >
            <Select value={appearanceIntensity} onValueChange={setAppearanceIntensity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Blek">Blek</SelectItem>
                <SelectItem value="Mellan">Mellan</SelectItem>
                <SelectItem value="Djup">Djup</SelectItem>
              </SelectContent>
            </Select>
          </InputRow>
          <InputRow label="Färg" error={errors['appearanceColor']} attemptSubmit={attemptSubmit}>
            <Select value={appearanceColor} onValueChange={setAppearanceColor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'Citrongul',
                  'Guld',
                  'Bärnstensfärgad',
                  'Rosa',
                  'Rosa-orange',
                  'Orange',
                  'Lila',
                  'Rubinröd',
                  'Granatröd',
                  'Läderfärgad',
                ].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputRow>
        </Section>

        <Section title="Doft">
          <InputRow
            label="Intensitet"
            error={errors['noseIntensity']}
            attemptSubmit={attemptSubmit}
          >
            <Select value={noseIntensity} onValueChange={setNoseIntensity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                {['Låg', 'Mellan', 'Hög'].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputRow>
          <InputRow
            label="Primära aromer"
            error={errors['primaryAromas']}
            attemptSubmit={attemptSubmit}
          >
            <MultiSelect
              options={[
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ].map((v) => ({ label: v, value: v }))}
              value={primaryAromas}
              onValueChange={setPrimaryAromas}
              placeholder="Välj aromer"
              className="w-full"
            />
          </InputRow>
          <InputRow label="Sekundära aromer" attemptSubmit={attemptSubmit}>
            <MultiSelect
              options={[
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ].map((v) => ({ label: v, value: v }))}
              value={secondaryAromas}
              onValueChange={setSecondaryAromas}
              placeholder="Välj aromer"
              className="w-full"
            />
          </InputRow>
          <InputRow label="Tertiära aromer" attemptSubmit={attemptSubmit}>
            <MultiSelect
              options={[
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ].map((v) => ({ label: v, value: v }))}
              value={tertiaryAromas}
              onValueChange={setTertiaryAromas}
              placeholder="Välj aromer"
              className="w-full"
            />
          </InputRow>
        </Section>

        <Section title="Smak">
          {(
            [
              ['Sötma', palateSweetness, setPalateSweetness, ['Torr', 'Halvtorr', 'Mellan', 'Söt']],
              ['Syra', palateAcidity, setPalateAcidity, ['Låg', 'Mellan', 'Hög']],
              ['Tannin', palateTannin, setPalateTannin, ['Låg', 'Mellan', 'Hög']],
              ['Alkohol', palateAlcohol, setPalateAlcohol, ['Låg', 'Mellan', 'Hög']],
              ['Fyllighet', palateBody, setPalateBody, ['Lätt', 'Mellan', 'Fyllig']],
              ['Smakintensitet', palateIntensity, setPalateIntensity, ['Låg', 'Medium', 'Uttalad']],
            ] as any[]
          ).map(([label, val, setter, opts]) => (
            <InputRow key={label as string} label={label as string}>
              <Select value={val as string} onValueChange={setter as any}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Välj" />
                </SelectTrigger>
                <SelectContent>
                  {(opts as string[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InputRow>
          ))}
          <InputRow
            label="Primära smaker"
            error={errors['primaryFlavours']}
            attemptSubmit={attemptSubmit}
          >
            <MultiSelect
              options={[
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ].map((v) => ({ label: v, value: v }))}
              value={primaryFlavours}
              onValueChange={setPrimaryFlavours}
              placeholder="Välj smaker"
              className="w-full"
            />
          </InputRow>
          <InputRow label="Sekundära smaker" attemptSubmit={attemptSubmit}>
            <MultiSelect
              options={[
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ].map((v) => ({ label: v, value: v }))}
              value={secondaryFlavours}
              onValueChange={setSecondaryFlavours}
              placeholder="Välj smaker"
              className="w-full"
            />
          </InputRow>
          <InputRow label="Tertiära smaker" attemptSubmit={attemptSubmit}>
            <MultiSelect
              options={[
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ].map((v) => ({ label: v, value: v }))}
              value={tertiaryFlavours}
              onValueChange={setTertiaryFlavours}
              placeholder="Välj smaker"
              className="w-full"
            />
          </InputRow>
          <InputRow label="Eftersmak" error={errors['palateFinish']} attemptSubmit={attemptSubmit}>
            <Select value={palateFinish} onValueChange={setPalateFinish}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                {['Kort', 'Mellan', 'Lång'].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputRow>
        </Section>

        <Section title="Slutsats">
          <InputRow label="Kvalitet" error={errors['quality']} attemptSubmit={attemptSubmit}>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj" />
              </SelectTrigger>
              <SelectContent>
                {['Dålig', 'Acceptabel', 'Bra', 'Mycket bra', 'Enastående'].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputRow>
          <InputRow label="Sammanfattning/Noteringar" attemptSubmit={attemptSubmit}>
            <Textarea
              id="notes"
              rows={6}
              placeholder="Beskriv doft, smak, struktur, slutsats..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </InputRow>
        </Section>
        <Separator />
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Skickar...' : 'Skicka in'}
          </Button>
        </div>
      </form>
    </div>
  )
}
