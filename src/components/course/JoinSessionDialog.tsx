'use client'

import { useState } from 'react'
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
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useActiveSession } from '@/context/SessionContext'

interface JoinSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  standalone?: boolean // If true, redirect to course after join instead of closing dialog
  initialCode?: string // Pre-fill the join code
}

export default function JoinSessionDialog({
  isOpen,
  onClose,
  standalone = false,
  initialCode = '',
}: JoinSessionDialogProps) {
  const router = useRouter()
  const { joinSession } = useActiveSession()
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode: joinCode.toUpperCase().trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if authentication is required
        if (data.requiresAuth) {
          // Redirect to login with return URL
          const returnUrl = encodeURIComponent(`/delta?code=${joinCode.toUpperCase().trim()}`)
          router.push(`/logga-in?redirect=${returnUrl}`)
          return
        }

        setError(data.error || 'Kunde inte ansluta till sessionen')
        setLoading(false)
        return
      }

      // Store participant token and user info in localStorage
      localStorage.setItem('participantToken', data.participant.participantToken)
      localStorage.setItem('participantId', data.participant.id)
      localStorage.setItem('participantNickname', data.participant.nickname)
      if (data.user) {
        localStorage.setItem('sessionUserId', data.user.id)
      }

      // Store session metadata using context
      const courseSlug = data.session.course.slug || data.session.course.id
      const sessionData = {
        sessionId: String(data.session.id),
        courseSlug: courseSlug,
        courseId: data.session.course.id,
        courseName: data.session.course.title,
        sessionName: data.session.sessionName || `Session ${data.session.joinCode}`,
        expiresAt: data.session.expiresAt,
      }
      joinSession(sessionData)

      // Redirect to session
      router.push(`/vinprovningar/${courseSlug}?session=${data.session.id}`)
    } catch (err) {
      console.error('Join error:', err)
      setError('Ett oväntat fel uppstod. Försök igen.')
      setLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) {
      setJoinCode(value)
    }
  }

  if (standalone) {
    // Standalone version for /delta page
    return (
      <div className="max-w-md mx-auto">
        <form onSubmit={handleJoin} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
            />
            <p className="text-sm text-muted-foreground">
              Ange den 6-siffriga koden från arrangören för att ansluta till grupprovningen
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">💡 Tips:</strong> Du måste vara inloggad för att
              gå med i en session. Om du inte är inloggad kommer du att omdirigeras till
              inloggningssidan.
            </p>
          </div>

          <button type="submit" disabled={loading || !joinCode} className="btn-brand-lg w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ansluter...
              </>
            ) : (
              'Gå med i sessionen'
            )}
          </button>
        </form>
      </div>
    )
  }

  // Dialog version for embedded usage
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gå med i grupprovning</DialogTitle>
          <DialogDescription>Ange koden du fick från arrangören för att ansluta</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="joinCode">Sessionskod</Label>
            <Input
              id="joinCode"
              type="text"
              value={joinCode}
              onChange={handleCodeChange}
              placeholder="ABC123"
              className="text-center text-xl tracking-widest font-mono"
              maxLength={6}
              required
              disabled={loading}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Du måste vara inloggad. Om inte, omdirigeras du till inloggning.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Avbryt
            </Button>
            <button type="submit" disabled={loading || !joinCode} className="btn-brand flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ansluter...
                </>
              ) : (
                'Gå med'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
