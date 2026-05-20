'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Trash2, ShieldCheck } from 'lucide-react'

export function MembersClient({
  clubId,
  members,
  viewerRole,
  viewerId,
  inviteUrl,
}: {
  clubId: number
  members: any[]
  viewerRole: 'owner' | 'admin' | 'member'
  viewerId: number
  inviteUrl: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const canManage = viewerRole === 'owner' || viewerRole === 'admin'

  async function invite() {
    if (!email.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'invite', email }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte bjuda in')
        return
      }
      toast.success('Medlem tillagd')
      setEmail('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: number) {
    if (!confirm('Ta bort medlem?')) return
    const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'remove', userId }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e?.error || 'Kunde inte ta bort')
      return
    }
    toast.success('Medlem borttagen')
    router.refresh()
  }

  async function toggleRole(userId: number, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'role', userId, role: newRole }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e?.error || 'Kunde inte uppdatera roll')
      return
    }
    router.refresh()
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl)
    toast.success('Länk kopierad')
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-medium">Bjud in fler</h2>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vän@exempel.se"
            />
            <Button onClick={invite} disabled={busy}>
              Bjud in
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Eller dela länken:</p>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly />
              <Button variant="outline" onClick={copyInvite}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      <ul className="space-y-2">
        {members.map((m, idx) => {
          const u = typeof m.user === 'object' ? m.user : null
          const uid = u?.id ?? m.user
          const name = (u?.firstName || u?.email || `Medlem #${uid}`) as string
          const isOwner = m.role === 'owner'
          const isSelf = uid === viewerId
          return (
            <li
              key={idx}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.role === 'owner' ? 'Ägare' : m.role === 'admin' ? 'Admin' : 'Medlem'}
                </p>
              </div>
              {canManage && !isOwner && !isSelf && (
                <div className="flex gap-1.5">
                  {viewerRole === 'owner' && (
                    <Button size="sm" variant="outline" onClick={() => toggleRole(uid, m.role)}>
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      {m.role === 'admin' ? 'Gör till medlem' : 'Gör till admin'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(uid)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
