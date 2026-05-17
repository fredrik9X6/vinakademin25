'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { TastingTemplate, Wine, Media } from '@/payload-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { LibraryWinePicker, type LibraryWineHit } from './LibraryWinePicker'
import { TemplateSortableWineRow } from './TemplateSortableWineRow'

export interface TemplateFormProps {
  /** Undefined for create; populated for edit. */
  initialTemplate?: TastingTemplate
}

type WineEntry = {
  key: string
  libraryWineId: number
  hit: LibraryWineHit
  pourOrder: number
  hostNotes: string
}

function nextKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function hydrateInitialWines(template?: TastingTemplate): WineEntry[] {
  if (!template?.wines) return []
  return template.wines
    .filter((w) => w.libraryWine != null)
    .map((w, idx) => {
      const lib =
        typeof w.libraryWine === 'object' && w.libraryWine ? (w.libraryWine as Wine) : null
      const id =
        typeof w.libraryWine === 'object' && w.libraryWine
          ? (w.libraryWine as Wine).id
          : (w.libraryWine as number)
      const region =
        lib && typeof lib.region === 'object' && lib.region ? lib.region.name ?? null : null
      const image =
        lib && typeof lib.image === 'object' && lib.image ? (lib.image as Media) : null
      const thumbnailUrl = image
        ? image.sizes?.bottle?.url ?? image.sizes?.thumbnail?.url ?? image.url ?? null
        : null
      return {
        key: w.id ?? nextKey(),
        libraryWineId: id,
        hit: {
          id,
          title: lib?.name || `Vin #${id}`,
          producer: lib?.winery ?? null,
          vintage: lib?.vintage ?? null,
          region,
          thumbnailUrl,
        },
        pourOrder: w.pourOrder ?? idx + 1,
        hostNotes: w.hostNotes ?? '',
      }
    })
}

export function TemplateForm({ initialTemplate }: TemplateFormProps) {
  const router = useRouter()
  const isEdit = !!initialTemplate

  const [title, setTitle] = React.useState(initialTemplate?.title ?? '')
  const [slug, setSlug] = React.useState(initialTemplate?.slug ?? '')
  const [slugTouched, setSlugTouched] = React.useState(!!initialTemplate?.slug)
  const [description, setDescription] = React.useState(initialTemplate?.description ?? '')
  const [targetParticipants, setTargetParticipants] = React.useState<number>(
    initialTemplate?.targetParticipants ?? 4,
  )
  const [hostScript, setHostScript] = React.useState(initialTemplate?.hostScript ?? '')
  const [seoTitle, setSeoTitle] = React.useState(initialTemplate?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = React.useState(
    initialTemplate?.seoDescription ?? '',
  )
  const [publishedStatus, setPublishedStatus] = React.useState<'draft' | 'published'>(
    (initialTemplate?.publishedStatus as 'draft' | 'published' | undefined) ?? 'draft',
  )
  const [accessLevel, setAccessLevel] = React.useState<'free' | 'members_only'>(
    ((initialTemplate as { accessLevel?: 'free' | 'members_only' } | undefined)?.accessLevel ??
      'free') as 'free' | 'members_only',
  )
  const [tags, setTags] = React.useState<string[]>(
    Array.isArray(initialTemplate?.tags) ? (initialTemplate!.tags as string[]) : [],
  )
  const [tagInput, setTagInput] = React.useState('')
  const initialFeatured =
    initialTemplate?.featuredImage && typeof initialTemplate.featuredImage === 'object'
      ? (initialTemplate.featuredImage as Media)
      : null
  const [featuredImageId, setFeaturedImageId] = React.useState<number | null>(
    initialFeatured?.id ?? null,
  )
  const [featuredImageUrl, setFeaturedImageUrl] = React.useState<string | null>(
    initialFeatured?.url ?? null,
  )
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [wines, setWines] = React.useState<WineEntry[]>(() =>
    hydrateInitialWines(initialTemplate),
  )
  const [submitting, setSubmitting] = React.useState(false)

  // Auto-derive slug from title until the admin manually edits the slug field
  React.useEffect(() => {
    if (slugTouched) return
    setSlug(slugify(title))
  }, [title, slugTouched])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function pickWine(hit: LibraryWineHit) {
    setWines((prev) => {
      // Prevent adding the same wine twice
      if (prev.some((w) => w.libraryWineId === hit.id)) {
        toast.info('Vinet finns redan i mallen.')
        return prev
      }
      return [
        ...prev,
        {
          key: nextKey(),
          libraryWineId: hit.id,
          hit,
          pourOrder: prev.length + 1,
          hostNotes: '',
        },
      ]
    })
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
      const next = arrayMove(prev, oldIdx, newIdx).map((w, idx) => ({ ...w, pourOrder: idx + 1 }))
      return next
    })
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    if (tags.includes(t)) {
      setTagInput('')
      return
    }
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t))
  }

  async function handleImageUpload(file: File) {
    if (!file) return
    setUploadingImage(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) {
        toast.error('Kunde inte ladda upp bilden.')
        return
      }
      const json = await res.json()
      const doc = json?.doc ?? json
      const id = doc?.id
      const url = doc?.url ?? null
      if (typeof id === 'number') {
        setFeaturedImageId(id)
        setFeaturedImageUrl(url)
      } else {
        toast.error('Bilduppladdningen returnerade oväntat format.')
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function save() {
    if (!title.trim()) {
      toast.error('Ange en titel.')
      return
    }
    if (publishedStatus === 'published' && wines.length === 0) {
      toast.error('Lägg till minst ett vin för att publicera.')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        description: description.trim() || undefined,
        targetParticipants,
        featuredImage: featuredImageId ?? null,
        tags,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        publishedStatus,
        accessLevel,
        hostScript: hostScript.trim() || undefined,
        wines: wines.map((w, idx) => ({
          libraryWine: w.libraryWineId,
          pourOrder: idx + 1,
          hostNotes: w.hostNotes,
        })),
      }
      const url = isEdit ? `/api/tasting-templates/${initialTemplate!.id}` : '/api/tasting-templates'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte spara mallen.')
        return
      }
      const json = await res.json()
      const saved = (json?.template ?? null) as TastingTemplate | null
      toast.success('Mallen sparades.')
      if (saved && !isEdit) {
        router.push(`/provningsmallar/redigera/${saved.id}`)
      } else if (saved) {
        router.refresh()
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-32 space-y-8">
      <header>
        <h1 className="text-2xl font-heading">
          {isEdit ? 'Redigera provningsmall' : 'Ny provningsmall'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mallar visas i biblioteket <a href="/provningsmallar" className="underline">/provningsmallar</a> efter publicering.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <Label htmlFor="t-title">Titel</Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="t.ex. Champagnens hemligheter"
            maxLength={100}
          />
        </div>
        <div>
          <Label htmlFor="t-slug">Slug</Label>
          <Input
            id="t-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            placeholder="champagnens-hemligheter"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Visas i URL: /provningsmallar/{slug || 'din-slug'}
          </p>
        </div>
        <div>
          <Label htmlFor="t-desc">Beskrivning</Label>
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskriv mallens upplägg, tema och målgrupp."
            className="min-h-[100px]"
            maxLength={500}
          />
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

      <section className="space-y-2">
        <Label>Omslagsbild</Label>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 w-32 h-20 bg-muted/40 rounded overflow-hidden border">
            {featuredImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featuredImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImageUpload(file)
                  e.target.value = ''
                }}
              />
              <Button asChild size="sm" variant="outline" disabled={uploadingImage}>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploadingImage ? 'Laddar upp…' : 'Ladda upp'}
                </span>
              </Button>
            </label>
            {featuredImageId && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFeaturedImageId(null)
                  setFeaturedImageUrl(null)
                }}
              >
                Ta bort
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label>Taggar</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Ta bort tagg ${t}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Lägg till tagg och tryck Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Lägg till
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <Label>Viner</Label>
        <LibraryWinePicker onPick={pickWine} disabled={submitting} />
        {wines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner än — sök i biblioteket ovan.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={wines.map((w) => w.key)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {wines.map((w) => (
                  <TemplateSortableWineRow
                    key={w.key}
                    item={{
                      key: w.key,
                      pourOrder: w.pourOrder,
                      title: w.hit.title,
                      subtitle: [
                        w.hit.producer,
                        w.hit.vintage ? String(w.hit.vintage) : null,
                        w.hit.region,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                      hostNotes: w.hostNotes,
                      imageUrl: w.hit.thumbnailUrl,
                    }}
                    onNotesChange={(notes) => updateNotes(w.key, notes)}
                    onRemove={() => removeAt(w.key)}
                    disabled={submitting}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section className="space-y-2">
        <Label htmlFor="t-host-script">Manus för värden (frivilligt)</Label>
        <Textarea
          id="t-host-script"
          value={hostScript}
          onChange={(e) => setHostScript(e.target.value)}
          placeholder="Skriv den långa berättelsen som värden kan luta sig på under provningen."
          className="min-h-[120px]"
        />
      </section>

      <section className="space-y-3">
        <Label>SEO</Label>
        <div>
          <Label htmlFor="t-seo-title" className="text-xs text-muted-foreground">
            SEO-titel
          </Label>
          <Input
            id="t-seo-title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Visas som rubrik i Google (max 60 tecken)"
            maxLength={60}
          />
        </div>
        <div>
          <Label htmlFor="t-seo-desc" className="text-xs text-muted-foreground">
            SEO-beskrivning
          </Label>
          <Textarea
            id="t-seo-desc"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder="Visas som beskrivning i Google (max 160 tecken)"
            maxLength={160}
            className="min-h-[60px]"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Status</Label>
          <div className="mt-2 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={publishedStatus === 'draft'}
                onChange={() => setPublishedStatus('draft')}
              />
              Utkast
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={publishedStatus === 'published'}
                onChange={() => setPublishedStatus('published')}
              />
              Publicerad
            </label>
          </div>
        </div>
        <div>
          <Label>Tillgång</Label>
          <div className="mt-2 flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="access"
                value="free"
                checked={accessLevel === 'free'}
                onChange={() => setAccessLevel('free')}
              />
              Fri (alla kan se vinerna)
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="access"
                value="members_only"
                checked={accessLevel === 'members_only'}
                onChange={() => setAccessLevel('members_only')}
              />
              Endast medlemmar
            </label>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background border-t flex flex-wrap gap-2 justify-end">
        {isEdit && initialTemplate?.slug && (
          <Button asChild variant="outline">
            <a href={`/provningsmallar/${initialTemplate.slug}`} target="_blank" rel="noreferrer">
              Visa publikt
            </a>
          </Button>
        )}
        <Button variant="ghost" onClick={() => router.push('/provningsmallar')}>
          Avbryt
        </Button>
        <Button onClick={save} disabled={submitting}>
          {submitting ? 'Sparar…' : 'Spara'}
        </Button>
      </div>
    </div>
  )
}
