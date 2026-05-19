// src/collections/WineClubs.ts
import type { CollectionConfig } from 'payload'
import type { Access, PayloadRequest } from 'payload'

/** Member of the viewer is on the club's members[] list. */
async function viewerIsMember(req: PayloadRequest, clubId: number | string): Promise<boolean> {
  if (!req.user) return false
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id: clubId,
    depth: 0,
    overrideAccess: true,
  })
  return (club as any)?.members?.some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === req.user!.id
  })
}

const readAccess: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (id) return viewerIsMember(req, id)
  // List: restrict to clubs the user is a member of
  return {
    'members.user': { equals: req.user.id },
  } as any
}

const updateAccess: Access = async ({ req, id }) => {
  if (!req.user || !id) return false
  if (req.user.role === 'admin') return true
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id,
    depth: 0,
    overrideAccess: true,
  })
  return (club as any)?.members?.some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === req.user!.id && (m.role === 'owner' || m.role === 'admin')
  })
}

const deleteAccess: Access = async ({ req, id }) => {
  if (!req.user || !id) return false
  if (req.user.role === 'admin') return true
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id,
    depth: 0,
    overrideAccess: true,
  })
  const ownerId =
    typeof (club as any)?.owner === 'object' ? (club as any).owner?.id : (club as any).owner
  return ownerId === req.user.id
}

export const WineClubs: CollectionConfig = {
  slug: 'wine-clubs',
  admin: {
    group: 'Social',
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'updatedAt'],
  },
  access: {
    read: readAccess,
    create: ({ req }) => Boolean(req.user),
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 80 },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'inviteCode',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Short code used in shareable join links.' },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'members',
      type: 'array',
      fields: [
        { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'member',
          options: [
            { label: 'Ägare', value: 'owner' },
            { label: 'Admin', value: 'admin' },
            { label: 'Medlem', value: 'member' },
          ],
        },
        { name: 'joinedAt', type: 'date', required: true },
      ],
    },
  ],
}
