'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function SettingsClient({
  clubId,
  clubName,
  clubDescription,
  isOwner,
}: {
  clubId: number
  clubName: string
  clubDescription: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(clubName)
  const [description, setDescription] = useState(clubDescription)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/wine-clubs/${clubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        toast.error('Kunde inte spara')
        return
      }
      toast.success('Sparat')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function destroy() {
    if (!confirm('Är du säker? Detta tar bort klubben och dess historik permanent.')) return
    const res = await fetch(`/api/wine-clubs/${clubId}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      toast.error('Kunde inte ta bort')
      return
    }
    router.push('/vinklubbar')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-medium">Klubbinformation</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Namn</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Beskrivning</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={save} disabled={busy}>
          Spara
        </Button>
      </section>

      {isOwner && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 space-y-4">
          <h2 className="font-medium text-destructive">Riskzon</h2>
          <p className="text-sm text-muted-foreground">
            Att ta bort klubben raderar all historik och topplista. Detta kan inte ångras.
          </p>
          <Button variant="destructive" onClick={destroy}>
            Ta bort klubben
          </Button>
        </section>
      )}
    </div>
  )
}
