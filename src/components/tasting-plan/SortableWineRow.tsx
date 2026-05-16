'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'

export interface SortableWineRowItem {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string
  imageUrl?: string | null
}

export interface SortableWineRowProps {
  item: SortableWineRowItem
  onNotesChange: (notes: string) => void
  onRemove: () => void
  disabled?: boolean
}

export function SortableWineRow({ item, onNotesChange, onRemove, disabled }: SortableWineRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
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
      className="flex gap-2 sm:gap-3 rounded-lg border bg-card p-3 sm:p-4 items-start overflow-hidden"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1 flex-shrink-0"
        aria-label="Dra för att ändra ordning"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {/* Bottle column — big faded Coolvetica number sits behind the bottle.
          Fixed height so cards keep a consistent visual rhythm; if user
          expands the notes textarea, the card grows but the bottle stays put. */}
      <div className="relative flex-shrink-0 w-20 h-32 sm:w-24 sm:h-36">
        <span
          className="absolute inset-0 flex items-start justify-start font-heading leading-[0.85] text-muted-foreground/25 select-none pointer-events-none text-[110px] sm:text-[130px] -ml-2 -mt-1"
          aria-hidden="true"
        >
          {item.pourOrder}
        </span>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="relative w-full h-full object-contain"
          />
        ) : (
          <WineImagePlaceholder size="md" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
        <Textarea
          className="mt-2 min-h-[60px] text-sm"
          placeholder="Anteckningar för värden (frivilligt)…"
          value={item.hostNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
        />
      </div>
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
