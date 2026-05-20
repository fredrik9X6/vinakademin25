'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Copy, ArrowRight, Users } from 'lucide-react'

export function BattleStatusPanel({
  battleId,
  status,
  submittedCount,
  totalCount,
  isHost,
  mySubmissionToken,
  mySubmissionStatus,
  popupInviteUrl,
}: {
  battleId: number
  status: string
  submittedCount: number
  totalCount: number
  isHost: boolean
  mySubmissionToken: string | null
  mySubmissionStatus: string | null
  popupInviteUrl: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function openSession() {
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/open-session`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte starta provningen')
        return
      }
      router.push(`/blindkamp/${battleId}/provning`)
    } finally {
      setBusy(false)
    }
  }

  async function sendInvites() {
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/invitations`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        toast.error('Misslyckades')
        return
      }
      toast.success('Inbjudningar skickade')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status tile — stat pattern */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Status
        </p>
        {status === 'submissions_open' && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400 flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-heading tracking-[-0.015em] leading-none tabular-nums">
                {submittedCount}
                <span className="text-base text-muted-foreground font-normal">
                  {' '}/ {totalCount}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">har lämnat in</p>
            </div>
          </div>
        )}
        {status !== 'submissions_open' && (
          <p className="font-medium">
            {status === 'in_session' && 'Provning pågår'}
            {status === 'completed' && 'Klar'}
            {status === 'draft' && 'Utkast'}
            {status === 'canceled' && 'Avbruten'}
          </p>
        )}
      </div>

      {mySubmissionToken && mySubmissionStatus !== 'submitted' && status === 'submissions_open' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <p className="font-medium">Du har inte lämnat in ett vin än</p>
          <Button asChild>
            <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>
              Välj ditt vin <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {mySubmissionToken && mySubmissionStatus === 'submitted' && status === 'submissions_open' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <p className="font-medium">Du har lämnat in ditt vin</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>
              Ändra ditt val
            </Link>
          </Button>
        </div>
      )}

      {isHost && status === 'submissions_open' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <p className="font-medium">Värdkontroller</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendInvites} disabled={busy} variant="outline" size="sm">
              Skicka inbjudningar
            </Button>
            <Button onClick={openSession} disabled={busy || submittedCount < 2} size="sm">
              {submittedCount < 2 ? 'Behöver ≥ 2 bidrag' : 'Starta provningen'}
            </Button>
          </div>
        </div>
      )}

      {status === 'in_session' && mySubmissionToken && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <p className="font-medium">
            {isHost ? 'Du leder provningen' : 'Värden har startat provningen'}
          </p>
          <p className="text-sm text-muted-foreground">
            Klicka för att se din hemliga plats och placera din inslagna flaska.
          </p>
          <Button asChild>
            <Link href={`/blindkamp/${battleId}/provning`}>
              {isHost ? 'Återgå till provningen' : 'Gå till provningen'}
            </Link>
          </Button>
        </div>
      )}

      {status === 'completed' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <Button asChild>
            <Link href={`/blindkamp/${battleId}/resultat`}>Visa resultat</Link>
          </Button>
        </div>
      )}

      {popupInviteUrl && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Inbjudningslänk
          </p>
          <div className="flex gap-2">
            <input
              value={popupInviteUrl}
              readOnly
              className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(popupInviteUrl)
                toast.success('Kopierad')
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
