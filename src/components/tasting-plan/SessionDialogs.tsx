'use client'

import * as React from 'react'
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

export interface SessionDialogsProps {
  endDialogOpen: boolean
  onEndDialogOpenChange: (open: boolean) => void
  leaveDialogOpen: boolean
  onLeaveDialogOpenChange: (open: boolean) => void
  /** Shared submit-in-flight flag for both the end and the leave dialog. */
  endingOrLeaving: boolean
  onConfirmEnd: () => void
  onConfirmLeave: () => void
  /** Whether the reveal-guard dialog is open — true whenever the host
   * attempted a reveal while online participants were still missing an
   * entry. */
  revealGuardOpen: boolean
  onRevealGuardOpenChange: (open: boolean) => void
  /** Missing/total counts for the pour pending confirmation. Null while the
   * guard is closed (there is nothing to describe). */
  revealGuardInfo: { missing: number; total: number } | null
  onConfirmRevealAnyway: () => void
}

/**
 * The session's three `AlertDialog`s: end-session (host), leave-session
 * (guest), and the reveal-guard confirmation (host, shown when online
 * participants are still missing an entry for the wine being revealed).
 *
 * Pure presentation — all state (open flags, in-flight status, the
 * missing/total counts) lives in `PlanSessionContent`; this component only
 * renders it and forwards confirm/cancel back up.
 */
export function SessionDialogs({
  endDialogOpen,
  onEndDialogOpenChange,
  leaveDialogOpen,
  onLeaveDialogOpenChange,
  endingOrLeaving,
  onConfirmEnd,
  onConfirmLeave,
  revealGuardOpen,
  onRevealGuardOpenChange,
  revealGuardInfo,
  onConfirmRevealAnyway,
}: SessionDialogsProps) {
  return (
    <>
      <AlertDialog open={endDialogOpen} onOpenChange={onEndDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta sessionen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla deltagare kopplas bort och sessionen markeras som klar. Du kan inte återuppta
              den.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                onConfirmEnd()
              }}
            >
              {endingOrLeaving ? 'Avslutar…' : 'Avsluta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveDialogOpen} onOpenChange={onLeaveDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lämna provningen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du kan ansluta igen med samma kod om sessionen fortfarande är aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingOrLeaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingOrLeaving}
              onClick={(e) => {
                e.preventDefault()
                onConfirmLeave()
              }}
            >
              {endingOrLeaving ? 'Lämnar…' : 'Lämna'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revealGuardOpen} onOpenChange={onRevealGuardOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avslöja redan nu?</AlertDialogTitle>
            <AlertDialogDescription>
              {revealGuardInfo
                ? `${revealGuardInfo.missing} av ${revealGuardInfo.total} har inte svarat än — avslöja ändå?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                onConfirmRevealAnyway()
              }}
            >
              Avslöja ändå
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
