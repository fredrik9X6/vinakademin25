'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { HelpCircle } from 'lucide-react'

export function HelpExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Hur funkar det?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <h3 className="text-lg font-medium mb-3">Så här går blindkampen till</h3>
        <ol className="space-y-3 text-sm">
          <li>
            <strong>1. Slå in flaskan.</strong> Använd en ogenomskinlig vinpåse eller folie + tubsocka
            så ingen ser etiketten eller flasktypen.
          </li>
          <li>
            <strong>2. Hemlig plats.</strong> Telefonen säger var just du ska ställa din flaska
            (t.ex. #4). Andra deltagare ser inte din plats.
          </li>
          <li>
            <strong>3. Häll och smaka.</strong> Värden räknar ner, alla placerar samtidigt. Häll från
            plats 1, 2, 3… i tur och ordning. Sätt betyg blint.
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}
