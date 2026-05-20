'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WinePicker, type CustomWineInput } from '@/components/tasting-plan/WinePicker'
import { trackEvent } from '@/components/analytics'

function buildInitialPicked(initial: any): CustomWineInput | null {
  if (initial?.systembolagetProduct?.productNumber) {
    const sp = initial.systembolagetProduct
    return {
      name: [sp.productNameBold, sp.productNameThin].filter(Boolean).join(' ') || sp.productNumber,
      producer: sp.producerName ?? undefined,
      vintage: sp.vintage != null ? String(sp.vintage) : undefined,
      priceSek: sp.price ?? undefined,
      imageUrl: sp.imageUrl ?? undefined,
      systembolagetProductNumber: sp.productNumber,
      systembolagetUrl: sp.productUrl ?? undefined,
    }
  }
  if (initial?.customWine?.name) {
    const cw = initial.customWine
    return {
      name: cw.name,
      producer: cw.producer ?? undefined,
      vintage: cw.vintage ?? undefined,
      type: cw.type ?? undefined,
      priceSek: cw.priceSek ?? undefined,
    }
  }
  return null
}

export function SubmissionForm({
  battleId,
  token,
  theme: _theme,
  initial,
}: {
  battleId: number
  token: string
  theme: any
  initial: any
}) {
  const router = useRouter()
  const [picked, setPicked] = React.useState<CustomWineInput | null>(() =>
    buildInitialPicked(initial),
  )
  const [busy, setBusy] = React.useState(false)

  async function save() {
    if (!picked) {
      toast.error('Välj ett vin')
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
            systembolagetProductNumber: picked.systembolagetProductNumber ?? null,
            customWine: {
              name: picked.name,
              producer: picked.producer ?? undefined,
              vintage: picked.vintage ?? undefined,
              type: picked.type ?? undefined,
              priceSek: picked.priceSek ?? undefined,
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
      {picked ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-4">
            {picked.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked.imageUrl}
                alt={picked.name}
                className="w-14 h-16 object-contain flex-shrink-0 rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{picked.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[picked.producer, picked.vintage, picked.priceSek != null ? `${picked.priceSek} kr` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPicked(null)}
              disabled={busy}
            >
              Byt
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <WinePicker onPickCustom={(wine) => setPicked(wine)} disabled={busy} />
        </div>
      )}

      <Button onClick={save} disabled={busy || !picked} className="w-full">
        {busy ? 'Sparar…' : 'Lämna in'}
      </Button>
    </div>
  )
}
