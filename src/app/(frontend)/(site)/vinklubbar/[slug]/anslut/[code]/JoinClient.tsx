'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function JoinClient({ inviteCode }: { inviteCode: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function join() {
    setBusy(true)
    try {
      const res = await fetch('/api/wine-clubs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte gå med')
        return
      }
      const json = await res.json()
      router.push(`/vinklubbar/${json.slug}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button onClick={join} disabled={busy} className="w-full">
      {busy ? 'Ansluter…' : 'Gå med'}
    </Button>
  )
}
