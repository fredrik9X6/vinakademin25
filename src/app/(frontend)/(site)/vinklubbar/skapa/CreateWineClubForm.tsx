'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { trackEvent } from '@/components/analytics'

export function CreateWineClubForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Namn krävs')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/wine-clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte skapa klubben')
        return
      }
      const json = await res.json()
      trackEvent('wine_club_created', { clubId: json.id })
      router.push(`/vinklubbar/${json.slug}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Namn</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Onsdagsklubben"
          required
          maxLength={80}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">
          Beskrivning <span className="text-muted-foreground">(valfritt)</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="En kort beskrivning av klubben"
          rows={3}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full mt-2">
        {busy ? 'Skapar…' : 'Skapa vinklubb'}
      </Button>
    </form>
  )
}
