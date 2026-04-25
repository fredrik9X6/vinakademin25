'use client'

import { CheckCircle2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface PrepChecklistProps {
  onDismiss: () => void
}

const CHECKLIST_ITEMS = [
  { label: 'Vinglas', description: 'Anvand garna ett tulpanformat vinglas' },
  { label: 'Serveringstemperatur', description: 'Kontrollera ratt temperatur for varje vin' },
  { label: 'Tilltugg', description: 'Ha neutralt brod eller kex till hands' },
  { label: 'Anteckningar', description: 'Forered penna och papper eller anvand appen' },
]

export function PrepChecklist({ onDismiss }: PrepChecklistProps) {
  return (
    <Card className="border-brand-400/20 bg-brand-300/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-medium text-base">Forbredelser for din provning</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Se till att du har allt infor din vinprovning.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Stang checklista"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHECKLIST_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg border border-brand-400/10 bg-background p-3"
            >
              <CheckCircle2 className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
