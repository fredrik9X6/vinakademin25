'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast('Standardnotis', { description: 'En kort beskrivning.' })}>
        Visa notis
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.success('Lyckades', { description: 'Åtgärden genomfördes utan problem.' })
        }
      >
        Visa success
      </Button>
      <Button
        variant="destructive"
        onClick={() => toast.error('Något gick fel', { description: 'Försök igen senare.' })}
      >
        Visa fel
      </Button>
    </div>
  )
}
