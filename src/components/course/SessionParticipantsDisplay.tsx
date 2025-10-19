'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, UserCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface Participant {
  id: number
  nickname: string
  joinedAt: string
  isActive: boolean
  isHost?: boolean
  user: {
    id: number
    firstName?: string
    lastName?: string
    email: string
  } | null
}

interface SessionParticipantsDisplayProps {
  sessionId: string
  participantToken?: string
}

export function SessionParticipantsDisplay({
  sessionId,
  participantToken,
}: SessionParticipantsDisplayProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const url = new URL(`/api/sessions/${sessionId}`, window.location.origin)
        if (participantToken) {
          url.searchParams.set('participantToken', participantToken)
        }

        const response = await fetch(url.toString(), {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch session participants')
        }

        const data = await response.json()
        setParticipants(data.participants || [])
        setSessionInfo(data.session)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching participants:', err)
        setError('Kunde inte hämta deltagare')
        setLoading(false)
      }
    }

    fetchParticipants()

    // Refresh participants every 10 seconds
    const interval = setInterval(fetchParticipants, 10000)
    return () => clearInterval(interval)
  }, [sessionId, participantToken])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-[#FB914C]',
      'bg-[#FDBA75]',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Deltagare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Laddar deltagare...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Deltagare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#FB914C]/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#FB914C]" />
            Deltagare i session
          </CardTitle>
          <Badge variant="secondary" className="bg-[#FDBA75]/10 text-[#FB914C]">
            <UserCheck className="h-3 w-3 mr-1" />
            {participants.length} aktiva
          </Badge>
        </div>
        {sessionInfo?.sessionName && (
          <CardDescription className="flex items-center gap-2">
            {sessionInfo.sessionName}
          </CardDescription>
        )}
        {sessionInfo?.expiresAt && (
          <CardDescription className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Sessionen utgår{' '}
            {formatDistanceToNow(new Date(sessionInfo.expiresAt), {
              addSuffix: true,
              locale: sv,
            })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga deltagare ännu. Dela koden för att bjuda in personer!
            </p>
          ) : (
            participants.map((participant, index) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-[#FB914C]/30 transition-colors"
              >
                <Avatar className={`${getAvatarColor(index)} text-white`}>
                  <AvatarFallback className={`${getAvatarColor(index)} text-white`}>
                    {participant.user && (participant.user.firstName || participant.user.lastName)
                      ? getInitials(
                          `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim(),
                        )
                      : getInitials(participant.nickname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {participant.user && (participant.user.firstName || participant.user.lastName)
                        ? `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim()
                        : participant.nickname}
                    </p>
                    {participant.isHost && <Badge variant="outline">Värd</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {participant.isHost ? 'Startade sessionen' : 'Anslöt'}{' '}
                    {formatDistanceToNow(new Date(participant.joinedAt), {
                      addSuffix: true,
                      locale: sv,
                    })}
                  </p>
                </div>
                {participant.isActive && (
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {sessionInfo?.joinCode && (
          <div className="mt-4 p-3 rounded-lg bg-[#FDBA75]/5 border border-[#FDBA75]/20">
            <p className="text-xs text-muted-foreground mb-1">Sessionskod:</p>
            <p className="font-mono text-lg font-bold text-[#FB914C] tracking-widest">
              {sessionInfo.joinCode}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
