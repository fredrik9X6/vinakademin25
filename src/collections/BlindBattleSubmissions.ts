import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

const readAccess: Access = async ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return {
    or: [
      { user: { equals: req.user.id } },
      // Host of the battle can read submissions for their battles
      { 'battle.host': { equals: req.user.id } } as any,
    ],
  } as any
}

const createAccess: Access = ({ req }) => Boolean(req.user)

const updateAccess: Access = async ({ req, id }) => {
  if (!req.user || id == null) return false
  if (req.user.role === 'admin') return true
  const submission = await req.payload.findByID({
    collection: 'blind-battle-submissions',
    id,
    depth: 1,
    overrideAccess: true,
  })
  if (!submission) return false
  const submitterId =
    typeof (submission as any).user === 'object'
      ? (submission as any).user?.id
      : (submission as any).user
  if (submitterId === req.user.id) return true
  const battle = (submission as any).battle
  const hostId =
    typeof battle === 'object' ? (battle as any)?.host?.id || (battle as any)?.host : null
  return hostId != null && hostId === req.user.id
}

const deleteAccess: Access = updateAccess

export const BlindBattleSubmissions: CollectionConfig = {
  slug: 'blind-battle-submissions',
  labels: { singular: 'Blindkamps-bidrag', plural: 'Blindkamps-bidrag' },
  admin: {
    group: 'Social',
    useAsTitle: 'id',
    defaultColumns: ['battle', 'user', 'guestEmail', 'status', 'submittedAt'],
  },
  access: {
    read: readAccess,
    create: createAccess,
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'battle', type: 'relationship', relationTo: 'blind-battles', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'guestEmail', type: 'email' },
    { name: 'guestName', type: 'text' },
    {
      name: 'systembolagetProduct',
      type: 'relationship',
      relationTo: 'systembolaget-products',
    },
    {
      name: 'customWine',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'producer', type: 'text' },
        { name: 'vintage', type: 'text' },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Rött', value: 'red' },
            { label: 'Vitt', value: 'white' },
            { label: 'Rosé', value: 'rose' },
            { label: 'Mousserande', value: 'sparkling' },
            { label: 'Orange', value: 'orange' },
            { label: 'Dessert', value: 'dessert' },
          ],
        },
        { name: 'priceSek', type: 'number' },
        { name: 'systembolagetUrl', type: 'text' },
        { name: 'imageUrl', type: 'text' },
      ],
    },
    {
      name: 'pourOrder',
      type: 'number',
      admin: {
        description:
          'Random slot 1..N assigned when the host opens the session. Shown to the submitter as their private "secret slot", and used as the pour order during the tasting.',
      },
    },
    { name: 'submittedAt', type: 'date' },
    { name: 'revealedAt', type: 'date' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      options: [
        { label: 'Inbjuden', value: 'invited' },
        { label: 'Inlämnad', value: 'submitted' },
        { label: 'Tackat nej', value: 'declined' },
        { label: 'Uteblev', value: 'no_show' },
      ],
    },
    {
      name: 'submissionToken',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Opaque token used in the per-participant submission URL.' },
    },
  ],
}
