'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinGuestClient({ battleId, inviteCode }: { battleId: number; inviteCode: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/join-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode, name, email }),
      })
      if (!res.ok) {
        toast.error('Kunde inte gå med')
        return
      }
      const { token } = await res.json()
      router.push(`/blindkamp/${battleId}/submit?token=${encodeURIComponent(token)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Fyll i dina uppgifter för att delta i blindkampen.
      </p>
      <div className="space-y-2">
        <Label htmlFor="name">Namn</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full mt-2">
        {busy ? 'Ansluter…' : 'Gå med'}
      </Button>
    </form>
  )
}
