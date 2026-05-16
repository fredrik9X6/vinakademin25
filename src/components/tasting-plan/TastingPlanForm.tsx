'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { TastingPlan } from '@/payload-types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Minus, Plus, ChevronDown, Wand2, Check } from 'lucide-react'
import {
  WinePicker,
  type CustomWineInput,
  type LibraryWineResult,
  type PickedWineMeta,
} from './WinePicker'
import { SortableWineRow } from './SortableWineRow'
import { WizardTour } from '@/components/onboarding/WizardTour'
import { trackEvent } from '@/components/analytics'

type WineType = NonNullable<CustomWineInput['type']>

type WineEntry =
  | {
      kind: 'library'
      key: string
      libraryWine: number
      wineSnapshot: LibraryWineResult
      country: string | null
      type: WineType | null
      pourOrder: number
      hostNotes: string
    }
  | {
      kind: 'custom'
      key: string
      customWine: CustomWineInput
      country: string | null
      pourOrder: number
      hostNotes: string
    }

export interface TastingPlanFormProps {
  initialPlan?: TastingPlan
}

function nextKey() {
  return Math.random().toString(36).slice(2, 10)
}

function entryType(w: WineEntry): WineType | null {
  return w.kind === 'library' ? w.type : w.customWine.type ?? null
}

function entryPriceSek(w: WineEntry): number | null {
  if (w.kind === 'custom') return w.customWine.priceSek ?? null
  // We do not eagerly load library wine price into WineEntry — historical plans
  // can still be re-saved without it; the cost chip just under-reports.
  return null
}

// Standard pour order: lighter / drier first, sweet / fortified last.
const POUR_PRIORITY: Record<WineType, number> = {
  sparkling: 0,
  white: 1,
  rose: 2,
  red: 3,
  other: 4,
  dessert: 5,
  fortified: 6,
}

function sortByStandardPour(entries: WineEntry[]): WineEntry[] {
  return [...entries]
    .sort((a, b) => {
      const ta = entryType(a)
      const tb = entryType(b)
      const pa = ta != null ? POUR_PRIORITY[ta] : 999
      const pb = tb != null ? POUR_PRIORITY[tb] : 999
      if (pa !== pb) return pa - pb
      // Stable on original pourOrder when same priority
      return a.pourOrder - b.pourOrder
    })
    .map((w, idx) => ({ ...w, pourOrder: idx + 1 }))
}

const TYPE_LABEL_SV: Record<WineType, string> = {
  sparkling: 'Mousserande',
  white: 'Vitvins',
  rose: 'Rosévins',
  red: 'Rödvins',
  dessert: 'Dessertvins',
  fortified: 'Fortifierat',
  other: 'Vin',
}

function suggestTitle(wines: WineEntry[]): string | null {
  if (wines.length < 2) return null
  // 1) Country majority
  const countries = wines
    .map((w) => w.country)
    .filter((c): c is string => !!c && c.trim().length > 0)
  if (countries.length >= 2) {
    const counts = new Map<string, number>()
    countries.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1))
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!
    if (n >= 2 && n / wines.length >= 0.5) {
      return `Vinprovning från ${top}`
    }
  }
  // 2) Type majority
  const types = wines.map(entryType).filter((t): t is WineType => !!t)
  if (types.length >= 2) {
    const counts = new Map<WineType, number>()
    types.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1))
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!
    if (n >= 2 && n / wines.length >= 0.5) {
      return `${TYPE_LABEL_SV[top]}provning`
    }
  }
  return null
}

function hydrateInitialWines(plan?: TastingPlan): WineEntry[] {
  if (!plan?.wines) return []
  return plan.wines.map((w, idx): WineEntry => {
    const pourOrder = w.pourOrder ?? idx + 1
    const hostNotes = w.hostNotes ?? ''
    const key = w.id ?? nextKey()
    if (w.libraryWine && typeof w.libraryWine === 'object') {
      const lib = w.libraryWine
      const region =
        typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
      const country =
        typeof lib.country === 'object' && lib.country ? lib.country.name ?? null : null
      const image = lib.image
      const thumbnailUrl =
        typeof image === 'object' && image
          ? image.sizes?.bottle?.url ??
            image.sizes?.thumbnail?.url ??
            image.url ??
            null
          : null
      const libType = (lib.type ?? null) as WineType | null
      return {
        kind: 'library',
        key,
        libraryWine: lib.id,
        wineSnapshot: {
          id: lib.id,
          title: lib.name || `Vin #${lib.id}`,
          producer: lib.winery ?? null,
          vintage: lib.vintage ?? null,
          region,
          thumbnailUrl,
        },
        country,
        type: libType,
        pourOrder,
        hostNotes,
      }
    }
    return {
      kind: 'custom',
      key,
      customWine: {
        name: w.customWine?.name || '',
        producer: w.customWine?.producer || undefined,
        vintage: w.customWine?.vintage || undefined,
        type: (w.customWine?.type || undefined) as CustomWineInput['type'],
        systembolagetUrl: w.customWine?.systembolagetUrl || undefined,
        priceSek: w.customWine?.priceSek ?? undefined,
        systembolagetProductNumber: w.customWine?.systembolagetProductNumber || undefined,
        imageUrl: w.customWine?.imageUrl || undefined,
      },
      // Country isn't persisted on customWine — re-derive only for new picks.
      country: null,
      pourOrder,
      hostNotes,
    }
  })
}

export function TastingPlanForm({ initialPlan }: TastingPlanFormProps) {
  const router = useRouter()
  const isEdit = !!initialPlan

  const [title, setTitle] = React.useState(initialPlan?.title ?? '')
  const [description, setDescription] = React.useState(initialPlan?.description ?? '')
  const [targetParticipants, setTargetParticipants] = React.useState<number>(
    initialPlan?.targetParticipants ?? 4,
  )
  const [blindTastingByDefault, setBlindTastingByDefault] = React.useState<boolean>(
    initialPlan?.blindTastingByDefault ?? false,
  )
  const [defaultMinutesPerWine, setDefaultMinutesPerWine] = React.useState<number | ''>(
    initialPlan?.defaultMinutesPerWine ?? '',
  )
  const [publishedToProfile, setPublishedToProfile] = React.useState<boolean>(
    initialPlan?.publishedToProfile ?? false,
  )
  const [hostScript, setHostScript] = React.useState(initialPlan?.hostScript ?? '')
  const [wines, setWines] = React.useState<WineEntry[]>(() => hydrateInitialWines(initialPlan))
  const [submitting, setSubmitting] = React.useState(false)

  // Advanced settings accordion — default open in edit mode only if any
  // non-default value exists, so most members never see the section.
  const hasNonDefaultAdvanced =
    blindTastingByDefault ||
    (defaultMinutesPerWine !== '' && defaultMinutesPerWine !== null) ||
    publishedToProfile ||
    (hostScript ?? '').trim().length > 0
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(
    isEdit && hasNonDefaultAdvanced,
  )

  // Autosave (edit mode only). Idle / saving / saved badge shown in action bar.
  const [autosaveStatus, setAutosaveStatus] = React.useState<'idle' | 'saving' | 'saved'>(
    'idle',
  )

  // Fire once per mount in create mode. Edit mounts are uninteresting (they
  // happen on every refresh / autosave reload).
  const createStartedRef = React.useRef(false)
  React.useEffect(() => {
    if (isEdit || createStartedRef.current) return
    createStartedRef.current = true
    trackEvent('tasting_plan_create_started')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const wineCount = wines.length
  const titleValid = title.trim().length > 0 && title.length <= 100
  const canSubmit = titleValid && wineCount >= 1 && !submitting

  // Live summary chip values.
  const estimatedMinutes =
    defaultMinutesPerWine !== '' && wineCount > 0
      ? wineCount * (defaultMinutesPerWine || 0)
      : null
  const estimatedCost = wines.reduce((sum, w) => sum + (entryPriceSek(w) ?? 0), 0)

  const suggestedTitle = React.useMemo(() => suggestTitle(wines), [wines])
  const showTitleSuggestion =
    !!suggestedTitle && suggestedTitle.trim().toLowerCase() !== title.trim().toLowerCase()

  function pickCustom(w: CustomWineInput, meta?: PickedWineMeta) {
    setWines((prev) => {
      const next = [
        ...prev,
        {
          kind: 'custom' as const,
          key: nextKey(),
          customWine: w,
          country: meta?.country ?? null,
          pourOrder: prev.length + 1,
          hostNotes: '',
        },
      ]
      trackEvent('tasting_plan_wine_added', {
        source: w.systembolagetProductNumber ? 'systembolaget' : 'custom',
        wine_type: w.type ?? null,
        country: meta?.country ?? null,
        has_image: !!w.imageUrl,
        wine_count_after: next.length,
        is_edit: isEdit,
      })
      return next
    })
  }

  function removeAt(key: string) {
    setWines((prev) => {
      const next = prev
        .filter((w) => w.key !== key)
        .map((w, idx) => ({ ...w, pourOrder: idx + 1 }))
      trackEvent('tasting_plan_wine_removed', {
        wine_count_after: next.length,
        is_edit: isEdit,
      })
      return next
    })
  }

  function updateNotes(key: string, notes: string) {
    setWines((prev) => prev.map((w) => (w.key === key ? { ...w, hostNotes: notes } : w)))
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setWines((prev) => {
      const oldIdx = prev.findIndex((w) => w.key === active.id)
      const newIdx = prev.findIndex((w) => w.key === over.id)
      if (oldIdx < 0 || newIdx < 0) return prev
      return arrayMove(prev, oldIdx, newIdx).map((w, idx) => ({ ...w, pourOrder: idx + 1 }))
    })
  }

  function applyStandardPourOrder() {
    setWines((prev) => {
      trackEvent('tasting_plan_pour_order_autosorted', {
        wine_count: prev.length,
        is_edit: isEdit,
      })
      return sortByStandardPour(prev)
    })
  }

  function buildPayload() {
    return {
      title: title.trim(),
      description: description || undefined,
      targetParticipants,
      blindTastingByDefault,
      defaultMinutesPerWine:
        defaultMinutesPerWine === '' ? null : Number(defaultMinutesPerWine),
      publishedToProfile,
      hostScript: hostScript || undefined,
      wines: wines.map((w, idx) => ({
        libraryWine: w.kind === 'library' ? w.libraryWine : undefined,
        customWine: w.kind === 'custom' ? w.customWine : undefined,
        pourOrder: idx + 1,
        hostNotes: w.hostNotes,
      })),
    }
  }

  async function save(opts: { silent?: boolean } = {}): Promise<boolean> {
    if (!canSubmit) return false
    if (!opts.silent) setSubmitting(true)
    try {
      const res = await fetch(
        isEdit ? `/api/tasting-plans/${initialPlan!.id}` : '/api/tasting-plans',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        if (!opts.silent) toast.error(data?.error || 'Kunde inte spara planen.')
        trackEvent('tasting_plan_save_failed', {
          is_edit: isEdit,
          is_autosave: !!opts.silent,
          status: res.status,
          error: data?.error ?? null,
        })
        return false
      }
      trackEvent(opts.silent ? 'tasting_plan_autosaved' : 'tasting_plan_saved', {
        plan_id: data.plan?.id ?? initialPlan?.id ?? null,
        is_edit: isEdit,
        wine_count: wines.length,
        total_cost_sek: estimatedCost > 0 ? estimatedCost : null,
        estimated_minutes: estimatedMinutes,
        target_participants: targetParticipants,
        blind_tasting: blindTastingByDefault,
        has_timer: defaultMinutesPerWine !== '' && Number(defaultMinutesPerWine) > 0,
        published_to_profile: publishedToProfile,
      })
      if (!opts.silent) {
        toast.success(isEdit ? 'Sparat.' : 'Planen är skapad.')
        if (!isEdit && data.plan?.id) {
          router.replace(`/mina-provningar/planer/${data.plan.id}`)
        } else {
          router.refresh()
        }
      }
      return true
    } catch {
      if (!opts.silent) toast.error('Nätverksfel — försök igen.')
      trackEvent('tasting_plan_save_failed', {
        is_edit: isEdit,
        is_autosave: !!opts.silent,
        error: 'network',
      })
      return false
    } finally {
      if (!opts.silent) setSubmitting(false)
    }
  }

  // Autosave: edit mode only, debounced 1.5s on any tracked state change.
  // Skip the very first effect run so opening the page doesn't trigger a save.
  const hasMountedRef = React.useRef(false)
  React.useEffect(() => {
    if (!isEdit) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (!canSubmit) return
    const handle = setTimeout(async () => {
      setAutosaveStatus('saving')
      const ok = await save({ silent: true })
      if (!ok) {
        setAutosaveStatus('idle')
        toast.error('Kunde inte spara automatiskt — försök igen.')
        return
      }
      setAutosaveStatus('saved')
      const fadeOut = setTimeout(() => setAutosaveStatus('idle'), 2000)
      return () => clearTimeout(fadeOut)
    }, 1500)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    targetParticipants,
    blindTastingByDefault,
    defaultMinutesPerWine,
    publishedToProfile,
    hostScript,
    wines,
  ])

  async function deletePlan() {
    if (!initialPlan) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasting-plans/${initialPlan.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte ta bort planen.')
        return
      }
      trackEvent('tasting_plan_deleted', {
        plan_id: initialPlan.id,
        archived: !!data.archived,
      })
      toast.success(data.archived ? 'Arkiverad.' : 'Borttagen permanent.')
      router.push('/mina-provningar/planer')
    } finally {
      setSubmitting(false)
    }
  }

  const sortableItems = wines.map((w) => ({
    key: w.key,
    pourOrder: w.pourOrder,
    title:
      w.kind === 'library' ? w.wineSnapshot.title : w.customWine.name || 'Namnlöst vin',
    subtitle:
      w.kind === 'library'
        ? [w.wineSnapshot.producer, w.wineSnapshot.vintage, w.wineSnapshot.region]
            .filter(Boolean)
            .join(' · ')
        : [w.customWine.producer, w.customWine.vintage].filter(Boolean).join(' · '),
    hostNotes: w.hostNotes,
    imageUrl:
      w.kind === 'library'
        ? w.wineSnapshot.thumbnailUrl ?? null
        : w.customWine.imageUrl ?? null,
  }))

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-32 space-y-8">
      {!isEdit && <WizardTour />}
      <header>
        <h1 className="text-2xl font-heading">
          {isEdit ? 'Redigera provning' : 'Skapa provning'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planera din provning. Spara som utkast — du kan ändra när som helst.
        </p>
      </header>

      <section className="space-y-3">
        <div>
          <Label htmlFor="t-title">Titel *</Label>
          <Input
            id="t-title"
            data-tour="wizard-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="t.ex. Sommarrosé från Provence"
          />
          {showTitleSuggestion && (
            <button
              type="button"
              onClick={() => {
                setTitle(suggestedTitle!)
                trackEvent('tasting_plan_title_suggestion_applied', {
                  suggestion: suggestedTitle,
                  wine_count: wines.length,
                  is_edit: isEdit,
                })
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-400 hover:underline"
            >
              <Wand2 className="h-3 w-3" />
              Förslag: {suggestedTitle}
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
        </div>
        <div>
          <Label htmlFor="t-desc">Beskrivning</Label>
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Frivilligt — sammanhang för dig som värd."
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
        </div>
        <div>
          <Label>Antal deltagare</Label>
          <div className="mt-1 inline-flex items-center gap-1 rounded-md border bg-background p-1">
            <button
              type="button"
              onClick={() => setTargetParticipants((n) => Math.max(1, n - 1))}
              disabled={targetParticipants <= 1}
              aria-label="Minska antal deltagare"
              className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="min-w-[2ch] px-2 text-center font-medium tabular-nums"
              aria-live="polite"
            >
              {targetParticipants}
            </span>
            <button
              type="button"
              onClick={() => setTargetParticipants((n) => Math.min(50, n + 1))}
              disabled={targetParticipants >= 50}
              aria-label="Öka antal deltagare"
              className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3" data-tour="wizard-wines">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Viner ({wineCount})</h2>
          {wines.length >= 2 && (
            <button
              type="button"
              onClick={applyStandardPourOrder}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              <Wand2 className="h-3 w-3" />
              Sortera efter standardordning
            </button>
          )}
        </div>

        {wineCount > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">{wineCount} viner</span>
            {estimatedMinutes != null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">≈ {estimatedMinutes} min</span>
              </>
            )}
            {estimatedCost > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{estimatedCost.toLocaleString('sv-SE')} kr</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{targetParticipants} deltagare</span>
          </div>
        )}

        {wineCount >= 9 && (
          <div className="rounded-md border border-yellow-300/50 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm">
            Långa provningar är svåra att hålla fokus på. Överväg att dela upp i två tillfällen.
          </div>
        )}
        {wineCount === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner tillagda än.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sortableItems.map((i) => i.key)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {sortableItems.map((item) => (
                  <SortableWineRow
                    key={item.key}
                    item={item}
                    onNotesChange={(notes) => updateNotes(item.key, notes)}
                    onRemove={() => removeAt(item.key)}
                    disabled={submitting}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <WinePicker onPickCustom={pickCustom} disabled={submitting} />
      </section>

      <section>
        <button
          type="button"
          onClick={() => {
            setShowAdvanced((s) => {
              trackEvent('tasting_plan_advanced_toggled', {
                opened: !s,
                is_edit: isEdit,
              })
              return !s
            })
          }}
          aria-expanded={showAdvanced}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAdvanced ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          Avancerade inställningar
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-md border bg-card p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-brand-400"
                checked={blindTastingByDefault}
                onChange={(e) => setBlindTastingByDefault(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Blindprovning</span>{' '}
                <span className="text-muted-foreground">
                  — viner visas anonymt tills du avslöjar dem.
                </span>
              </span>
            </label>
            <div>
              <Label htmlFor="t-minutes">Tid per vin (minuter)</Label>
              <Input
                id="t-minutes"
                type="number"
                min={1}
                max={60}
                value={defaultMinutesPerWine}
                onChange={(e) =>
                  setDefaultMinutesPerWine(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-28"
                placeholder="t.ex. 5"
              />
              <p className="text-xs text-muted-foreground mt-1">Lämna tomt för ingen timer.</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-brand-400"
                checked={publishedToProfile}
                onChange={(e) => setPublishedToProfile(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Publicera på din profil</span>{' '}
                <span className="text-muted-foreground">
                  — visa den på /profil/&lt;ditt-användarnamn&gt;.
                </span>
              </span>
            </label>
            <div>
              <Label htmlFor="t-script">Manus för värden</Label>
              <Textarea
                id="t-script"
                value={hostScript}
                onChange={(e) => setHostScript(e.target.value)}
                rows={6}
                placeholder="Frivilligt — anteckningar du vill ha med på fusklappen under provningen."
              />
            </div>
          </div>
        )}
      </section>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          {isEdit ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" disabled={submitting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {initialPlan?.status === 'archived' ? 'Ta bort permanent' : 'Radera'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {initialPlan?.status === 'archived'
                      ? 'Ta bort permanent?'
                      : 'Arkivera planen?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {initialPlan?.status === 'archived'
                      ? 'Den här åtgärden går inte att ångra.'
                      : 'Planen försvinner från listan men finns kvar i databasen tills du tar bort den igen.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={deletePlan}>Bekräfta</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {isEdit && autosaveStatus !== 'idle' && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                {autosaveStatus === 'saving' ? (
                  'Sparar…'
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Sparat
                  </>
                )}
              </span>
            )}
            <Button
              type="button"
              data-tour="wizard-save"
              onClick={() => save()}
              disabled={!canSubmit}
            >
              {submitting ? 'Sparar…' : isEdit ? 'Spara ändringar' : 'Spara utkast'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
