import type { Payload, PayloadRequest } from 'payload'
import type { WineClub, BlindBattle } from '@/payload-types'

export async function loadClubMembership(
  payload: Payload,
  clubId: number,
  userId: number,
): Promise<{ role: 'owner' | 'admin' | 'member' } | null> {
  const club = (await payload.findByID({
    collection: 'wine-clubs',
    id: clubId,
    depth: 0,
    overrideAccess: true,
  })) as WineClub
  const m = (club.members ?? []).find((mm) => {
    const uid = typeof mm.user === 'object' ? mm.user?.id : mm.user
    return uid === userId
  })
  if (!m) return null
  return { role: m.role as 'owner' | 'admin' | 'member' }
}

export async function viewerCanHostBattle(
  req: PayloadRequest,
  battle: BlindBattle,
): Promise<boolean> {
  if (!req.user) return false
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId === req.user.id) return true
  const clubRef = battle.club
  if (!clubRef) return false
  const clubId = typeof clubRef === 'object' ? clubRef.id : clubRef
  if (clubId == null) return false
  const membership = await loadClubMembership(req.payload, clubId, req.user.id)
  return membership?.role === 'owner' || membership?.role === 'admin'
}
