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
import { Trash2 } from 'lucide-react'
import { WinePicker, type CustomWineInput, type LibraryWineResult } from './WinePicker'
import { SortableWineRow } from './SortableWineRow'
import { WizardTour } from '@/components/onboarding/WizardTour'

type WineEntry =
  | { kind: 'library'; key: string; libraryWine: number; wineSnapshot: LibraryWineResult; pourOrder: number; hostNotes: string }
  | { kind: 'custom'; key: string; customWine: CustomWineInput; pourOrder: number; hostNotes: string }

export interface TastingPlanFormProps {
  initialPlan?: TastingPlan
}

function nextKey() {
  return Math.random().toString(36).slice(2, 10)
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
      const image = lib.image
      const thumbnailUrl =
        typeof image === 'object' && image
          ? image.sizes?.thumbnail?.url ?? image.url ?? null
          : null
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
      pourOrder,
      hostNotes,
    }
  })
}

export function TastingPlanForm({ initialPlan }: TastingPlanFormProps) {
  const router = useRouter()
  const isEdit = !!initialPlan

  const [title, setTitle] = React.useState(initialPlan?.title ?? '')
  const [occasion, setOccasion] = React.useState(initialPlan?.occasion ?? '')
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const wineCount = wines.length
  const titleValid = title.trim().length > 0 && title.length <= 100
  const canSubmit = titleValid && wineCount >= 3 && !submitting

  function pickLibrary(w: LibraryWineResult) {
    setWines((prev) => [
      ...prev,
      {
        kind: 'library',
        key: nextKey(),
        libraryWine: w.id,
        wineSnapshot: w,
        pourOrder: prev.length + 1,
        hostNotes: '',
      },
    ])
  }

  function pickCustom(w: CustomWineInput) {
    setWines((prev) => [
      ...prev,
      {
        kind: 'custom',
        key: nextKey(),
        customWine: w,
        pourOrder: prev.length + 1,
        hostNotes: '',
      },
    ])
  }

  function removeAt(key: string) {
    setWines((prev) =>
      prev.filter((w) => w.key !== key).map((w, idx) => ({ ...w, pourOrder: idx + 1 })),
    )
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

  async function save() {
    if (!canSubmit) return
    setSubmitting(true)
    const payload = {
      title: title.trim(),
      description: description || undefined,
      occasion: occasion || undefined,
      targetParticipants,
      blindTastingByDefault,
      defaultMinutesPerWine: defaultMinutesPerWine === '' ? null : Number(defaultMinutesPerWine),
      publishedToProfile,
      hostScript: hostScript || undefined,
      wines: wines.map((w, idx) => ({
        libraryWine: w.kind === 'library' ? w.libraryWine : undefined,
        customWine: w.kind === 'custom' ? w.customWine : undefined,
        pourOrder: idx + 1,
        hostNotes: w.hostNotes,
      })),
    }
    try {
      const res = await fetch(
        isEdit ? `/api/tasting-plans/${initialPlan!.id}` : '/api/tasting-plans',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte spara planen.')
        return
      }
      toast.success(isEdit ? 'Sparat.' : 'Planen är skapad.')
      if (!isEdit && data.plan?.id) {
        router.replace(`/mina-provningar/planer/${data.plan.id}`)
      } else {
        router.refresh()
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

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
      w.kind === 'library'
        ? w.wineSnapshot.title
        : w.customWine.name || 'Namnlöst vin',
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
          <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
        </div>
        <div>
          <Label htmlFor="t-occasion">Tillfälle</Label>
          <Input
            id="t-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="Födelsedag, fredagsmiddag …"
          />
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
          <Label htmlFor="t-participants">Antal deltagare</Label>
          <Input
            id="t-participants"
            type="number"
            min={1}
            max={50}
            value={targetParticipants}
            onChange={(e) => setTargetParticipants(Number(e.target.value) || 1)}
            className="w-28"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Provningsinställningar</h2>
        <div className="space-y-3 rounded-md border bg-card p-4">
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
        </div>
      </section>

      <section className="space-y-3" data-tour="wizard-wines">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Viner ({wineCount})</h2>
          {wineCount < 3 && (
            <span className="text-xs text-muted-foreground">Minst 3 viner krävs</span>
          )}
        </div>
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
        <WinePicker
          onPickLibrary={pickLibrary}
          onPickCustom={pickCustom}
          disabled={submitting}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="t-script">Manus för värden</Label>
        <Textarea
          id="t-script"
          value={hostScript}
          onChange={(e) => setHostScript(e.target.value)}
          rows={8}
          placeholder="Frivilligt — anteckningar du vill ha med på fusklappen under provningen."
        />
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <Button type="button" data-tour="wizard-save" onClick={save} disabled={!canSubmit}>
            {submitting ? 'Sparar…' : isEdit ? 'Spara ändringar' : 'Spara utkast'}
          </Button>
        </div>
      </div>
    </div>
  )
}
