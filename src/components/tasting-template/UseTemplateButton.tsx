'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export interface UseTemplateButtonProps {
  templateId: number
  templateSlug: string
}

export function UseTemplateButton({ templateId, templateSlug }: UseTemplateButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      const res = await fetch(`/api/tasting-plans/from-template/${templateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status === 401) {
        router.push(`/logga-in?from=/provningsmallar/${templateSlug}`)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte använda mallen.')
        return
      }
      if (data.plan?.id) {
        toast.success('Plan skapad — du kan justera den nu.')
        router.push(`/skapa-provning/${data.plan.id}`)
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" onClick={handleClick} disabled={busy} className="w-full">
      <Sparkles className="h-4 w-4 mr-2" />
      {busy ? 'Skapar plan…' : 'Använd mallen'}
    </Button>
  )
}
