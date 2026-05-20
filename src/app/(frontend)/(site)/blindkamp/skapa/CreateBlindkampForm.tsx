'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemePicker, type ThemeValue } from '@/components/blindkamp/ThemePicker'
import { trackEvent } from '@/components/analytics'

export function CreateBlindkampForm({
  clubId,
  clubMembers,
}: {
  clubId: number | null
  clubMembers: Array<{ id: number; name: string }>
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [theme, setTheme] = React.useState<ThemeValue>({
    wineType: 'any',
    priceMinSek: null,
    priceMaxSek: null,
    description: '',
  })
  const [deadline, setDeadline] = React.useState('')
  const [sessionDate, setSessionDate] = React.useState('')
  const [revealStrategy, setRevealStrategy] = React.useState<'one_by_one' | 'all_at_end'>(
    'all_at_end',
  )
  const [inviteIds, setInviteIds] = React.useState<Set<number>>(
    new Set(clubMembers.map((m) => m.id)),
  )
  const [busy, setBusy] = React.useState(false)

  function toggleInvite(id: number) {
    const next = new Set(inviteIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setInviteIds(next)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/blindkamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title || undefined,
          clubId,
          theme: {
            wineType: theme.wineType,
            priceMinSek: theme.priceMinSek,
            priceMaxSek: theme.priceMaxSek,
          },
          themeDescription: theme.description,
          submissionDeadline: deadline || null,
          sessionDate: sessionDate || null,
          revealStrategy,
          inviteUserIds: Array.from(inviteIds),
        }),
      })
      if (!res.ok) {
        toast.error('Kunde inte skapa blindkamp')
        return
      }
      const json = await res.json()
      trackEvent('blind_battle_created', { clubId, battleId: json.id })
      router.push(`/blindkamp/${json.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Titel <span className="text-muted-foreground">(valfritt)</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="t.ex. Roséslaget"
          maxLength={120}
        />
      </div>

      {/* Theme — panel */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tema
        </p>
        <ThemePicker value={theme} onChange={setTheme} />
      </div>

      {/* Dates — panel */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tidsinställningar
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deadline">
              Sista dag att lämna in <span className="text-muted-foreground">(valfritt)</span>
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDate">
              Datum för provningen <span className="text-muted-foreground">(valfritt)</span>
            </Label>
            <Input
              id="sessionDate"
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Reveal strategy — chip buttons */}
      <div className="space-y-2">
        <Label>Avslöjandet</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRevealStrategy('all_at_end')}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              revealStrategy === 'all_at_end'
                ? 'border-[rgba(251,145,76,0.5)] bg-[rgba(251,145,76,0.12)] text-brand-400'
                : 'border-border text-muted-foreground hover:border-border/60 hover:text-foreground'
            }`}
          >
            Avslöja allt i slutet
          </button>
          <button
            type="button"
            onClick={() => setRevealStrategy('one_by_one')}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              revealStrategy === 'one_by_one'
                ? 'border-[rgba(251,145,76,0.5)] bg-[rgba(251,145,76,0.12)] text-brand-400'
                : 'border-border text-muted-foreground hover:border-border/60 hover:text-foreground'
            }`}
          >
            Ett vin i taget
          </button>
        </div>
      </div>

      {clubMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Bjud in</Label>
          <p className="text-xs text-muted-foreground">
            Avmarkera de som inte ska vara med denna gång.
          </p>
          <ul className="space-y-1">
            {clubMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inviteIds.has(m.id)}
                  onChange={() => toggleInvite(m.id)}
                  className="h-4 w-4"
                />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Skapar…' : 'Skapa blindkamp'}
      </Button>
    </form>
  )
}
