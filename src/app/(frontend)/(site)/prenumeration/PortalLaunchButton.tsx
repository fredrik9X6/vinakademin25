'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function PortalLaunchButton({ children = 'Hantera prenumeration' }: { children?: React.ReactNode }) {
  const [busy, setBusy] = React.useState(false)
  async function open() {
    setBusy(true)
    try {
      const res = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte öppna prenumerationsportalen.')
        return
      }
      const json = await res.json()
      if (json?.url) {
        window.location.href = json.url
      } else {
        toast.error('Inget portal-URL från Stripe — försök igen.')
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button onClick={open} disabled={busy}>
      {busy ? 'Öppnar…' : children}
    </Button>
  )
}
