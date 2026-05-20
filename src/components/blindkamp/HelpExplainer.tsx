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
            <strong>1. Slå in flaskan.</strong> Använd en ogenomskinlig vinpåse eller folie +
            tubsocka så ingen ser etiketten eller flasktypen.
          </li>
          <li>
            <strong>2. Märk med ditt hemliga nummer.</strong> Telefonen ger varje person en egen
            siffra. Skriv numret på en lapp och fäst på din inslagna flaska — privat, så att
            ingen annan ser kopplingen mellan dig och numret.
          </li>
          <li>
            <strong>3. Ställ på bordet.</strong> Var på bordet flaskan hamnar spelar ingen roll —
            det är numret som styr ordningen. När alla flaskor är märkta och utställda kan ni
            börja.
          </li>
          <li>
            <strong>4. Häll och smaka.</strong> Häll från flaska #1 till alla glas, sätt betyg,
            gå sedan vidare till #2. Du vet ditt eget nummer — ditt eget betyg räknas inte mot
            snittet.
          </li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Saknar ni en bra plats för att märka i privat? Använd alternativet &ldquo;neutral
          hjälpare&rdquo; — då gör en icke-smakande person numreringen åt er.
        </p>
      </DialogContent>
    </Dialog>
  )
}
