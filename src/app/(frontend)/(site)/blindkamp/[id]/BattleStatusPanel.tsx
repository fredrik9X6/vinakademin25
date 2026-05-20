'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, ArrowRight } from 'lucide-react'

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
      <Card>
        <CardContent className="p-5 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
          <p className="font-medium">
            {status === 'submissions_open' && `${submittedCount} av ${totalCount} har lämnat in`}
            {status === 'in_session' && 'Provning pågår'}
            {status === 'completed' && 'Klar'}
            {status === 'draft' && 'Utkast'}
            {status === 'canceled' && 'Avbruten'}
          </p>
        </CardContent>
      </Card>

      {mySubmissionToken && mySubmissionStatus !== 'submitted' && status === 'submissions_open' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="font-medium">Du har inte lämnat in ett vin än</p>
            <Button asChild>
              <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>
                Välj ditt vin <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {mySubmissionToken && mySubmissionStatus === 'submitted' && status === 'submissions_open' && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="font-medium">Du har lämnat in ditt vin</p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>
                Ändra ditt val
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isHost && status === 'submissions_open' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="font-medium">Värdkontroller</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sendInvites} disabled={busy} variant="outline" size="sm">
                Skicka inbjudningar
              </Button>
              <Button onClick={openSession} disabled={busy || submittedCount < 2} size="sm">
                {submittedCount < 2 ? 'Behöver ≥ 2 bidrag' : 'Starta provningen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isHost && status === 'in_session' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Button asChild>
              <Link href={`/blindkamp/${battleId}/provning`}>Återgå till provningen</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'completed' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Button asChild>
              <Link href={`/blindkamp/${battleId}/resultat`}>Visa resultat</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {popupInviteUrl && (
        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inbjudningslänk</p>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
