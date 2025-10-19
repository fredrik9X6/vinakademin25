'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface SessionData {
  sessionId: string
  courseSlug: string
  courseId: number
  courseName: string
  sessionName: string
  expiresAt: string
}

interface SessionContextValue {
  activeSession: SessionData | null
  isOnSessionPage: boolean
  joinSession: (data: SessionData) => void
  leaveSession: () => Promise<void>
  getSessionUrl: () => string | null
  timeRemaining: string | null
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

const SESSION_STORAGE_KEY = 'activeSession'
const EXPIRATION_CHECK_INTERVAL = 30000 // 30 seconds
const WARNING_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<SessionData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [hasShownWarning, setHasShownWarning] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Check if user is currently on the session page
  const isOnSessionPage = useCallback(() => {
    if (!activeSession) return false
    const currentSessionId = searchParams.get('session')
    return (
      pathname.includes(`/vinprovningar/${activeSession.courseSlug}`) &&
      currentSessionId === activeSession.sessionId
    )
  }, [activeSession, pathname, searchParams])

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) {
      try {
        const sessionData: SessionData = JSON.parse(stored)

        // Check if session has expired
        const expiresAt = new Date(sessionData.expiresAt)
        const now = new Date()

        if (expiresAt > now) {
          setActiveSession(sessionData)
        } else {
          // Session expired, clean up
          localStorage.removeItem(SESSION_STORAGE_KEY)
          toast.error('Din gruppsession har utgått')
        }
      } catch (error) {
        console.error('Error loading session from localStorage:', error)
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
  }, [])

  // Calculate time remaining and check expiration
  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining(null)
      return
    }

    const updateTimeRemaining = () => {
      const expiresAt = new Date(activeSession.expiresAt)
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        // Session expired
        setActiveSession(null)
        localStorage.removeItem(SESSION_STORAGE_KEY)
        toast.error('Din gruppsession har utgått')
        return
      }

      // Show warning if less than 5 minutes remain
      if (diff < WARNING_THRESHOLD && !hasShownWarning) {
        const minutes = Math.ceil(diff / 60000)
        toast.warning(`Din gruppsession utgår om ${minutes} minut${minutes !== 1 ? 'er' : ''}`)
        setHasShownWarning(true)
      }

      // Format time remaining
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else {
        setTimeRemaining(`${minutes}m`)
      }
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, EXPIRATION_CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [activeSession, hasShownWarning])

  const joinSession = useCallback((data: SessionData) => {
    setActiveSession(data)
    setHasShownWarning(false)
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
  }, [])

  const leaveSession = useCallback(async () => {
    if (!activeSession) return

    try {
      // Call API to mark participant as inactive
      const response = await fetch('/api/sessions/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to leave session')
      }

      // Clear local state and storage
      setActiveSession(null)
      localStorage.removeItem(SESSION_STORAGE_KEY)
      toast.success('Du har lämnat gruppsessionen')
    } catch (error) {
      console.error('Error leaving session:', error)
      // Clear locally even if API call fails
      setActiveSession(null)
      localStorage.removeItem(SESSION_STORAGE_KEY)
      toast.error('Kunde inte lämna sessionen')
    }
  }, [activeSession])

  const getSessionUrl = useCallback(() => {
    if (!activeSession) return null
    return `/vinprovningar/${activeSession.courseSlug}?session=${activeSession.sessionId}`
  }, [activeSession])

  const value: SessionContextValue = {
    activeSession,
    isOnSessionPage: isOnSessionPage(),
    joinSession,
    leaveSession,
    getSessionUrl,
    timeRemaining,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useActiveSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useActiveSession must be used within a SessionProvider')
  }
  return context
}
