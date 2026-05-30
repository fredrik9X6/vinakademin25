'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { StarRating } from '@/components/ui/star-rating'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import ReviewComparison, { WineReview as ComparisonReview } from './ReviewComparison'
import { Section, InputRow } from './WineReviewFormHelpers'
import {
  PRIMARY_VOCAB,
  SECONDARY_VOCAB,
  TERTIARY_VOCAB,
  buildFlavourOptions,
  type WineType,
} from '@/lib/wset-flavour-vocab'
import { useSessionDraft, type SaveStatus } from '@/lib/use-session-draft'

interface CustomWineSnapshot {
  name: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
  systembolagetProductNumber?: string
  imageUrl?: string
}

interface WineReviewFormProps {
  lessonId: number
  courseId?: number
  sessionId?: string
  onSubmit?: () => void
  wineIdProp?: number | string // Accept wine ID from parent to bypass permission issues
  customWineSnapshot?: CustomWineSnapshot
  /**
   * Set when this form is rendered inside a Radix Dialog. Threads modal=true
   * through to every internal Popover/MultiSelect so the popover content
   * traps focus correctly and isn't intercepted by the Dialog's overlay.
   */
  insideDialog?: boolean
  /**
   * When provided, the form mounts in "edit" mode — populates state from this
   * review on first render. Used by /mina-recensioner/[id].
   */
  initialReview?: ReviewDoc | null
  /**
   * Standalone mode (no session, no lesson). Skips the answer-key fetch,
   * the participant-cookie logic, and the post-submit comparison view.
   * Caller is responsible for redirecting via `onSubmit`.
   */
  standalone?: boolean
  /** Pour order for this wine in the session — scopes the autosave draft. */
  pourOrder?: number
  /** Fired once when mount-time rehydration restored saved content. */
  onRestored?: () => void
}

type ReviewDoc = {
  id: number | string
  rating?: number
  reviewText?: any
  wsetTasting?: any
  buyAgain?: boolean
  createdAt?: string
  user?: number | { id: number }
  wine?: number | { id: number } | null
  session?: number | { id: number } | null
  sessionParticipant?: number | { id: number } | null
  customWine?: any
  publishedToProfile?: boolean
}

export function WineReviewForm({
  lessonId,
  courseId,
  sessionId,
  onSubmit,
  wineIdProp,
  customWineSnapshot,
  insideDialog = false,
  initialReview,
  standalone = false,
  pourOrder,
  onRestored,
}: WineReviewFormProps) {
  const [rating, setRating] = React.useState<number>(0)
  const [buyAgain, setBuyAgain] = React.useState<boolean>(false)
  const [notes, setNotes] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [mode, setMode] = React.useState<'simple' | 'advanced'>('advanced')
  const [submittedReview, setSubmittedReview] = React.useState<ReviewDoc | null>(null)
  const [answerKey, setAnswerKey] = React.useState<ReviewDoc | null>(null)
  const [history, setHistory] = React.useState<ReviewDoc[]>([])
  const [attemptSubmit, setAttemptSubmit] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [wineId, setWineId] = React.useState<number | string | null>(wineIdProp || null)
  const [wishlistSaved, setWishlistSaved] = React.useState(false)

  // Type + Systembolaget URL of the wine being reviewed. Type drives the
  // suggested-flavours order in the WSET MultiSelects; the URL powers the
  // post-submit "Köp på Systembolaget" CTA. Source priority: customWine
  // snapshot > fetched library wine doc > unknown.
  const [wineType, setWineType] = React.useState<WineType | null>(
    (customWineSnapshot?.type as WineType | undefined) ?? null,
  )
  const [libraryWineSystembolagetUrl, setLibraryWineSystembolagetUrl] = React.useState<
    string | null
  >(null)
  React.useEffect(() => {
    if (customWineSnapshot?.type) {
      setWineType(customWineSnapshot.type as WineType)
    }
    if (!wineId) {
      if (!customWineSnapshot?.type) setWineType(null)
      setLibraryWineSystembolagetUrl(null)
      return
    }
    let aborted = false
    fetch(`/api/wines/${wineId}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (aborted) return
        const d = doc as { type?: string | null; systembolagetUrl?: string | null } | null
        if (d?.type && !customWineSnapshot?.type) setWineType(d.type as WineType)
        if (d?.systembolagetUrl) setLibraryWineSystembolagetUrl(d.systembolagetUrl)
      })
      .catch(() => {})
    return () => {
      aborted = true
    }
  }, [wineId, customWineSnapshot?.type])

  // Identity is resolved server-side from the httpOnly participant cookie via
  // /api/sessions/[id]/my-submissions — never from localStorage. This holds
  // the resolved participant id (for the submit path) once rehydration runs.
  const [participantId, setParticipantId] = React.useState<string | null>(null)

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

  const [publishedToProfile, setPublishedToProfile] = React.useState<boolean>(
    initialReview?.publishedToProfile ?? false,
  )

  // Get current user from auth context
  const { user } = useAuth()

  // Continuous autosave of the in-progress review. Only active in a session
  // (lessonId=0 plan sessions included). Standalone / lesson-only reviews keep
  // the explicit-submit flow.
  const isSessionDraft = Boolean(sessionId) && !standalone
  const buildReviewBody = React.useCallback(
    (draft: Record<string, unknown>) => {
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      return {
        ...wineIdentity,
        rating: (draft.rating as number) || 0,
        buyAgain: Boolean(draft.buyAgain),
        reviewText: (draft.notes as string) ?? '',
        publishedToProfile: Boolean(draft.publishedToProfile),
        session: sessionIdNum,
        wsetTasting: (draft.wsetTasting as Record<string, unknown>) ?? {},
        ...(draft.submittedAt ? { submittedAt: draft.submittedAt } : {}),
      }
    },
    [customWineSnapshot, wineId, sessionId],
  )
  const {
    status: saveStatus,
    queueSave,
    lockIn,
    restoredFromDraft,
    restoredDraft,
  } = useSessionDraft({
    kind: 'review',
    sessionId: sessionId ?? 'none',
    pourOrder: pourOrder ?? 0,
    endpoint: '/api/reviews',
    buildBody: buildReviewBody,
  })
  // Surface the "answers restored" banner once.
  const restoredFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (isSessionDraft && restoredFromDraft && !restoredFiredRef.current) {
      restoredFiredRef.current = true
      onRestored?.()
    }
  }, [isSessionDraft, restoredFromDraft, onRestored])

  // Build the full WSET snapshot from current state (used for autosave + lock-in).
  const buildWsetSnapshot = React.useCallback(
    () => ({
      appearance: {
        clarity: appearanceClarity || undefined,
        intensity: appearanceIntensity || undefined,
        color: appearanceColor || undefined,
      },
      nose: {
        intensity: noseIntensity || undefined,
        primaryAromas,
        secondaryAromas,
        tertiaryAromas,
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
      conclusion: { quality: quality || undefined, summary: notes || undefined },
    }),
    [
      appearanceClarity,
      appearanceIntensity,
      appearanceColor,
      noseIntensity,
      primaryAromas,
      secondaryAromas,
      tertiaryAromas,
      palateSweetness,
      palateAcidity,
      palateTannin,
      palateAlcohol,
      palateBody,
      palateIntensity,
      primaryFlavours,
      secondaryFlavours,
      tertiaryFlavours,
      palateFinish,
      quality,
      notes,
    ],
  )

  // Autosave whenever any tracked field changes (only in session draft mode,
  // and not while showing the submitted/locked-in summary).
  const skipFirstAutosave = React.useRef(true)
  React.useEffect(() => {
    if (!isSessionDraft) return
    if (submittedReview) return // showing locked-in summary, not editing
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false
      return
    }
    queueSave({
      rating,
      buyAgain,
      notes,
      publishedToProfile,
      wsetTasting: buildWsetSnapshot(),
    })
  }, [
    isSessionDraft,
    submittedReview,
    rating,
    buyAgain,
    notes,
    publishedToProfile,
    buildWsetSnapshot,
    queueSave,
  ])

  const fetchAnswerKey = React.useCallback(async () => {
    if (standalone) return
    // Plan-driven sessions pass lessonId=0 sentinel (no underlying lesson). Skip the fetch.
    if (!lessonId) return
    try {
      // Fetch content-item (lesson) with depth=2 to resolve answerKeyReview.wine
      const res = await fetch(`/api/content-items/${lessonId}?depth=2`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const key = json?.answerKeyReview
      if (key) {
        setAnswerKey(key)
      }
      // Prefer wine from answer key, fallback to assignedWine (if it exists)
      let derivedWineId: number | string | null = null
      const keyWine = key?.wine
      if (keyWine) {
        derivedWineId = typeof keyWine === 'object' ? keyWine.id : keyWine
      }
      if (derivedWineId) setWineId(derivedWineId)
    } catch {}
  }, [lessonId, standalone])

  React.useEffect(() => {
    fetchAnswerKey()
  }, [fetchAnswerKey])

  // Function to populate form with existing review data
  const populateFormWithReview = React.useCallback((review: ReviewDoc) => {
    if (!review) return

    // Basic fields
    if (review.rating) setRating(review.rating)
    setBuyAgain(!!review.buyAgain)
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

  // Declared AFTER populateFormWithReview because it calls it (R7: avoid a
  // use-before-declaration). Session mode reads the cookie-backed
  // /my-submissions endpoint; non-session keeps the library-wine query.
  const fetchLatestSubmission = React.useCallback(async () => {
    if (standalone) return

    // Session mode: resolve identity + saved entries via the cookie endpoint.
    // This rehydrates BOTH library-wine and custom-wine reviews (the old skip
    // is gone) and never reads localStorage participantId.
    if (sessionId) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/my-submissions`, {
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          participantId: number | null
          reviews: Array<ReviewDoc & { pourOrder: number | null }>
        }
        if (data.participantId != null) setParticipantId(String(data.participantId))
        const reviews = Array.isArray(data.reviews) ? data.reviews : []
        // Pick this wine's review by pour order when known; else by wine id /
        // custom-wine name snapshot.
        const mine = reviews.find((r) => {
          if (typeof pourOrder === 'number' && r.pourOrder != null) {
            return r.pourOrder === pourOrder
          }
          if (wineId && r.wine != null) {
            const rid = typeof r.wine === 'object' ? (r.wine as any).id : r.wine
            return String(rid) === String(wineId)
          }
          if (customWineSnapshot?.name && (r as any).customWine?.name) {
            return (
              String((r as any).customWine.name).toLowerCase() ===
              customWineSnapshot.name.toLowerCase()
            )
          }
          return false
        })
        setHistory(reviews as ReviewDoc[])
        if (mine) {
          populateFormWithReview(mine as ReviewDoc)
          // submittedAt set = locked in → show the "submitted" state; null =
          // draft → keep the editable form populated.
          setSubmittedReview((mine as any).submittedAt ? (mine as ReviewDoc) : null)
        } else {
          setSubmittedReview(null)
        }
      } catch {}
      return
    }

    // Non-session (e.g. lesson-only / /mina-recensioner) library-wine path.
    if (!wineId) return
    if (!user?.id) return
    try {
      const params = new URLSearchParams()
      params.set('wine', String(wineId))
      params.set('user', String(user.id))
      params.set('sort', '-createdAt')
      params.set('limit', '5')
      params.set('depth', '1')
      const res = await fetch(`/api/reviews?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      const docs: ReviewDoc[] = json?.docs || []
      const filtered = docs.filter((doc) => {
        const reviewUserId = typeof doc.user === 'object' ? doc.user?.id : doc.user
        return reviewUserId === user.id
      })
      setHistory(filtered)
      setSubmittedReview(filtered[0] ?? null)
    } catch {}
  }, [
    standalone,
    sessionId,
    wineId,
    user?.id,
    pourOrder,
    customWineSnapshot,
    populateFormWithReview,
  ])

  // Rehydrate on mount. In session mode the cookie endpoint resolves identity
  // and returns BOTH library and custom-wine reviews, so run it as soon as we
  // know the session — no library wineId required. Non-session keeps the
  // library-wine query.
  React.useEffect(() => {
    if (sessionId || (wineId && !standalone)) {
      void fetchLatestSubmission()
    }
  }, [sessionId, wineId, standalone, fetchLatestSubmission])

  // Seed the form from the hook's restored localStorage draft (once on mount).
  // The local draft is the freshest user input — an autosave that hadn't yet
  // landed on the server before refresh — so a recovered note isn't shown
  // blank while /my-submissions catches up. Reuses populateFormWithReview's
  // mapping shape by projecting the draft into a ReviewDoc.
  const draftSeedAppliedRef = React.useRef(false)
  React.useEffect(() => {
    if (draftSeedAppliedRef.current) return
    draftSeedAppliedRef.current = true
    if (!isSessionDraft || !restoredDraft) return
    const wset = restoredDraft.wsetTasting as Record<string, unknown> | undefined
    const draftAsReview = {
      id: 'draft',
      rating: (restoredDraft.rating as number) || undefined,
      buyAgain: Boolean(restoredDraft.buyAgain),
      reviewText:
        typeof restoredDraft.notes === 'string' ? (restoredDraft.notes as string) : undefined,
      wsetTasting: wset,
    } as unknown as ReviewDoc
    populateFormWithReview(draftAsReview)
    if (typeof restoredDraft.buyAgain === 'boolean') setBuyAgain(restoredDraft.buyAgain)
    if (typeof restoredDraft.publishedToProfile === 'boolean') {
      setPublishedToProfile(restoredDraft.publishedToProfile)
    }
    // A draft carrying submittedAt was locked in before refresh — keep the
    // editable form populated; fetchLatestSubmission resolves the locked state
    // authoritatively from the server.
  }, [isSessionDraft, restoredDraft, populateFormWithReview])

  const initialReviewRef = React.useRef<ReviewDoc | null>(initialReview ?? null)
  React.useEffect(() => {
    if (initialReviewRef.current) {
      populateFormWithReview(initialReviewRef.current)
      setSubmittedReview(null) // don't go straight to "submitted" UI; show editable form
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        buyAgain: review.buyAgain,
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
    const requiredPairs: Array<[string, string]> =
      mode === 'simple'
        ? [['rating', String(rating || '')]]
        : [
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

    if (!rating || rating < 1 || rating > 5) {
      newErrors['rating'] = 'Välj ett betyg mellan 1–5'
    }

    if (mode === 'simple') {
      if (!primaryFlavours || primaryFlavours.length === 0)
        newErrors['primaryFlavours'] = 'Välj minst en primär smak'
    } else {
      if (!primaryAromas || primaryAromas.length === 0)
        newErrors['primaryAromas'] = 'Välj minst en primär arom'
      if (!primaryFlavours || primaryFlavours.length === 0)
        newErrors['primaryFlavours'] = 'Välj minst en primär smak'
    }
    if (!wineId && !customWineSnapshot) newErrors['wine'] = 'Inget vin kopplat till detta moment'

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vänligen fyll i alla obligatoriska fält')
      return
    }

    setIsSubmitting(true)
    try {
      // Session mode: the draft is already autosaved continuously. "Klar / Lås
      // in" just stamps submittedAt via the hook (queueSave already mirrored
      // every field). Reuse the same upsert route the hook uses.
      if (isSessionDraft) {
        // Make sure the very latest field values are queued, then lock in.
        queueSave({
          rating,
          buyAgain,
          notes,
          publishedToProfile,
          wsetTasting: buildWsetSnapshot(),
        })
        await lockIn()
        // Reflect "locked in" using the local state we already hold.
        const lockedDoc = {
          rating,
          buyAgain,
          reviewText: notes,
          publishedToProfile,
          wsetTasting: buildWsetSnapshot(),
          submittedAt: new Date().toISOString(),
          ...(customWineSnapshot ? { customWine: customWineSnapshot } : { wine: wineId }),
        } as unknown as ReviewDoc
        setSubmittedReview(lockedDoc)
        setHistory((prev) => [lockedDoc, ...prev])
        toast.success('Din smaknotering är inlåst')
        onSubmit?.()
        setIsSubmitting(false)
        return
      }

      // Non-session (standalone / lesson-only) explicit submit.
      const sessionIdNum = sessionId ? Number(sessionId) : undefined
      const participantIdNum = participantId ? Number(participantId) : undefined
      const effectiveSessionId =
        initialReview?.session != null
          ? typeof initialReview.session === 'object'
            ? (initialReview.session as any).id
            : initialReview.session
          : sessionIdNum
      const effectiveParticipantId =
        initialReview?.sessionParticipant != null
          ? typeof initialReview.sessionParticipant === 'object'
            ? (initialReview.sessionParticipant as any).id
            : initialReview.sessionParticipant
          : participantIdNum
      const wineIdentity = customWineSnapshot
        ? { customWine: customWineSnapshot }
        : { wine: wineId ? Number(wineId) : undefined }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...wineIdentity,
          rating,
          buyAgain,
          reviewText: notes,
          publishedToProfile,
          session: effectiveSessionId || undefined,
          sessionParticipant: effectiveParticipantId || undefined,
          submittedAt: new Date().toISOString(),
          wsetTasting: buildWsetSnapshot(),
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
      // Extract the review document from the response (API returns { success, doc })
      const reviewDoc = json.doc || json
      setSubmittedReview(reviewDoc)
      // Prepend to history list
      setHistory((prev) => [reviewDoc, ...prev])
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

  // High-rating post-review CTAs: surface "wishlist save" + Systembolaget jump
  // when the just-submitted review is 4★ or more, gated on identity hooks
  // (library wineId for save, any URL/productNumber source for the buy link).
  function computeSystembolagetUrl(): string | null {
    if (customWineSnapshot?.systembolagetUrl) return customWineSnapshot.systembolagetUrl
    if (libraryWineSystembolagetUrl) return libraryWineSystembolagetUrl
    if (customWineSnapshot?.systembolagetProductNumber) {
      return `https://www.systembolaget.se/sok/?sok=${encodeURIComponent(
        customWineSnapshot.systembolagetProductNumber,
      )}`
    }
    return null
  }
  async function handleSaveToWishlist() {
    if (!wineId || !user) return
    try {
      const res = await fetch('/api/user-wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wine: Number(wineId) }),
      })
      if (!res.ok) throw new Error()
      setWishlistSaved(true)
      toast.success('Sparat till dina viner')
    } catch {
      toast.error('Kunde inte spara — prova igen.')
    }
  }
  function renderHighRatingCTAs() {
    const rating = (submittedReview as any)?.rating ?? 0
    if (rating < 4) return null
    const sysUrl = computeSystembolagetUrl()
    const canSave = Boolean(wineId && user)
    if (!canSave && !sysUrl) return null
    return (
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        {canSave && (
          <Button
            variant="outline"
            size="sm"
            disabled={wishlistSaved}
            onClick={handleSaveToWishlist}
          >
            {wishlistSaved ? '✓ Sparat till mina viner' : 'Spara till mina viner'}
          </Button>
        )}
        {sysUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={sysUrl} target="_blank" rel="noopener noreferrer">
              Köp på Systembolaget
            </a>
          </Button>
        )}
      </div>
    )
  }

  // In group sessions, show a success message instead of the comparison
  if (!standalone && submittedReview && sessionId) {
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
            <h3 className="text-xl font-medium">Din smaknotering är inlåst</h3>
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
  if (!standalone && submittedReview && !sessionId) {
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
              <h3 className="text-xl font-medium">Din smaknotering är inskickad!</h3>
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
              {renderHighRatingCTAs()}
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
      <form onSubmit={handleSubmit} className="space-y-8">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as 'simple' | 'advanced')}
          className="w-full"
        >
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="simple">Enkel</TabsTrigger>
              <TabsTrigger value="advanced">Avancerad</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="simple" className="space-y-6">
            <Section title="Bedömning">
              <InputRow
                label="Primära smaker"
                error={errors['primaryFlavours']}
                attemptSubmit={attemptSubmit}
              >
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(PRIMARY_VOCAB, 'primary', wineType)}
                  value={primaryFlavours}
                  onValueChange={setPrimaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
              <InputRow label="Sötma" attemptSubmit={attemptSubmit}>
                <Select value={palateSweetness} onValueChange={setPalateSweetness}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Torr', 'Halvtorr', 'Mellan', 'Söt'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Syra" attemptSubmit={attemptSubmit}>
                <Select value={palateAcidity} onValueChange={setPalateAcidity}>
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
              <InputRow label="Fyllighet" attemptSubmit={attemptSubmit}>
                <Select value={palateBody} onValueChange={setPalateBody}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Lätt', 'Mellan', 'Fyllig'].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputRow>
              <InputRow label="Betyg" error={errors['rating']} attemptSubmit={attemptSubmit}>
                <div className="p-4 bg-gradient-to-br from-brand-300/10 via-card to-brand-300/5 rounded-lg border border-brand-300/30">
                  <StarRating
                    value={rating}
                    onChange={setRating}
                    max={5}
                    size="lg"
                    showLabel={true}
                    error={attemptSubmit && errors['rating'] ? errors['rating'] : undefined}
                    aria-label="Välj betyg från 1 till 5"
                  />
                </div>
              </InputRow>
              <InputRow label="Noteringar" attemptSubmit={attemptSubmit}>
                <Textarea
                  rows={4}
                  placeholder="Dina tankar om vinet..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </InputRow>
            </Section>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-8">
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
              <InputRow
                label="Färg"
                error={errors['appearanceColor']}
                attemptSubmit={attemptSubmit}
              >
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
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(PRIMARY_VOCAB, 'primary', wineType)}
                  value={primaryAromas}
                  onValueChange={setPrimaryAromas}
                  placeholder="Välj aromer"
                  className="w-full"
                />
              </InputRow>
              <InputRow label="Sekundära aromer" attemptSubmit={attemptSubmit}>
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(SECONDARY_VOCAB, 'secondary', wineType)}
                  value={secondaryAromas}
                  onValueChange={setSecondaryAromas}
                  placeholder="Välj aromer"
                  className="w-full"
                />
              </InputRow>
              <InputRow label="Tertiära aromer" attemptSubmit={attemptSubmit}>
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(TERTIARY_VOCAB, 'tertiary', wineType)}
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
                  [
                    'Sötma',
                    palateSweetness,
                    setPalateSweetness,
                    ['Torr', 'Halvtorr', 'Mellan', 'Söt'],
                  ],
                  ['Syra', palateAcidity, setPalateAcidity, ['Låg', 'Mellan', 'Hög']],
                  ['Tannin', palateTannin, setPalateTannin, ['Låg', 'Mellan', 'Hög']],
                  ['Alkohol', palateAlcohol, setPalateAlcohol, ['Låg', 'Mellan', 'Hög']],
                  ['Fyllighet', palateBody, setPalateBody, ['Lätt', 'Mellan', 'Fyllig']],
                  [
                    'Smakintensitet',
                    palateIntensity,
                    setPalateIntensity,
                    ['Låg', 'Medium', 'Uttalad'],
                  ],
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
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(PRIMARY_VOCAB, 'primary', wineType)}
                  value={primaryFlavours}
                  onValueChange={setPrimaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
              <InputRow label="Sekundära smaker" attemptSubmit={attemptSubmit}>
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(SECONDARY_VOCAB, 'secondary', wineType)}
                  value={secondaryFlavours}
                  onValueChange={setSecondaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
              <InputRow label="Tertiära smaker" attemptSubmit={attemptSubmit}>
                <MultiSelect
                  modalPopover={insideDialog}
                  options={buildFlavourOptions(TERTIARY_VOCAB, 'tertiary', wineType)}
                  value={tertiaryFlavours}
                  onValueChange={setTertiaryFlavours}
                  placeholder="Välj smaker"
                  className="w-full"
                />
              </InputRow>
              <InputRow
                label="Eftersmak"
                error={errors['palateFinish']}
                attemptSubmit={attemptSubmit}
              >
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
              <InputRow label="Betyg" error={errors['rating']} attemptSubmit={attemptSubmit}>
                <div className="p-4 bg-gradient-to-br from-brand-300/10 via-card to-brand-300/5 rounded-lg border border-brand-300/30">
                  <StarRating
                    value={rating}
                    onChange={setRating}
                    max={5}
                    size="lg"
                    showLabel={true}
                    error={attemptSubmit && errors['rating'] ? errors['rating'] : undefined}
                    aria-label="Välj betyg från 1 till 5"
                  />
                </div>
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
          </TabsContent>
        </Tabs>

        <Separator />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg w-full md:w-auto">
            <Checkbox
              id="buyAgain"
              checked={buyAgain}
              onCheckedChange={(checked) => setBuyAgain(checked as boolean)}
            />
            <label
              htmlFor="buyAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Jag hade köpt detta vin igen
            </label>
          </div>
          <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg w-full md:w-auto">
            <Checkbox
              id="publishedToProfile"
              checked={publishedToProfile}
              onCheckedChange={(checked) => setPublishedToProfile(checked as boolean)}
            />
            <label
              htmlFor="publishedToProfile"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Publicera på min profil
            </label>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isSessionDraft && <ReviewSaveStatus status={saveStatus} />}
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting
                ? isSessionDraft
                  ? 'Låser in…'
                  : 'Skickar...'
                : isSessionDraft
                  ? 'Klar / Lås in'
                  : 'Skicka in'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ReviewSaveStatus({ status }: { status: SaveStatus }) {
  if (status === 'saving')
    return <span className="text-xs text-muted-foreground">Sparar…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Sparat ✓</span>
  if (status === 'retrying')
    return <span className="text-xs text-amber-600">Återförsöker…</span>
  if (status === 'error') return <span className="text-xs text-red-600">Kunde inte spara</span>
  return null
}
