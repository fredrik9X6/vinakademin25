'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2, UserCircle, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useActiveSession } from '@/context/SessionContext'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface JoinSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  /** If true, render outside a Dialog (used by the dedicated /delta page). */
  standalone?: boolean
  /** Pre-fill the join code (e.g. from `?code=ABC123`). */
  initialCode?: string
}

const NICKNAME_LS_KEY = 'vk_session_nickname'
const EMAIL_LS_KEY = 'vk_session_email'

export default function JoinSessionDialog({
  isOpen,
  onClose,
  standalone = false,
  initialCode = '',
}: JoinSessionDialogProps) {
  const router = useRouter()
  const { joinSession } = useActiveSession()
  const { user, isLoading: isAuthLoading } = useAuth()

  const [tab, setTab] = useState<'guest' | 'auth'>('guest')
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase())
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Default to "Logga in" tab once we know the user is authenticated
  useEffect(() => {
    if (!isAuthLoading && user) setTab('auth')
  }, [user, isAuthLoading])

  // Restore previously-used nickname/email so repeat guests don't re-type
  useEffect(() => {
    try {
      const n = localStorage.getItem(NICKNAME_LS_KEY)
      const e = localStorage.getItem(EMAIL_LS_KEY)
      if (n) setNickname(n)
      if (e) setEmail(e)
    } catch {
      // localStorage may be blocked — ignore
    }
  }, [])

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) setJoinCode(value)
  }

  const submitJoin = async (mode: 'guest' | 'auth') => {
    setError('')
    setLoading(true)
    try {
      const body: Record<string, string> = { joinCode: joinCode.toUpperCase().trim() }
      if (mode === 'guest') {
        if (!nickname.trim()) {
          setError('Ange ditt namn')
          setLoading(false)
          return
        }
        body.nickname = nickname.trim()
        if (email.trim()) body.email = email.trim()
        // Persist for next time
        try {
          localStorage.setItem(NICKNAME_LS_KEY, nickname.trim())
          if (email.trim()) localStorage.setItem(EMAIL_LS_KEY, email.trim())
        } catch {
          // ignore
        }
      }

      const response = await fetch('/api/sessions/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Kunde inte ansluta till sessionen')
        setLoading(false)
        return
      }

      // Persist participant identity client-side too (cookie is httpOnly,
      // so other components rely on these for read access).
      try {
        localStorage.setItem('participantToken', data.participant.participantToken)
        localStorage.setItem('participantId', String(data.participant.id))
        localStorage.setItem('participantNickname', data.participant.nickname)
        if (data.user) localStorage.setItem('sessionUserId', String(data.user.id))
      } catch {
        // ignore
      }

      const courseSlug = data.session.course.slug || data.session.course.id
      joinSession({
        sessionId: String(data.session.id),
        courseSlug,
        courseId: data.session.course.id,
        courseName: data.session.course.title,
        sessionName: data.session.sessionName || `Session ${joinCode}`,
        expiresAt: data.session.expiresAt,
      })

      router.push(`/vinprovningar/${courseSlug}?session=${data.session.id}`)
    } catch (err) {
      console.error('Join error:', err)
      setError('Ett oväntat fel uppstod. Försök igen.')
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitJoin(tab)
  }

  // ── Form bodies ──────────────────────────────────────────────────────────

  const codeInput = (
    <div className="space-y-2">
      <Label htmlFor="joinCode">Sessionskod</Label>
      <Input
        id="joinCode"
        type="text"
        value={joinCode}
        onChange={handleCodeChange}
        placeholder="ABC123"
        className="text-center text-2xl tracking-widest font-mono"
        maxLength={6}
        required
        disabled={loading}
        autoComplete="off"
        inputMode="text"
        autoCapitalize="characters"
      />
    </div>
  )

  const guestForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {codeInput}
      <div className="space-y-2">
        <Label htmlFor="nickname">Ditt namn</Label>
        <Input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="t.ex. Fredrik"
          maxLength={50}
          required
          disabled={loading}
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">
          E-post <span className="text-muted-foreground font-normal">(valfritt)</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@email.se"
          disabled={loading}
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          Om du anger din e-post kan vi spara dina recensioner till ett konto efteråt.
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || !joinCode || !nickname.trim()}
        className="btn-brand w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ansluter…
          </>
        ) : (
          'Gå med'
        )}
      </button>
    </form>
  )

  const authForm = user ? (
    <form onSubmit={handleSubmit} className="space-y-4">
      {codeInput}
      <div className="rounded-lg border bg-muted/50 p-3 text-sm">
        Du är inloggad som{' '}
        <span className="font-medium text-foreground">
          {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
        </span>
      </div>
      <button type="submit" disabled={loading || !joinCode} className="btn-brand w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ansluter…
          </>
        ) : (
          'Gå med med mitt konto'
        )}
      </button>
    </form>
  ) : (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Du behöver vara inloggad för att gå med med ditt konto. Vill du istället gå med som
        gäst? Byt till fliken Snabbstart ovan.
      </p>
      <Button asChild variant="outline" className="w-full">
        <Link
          href={`/logga-in?redirect=${encodeURIComponent(`/delta?code=${joinCode || ''}`)}`}
        >
          Logga in
        </Link>
      </Button>
    </div>
  )

  // ── Layouts ──────────────────────────────────────────────────────────────

  const body = (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'guest' | 'auth')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="guest" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Snabbstart
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-1.5">
            <UserCircle className="h-3.5 w-3.5" /> Logga in
          </TabsTrigger>
        </TabsList>
        <TabsContent value="guest" className="mt-4">
          {guestForm}
        </TabsContent>
        <TabsContent value="auth" className="mt-4">
          {authForm}
        </TabsContent>
      </Tabs>
    </>
  )

  if (standalone) {
    return <div className="max-w-md mx-auto">{body}</div>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gå med i grupprovning</DialogTitle>
          <DialogDescription>
            Ange koden från arrangören. Du kan gå med direkt som gäst — inget konto krävs.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
