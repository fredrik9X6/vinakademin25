'use client'

import { useActiveSession } from '@/context/SessionContext'
import { Button } from '@/components/ui/button'
import { Users, X, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ActiveSessionBanner() {
  const { activeSession, isOnSessionPage, leaveSession, getSessionUrl, timeRemaining } =
    useActiveSession()
  const router = useRouter()
  const [isHidden, setIsHidden] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // Don't show banner if:
  // - No active session
  // - User is already on the session page
  // - Banner is temporarily hidden
  if (!activeSession || isOnSessionPage || isHidden) {
    return null
  }

  const handleReturnToSession = () => {
    const url = getSessionUrl()
    if (url) {
      router.push(url)
    }
  }

  const handleLeaveSession = async () => {
    await leaveSession()
    setShowLeaveDialog(false)
  }

  return (
    <>
      {/* Floating Card in Top-Right Corner */}
      <div
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 animate-in slide-in-from-top-5 fade-in duration-500 max-w-[calc(100vw-2rem)] sm:max-w-sm"
        role="banner"
        aria-label="Active group session"
      >
        <div className="bg-gradient-to-br from-[#FB914C] to-[#FDBA75] text-white rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden">
          {/* Header with close button */}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs sm:text-sm leading-tight">Aktiv session</p>
                <p className="text-xs opacity-90 mt-0.5 truncate">
                  {activeSession.sessionName || activeSession.courseName}
                </p>
                {timeRemaining && (
                  <p className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">
                    Utgår om {timeRemaining}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsHidden(true)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Hide temporarily"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="px-3 sm:px-4 pb-2.5 sm:pb-3 flex flex-col gap-1.5 sm:gap-2">
            <Button
              onClick={handleReturnToSession}
              size="sm"
              className="w-full bg-white text-[#FB914C] hover:bg-white/90 font-semibold shadow-sm text-xs sm:text-sm h-8 sm:h-9"
            >
              Återgå till session
            </Button>
            <button
              onClick={() => setShowLeaveDialog(true)}
              className="text-[10px] sm:text-xs text-white/90 hover:text-white underline hover:no-underline transition-all flex items-center justify-center gap-1 sm:gap-1.5 py-1"
              aria-label="Leave session"
            >
              <LogOut className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Lämna session
            </button>
          </div>
        </div>
      </div>

      {/* Leave Session Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lämna gruppsession?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill lämna denna gruppsession? Du kommer inte kunna gå med igen
              såvida inte värden delar koden på nytt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Lämna session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
