'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useActiveSession } from '@/context/SessionContext'

interface StartSessionButtonProps {
  courseId: number
  courseTitle: string
  courseSlug?: string
}

export default function StartSessionButton({
  courseId,
  courseTitle,
  courseSlug,
}: StartSessionButtonProps) {
  const router = useRouter()
  const { joinSession } = useActiveSession()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'create' | 'share'>('create')
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          sessionName: sessionName || `${courseTitle} - Gruppsession`,
          maxParticipants: 50,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Kunde inte skapa session')
        setLoading(false)
        return
      }

      setSession(data.session)
      setStep('share')
      setLoading(false)
    } catch (err) {
      console.error('Create session error:', err)
      setError('Ett oväntat fel uppstod. Försök igen.')
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/delta?code=${session.joinCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartSession = () => {
    // Store session metadata using context for persistent banner
    if (session) {
      const sessionData = {
        sessionId: String(session.id),
        courseSlug: String(courseSlug || courseId),
        courseId: courseId,
        courseName: courseTitle,
        sessionName: session.sessionName || `Session ${session.joinCode}`,
        expiresAt: session.expiresAt,
      }
      joinSession(sessionData)
    }

    setIsOpen(false)
    // Redirect to course with session parameter, use slug if available
    const coursePath = courseSlug || courseId
    router.push(`/vinprovningar/${coursePath}?session=${session.id}&host=true`)
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('create')
    setSessionName('')
    setError('')
    setSession(null)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="lg" className="w-full">
        <Users className="mr-2 h-5 w-5" />
        Bjud in gäster
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          {step === 'create' ? (
            <>
              <DialogHeader>
                <DialogTitle>Starta gruppsession</DialogTitle>
                <DialogDescription>
                  Skapa en live-session där dina vänner kan gå med och lära sig tillsammans
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateSession} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="sessionName">Sessionens namn (valfritt)</Label>
                  <Input
                    id="sessionName"
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder={`${courseTitle} - Gruppsession`}
                    maxLength={100}
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Detta namn hjälper deltagare att identifiera sessionen
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                    disabled={loading}
                  >
                    Avbryt
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Skapar...
                      </>
                    ) : (
                      'Skapa session'
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Session skapad!</DialogTitle>
                <DialogDescription>
                  Dela koden eller länken med dina vänner för att de ska kunna gå med
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sessionskod</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center text-3xl font-mono font-bold tracking-widest bg-muted py-4 rounded-md">
                      {session?.joinCode}
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Deltagare kan gå till vinakademin.se/delta och ange denna kod
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Direktlänk</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/delta?code=${session?.joinCode}`}
                      className="font-mono text-sm"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    Sessionen är giltig i 24 timmar och kan ha upp till {session?.maxParticipants}{' '}
                    deltagare.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleStartSession} size="lg" className="w-full">
                  Starta vinprovningen
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
