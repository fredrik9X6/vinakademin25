'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export interface SortableWineRowItem {
  key: string
  pourOrder: number
  title: string
  subtitle: string
  hostNotes: string
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
      className="flex gap-3 rounded-md border bg-card p-3 items-start"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
        aria-label="Dra för att ändra ordning"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
        {item.pourOrder}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
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
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  )
}
