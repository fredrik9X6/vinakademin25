'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'

export interface WineSummaryCardChips {
  fakta: boolean
  manus: boolean
  guest: boolean
  /** Blind facit — plans only. Omit/false to hide. */
  blint?: boolean
}

export interface WineSummaryCardProps {
  /** dnd-kit sortable id (the wine's stable key). */
  id: string
  pourOrder: number
  title: string
  subtitle: string
  imageUrl?: string | null
  chips: WineSummaryCardChips
  onEdit: () => void
  onRemove: () => void
  disabled?: boolean
}

/**
 * Compact, scannable wine card for the template/plan editors. Detail lives in
 * the WineDetailSheet opened via `onEdit`; this card only shows identity + a
 * set of "filled" chips so the list stays a tight overview.
 */
export function WineSummaryCard({
  id,
  pourOrder,
  title,
  subtitle,
  imageUrl,
  chips,
  onEdit,
  onRemove,
  disabled,
}: WineSummaryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-2 sm:gap-3 rounded-lg border bg-card p-3 items-center overflow-hidden"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label="Dra för att ändra ordning"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Tapping the body opens the edit sheet. */}
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex flex-1 min-w-0 items-center gap-3 text-left"
      >
        <div className="relative flex-shrink-0 w-14 h-20">
          <span
            className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[72px] -ml-1 -mt-1"
            aria-hidden="true"
          >
            {pourOrder}
          </span>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="relative w-full h-full object-contain" />
          ) : (
            <WineImagePlaceholder size="sm" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.fakta && <Badge variant="secondary">Fakta</Badge>}
            {chips.manus && <Badge variant="secondary">Manus</Badge>}
            {chips.guest && <Badge variant="secondary">Gäst</Badge>}
            {chips.blint && <Badge variant="secondary">Blint</Badge>}
          </div>
        </div>
        <Pencil className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Ta bort vin"
        className="flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}
