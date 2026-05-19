'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WineSubmissionPicker, type SubmissionValue } from '@/components/blindkamp/WineSubmissionPicker'
import type { ThemeValue } from '@/components/blindkamp/ThemePicker'
import { trackEvent } from '@/components/analytics'

export function SubmissionForm({
  battleId,
  token,
  theme,
  initial,
}: {
  battleId: number
  token: string
  theme: any
  initial: any
}) {
  const router = useRouter()
  const [value, setValue] = React.useState<SubmissionValue>({
    systembolagetProductNumber: initial.systembolagetProduct?.productNumber || null,
    customName: initial.customWine?.name || '',
    customProducer: initial.customWine?.producer || '',
    customVintage: initial.customWine?.vintage || '',
    customPriceSek: initial.customWine?.priceSek ?? null,
    customType: (initial.customWine?.type || '') as SubmissionValue['customType'],
  })
  const [busy, setBusy] = React.useState(false)

  const themeValue: ThemeValue = {
    wineType: theme?.wineType ?? 'any',
    priceMinSek: theme?.priceMinSek ?? null,
    priceMaxSek: theme?.priceMaxSek ?? null,
    description: '',
  }

  async function save() {
    if (!value.systembolagetProductNumber && !value.customName.trim()) {
      toast.error('Välj ett vin eller fyll i namn manuellt')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(
        `/api/blindkamp/${battleId}/submit?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            systembolagetProductNumber: value.systembolagetProductNumber,
            customWine: {
              name: value.customName,
              producer: value.customProducer || undefined,
              vintage: value.customVintage || undefined,
              type: value.customType || undefined,
              priceSek: value.customPriceSek,
            },
          }),
        },
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte spara')
        return
      }
      trackEvent('blind_battle_submission_made', { battleId })
      toast.success('Ditt vin är inlämnat')
      router.push(`/blindkamp/${battleId}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <WineSubmissionPicker theme={themeValue} value={value} onChange={setValue} />
      <Button onClick={save} disabled={busy} className="w-full">
        {busy ? 'Sparar…' : 'Lämna in'}
      </Button>
    </div>
  )
}
