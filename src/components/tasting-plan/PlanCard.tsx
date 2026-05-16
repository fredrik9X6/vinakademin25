'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { TastingPlan } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'

const STATUS_LABEL: Record<TastingPlan['status'], string> = {
  draft: 'Utkast',
  ready: 'Klar',
  archived: 'Arkiverad',
}

const STATUS_VARIANT: Record<TastingPlan['status'], 'brand' | 'default' | 'secondary'> = {
  draft: 'brand',
  ready: 'default',
  archived: 'secondary',
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'just nu'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min sedan`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} tim sedan`
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} d sedan`
  return new Date(iso).toLocaleDateString('sv-SE')
}

export interface PlanCardProps {
  plan: TastingPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [confirmRestore, setConfirmRestore] = React.useState(false)
  const [restoring, setRestoring] = React.useState(false)
  const wineCount = plan.wines?.length ?? 0
  const isArchived = plan.status === 'archived'

  async function performDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/tasting-plans/${plan.id}`, { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as {
        archived?: boolean
        deleted?: boolean
        error?: string
      }
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte ta bort planen.')
        return
      }
      toast.success(data.archived ? 'Arkiverad.' : 'Borttagen permanent.')
      router.refresh()
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  async function performRestore() {
    setRestoring(true)
    try {
      const res = await fetch(`/api/tasting-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data?.error || 'Kunde inte återställa planen.')
        return
      }
      toast.success('Återställd.')
      router.refresh()
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setRestoring(false)
      setConfirmRestore(false)
    }
  }

  return (
    <>
      <Card
        className={`relative p-4 hover:shadow-md transition-shadow flex flex-col gap-3 ${
          isArchived ? 'opacity-60' : ''
        }`}
      >
        <Link
          href={`/mina-provningar/planer/${plan.id}`}
          className="absolute inset-0 z-0"
          aria-label={plan.title}
        />
        <div className="flex items-start justify-between relative z-10 pointer-events-none">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-semibold truncate">{plan.title}</h3>
          </div>
          <div className="flex-shrink-0 pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={busy} aria-label="Åtgärder">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isArchived && (
                  <DropdownMenuItem onClick={() => setConfirmRestore(true)}>
                    Återställ
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                  {isArchived ? 'Ta bort permanent' : 'Arkivera'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
            <span className="text-xs text-muted-foreground">{wineCount} viner</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatRelative(plan.updatedAt)}</span>
        </div>
      </Card>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? 'Ta bort permanent?' : 'Arkivera planen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? 'Den här åtgärden går inte att ångra.'
                : 'Planen försvinner från listan men finns kvar i databasen tills du tar bort den igen.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault()
                void performDelete()
              }}
            >
              {busy ? 'Tar bort…' : 'Bekräfta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Återställ planen?</AlertDialogTitle>
            <AlertDialogDescription>
              Den flyttas tillbaka till dina aktiva planer som utkast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault()
                void performRestore()
              }}
            >
              {restoring ? 'Återställer…' : 'Bekräfta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
