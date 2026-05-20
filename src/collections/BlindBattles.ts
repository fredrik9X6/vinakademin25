import type { CollectionConfig } from 'payload'
import type { Access, PayloadRequest } from 'payload'

/**
 * True if the viewer is the battle host OR an owner/admin of the club
 * the battle belongs to. Used by both update + delete access.
 */
async function viewerCanMutate(
  req: PayloadRequest,
  battleId: number | string,
): Promise<boolean> {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  const battle = await req.payload.findByID({
    collection: 'blind-battles',
    id: battleId,
    depth: 1,
    overrideAccess: true,
  })
  if (!battle) return false
  const hostId = typeof (battle as any).host === 'object' ? (battle as any).host?.id : (battle as any).host
  if (hostId === req.user.id) return true
  const clubRef = (battle as any).club
  if (clubRef == null) return false
  const clubObj =
    typeof clubRef === 'object'
      ? clubRef
      : await req.payload.findByID({
          collection: 'wine-clubs',
          id: clubRef,
          depth: 0,
          overrideAccess: true,
        })
  return (
    (clubObj as any)?.members?.some((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return uid === req.user!.id && (m.role === 'owner' || m.role === 'admin')
    }) ?? false
  )
}

const readAccess: Access = async ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  // Member of the club OR host of the battle
  return {
    or: [
      { host: { equals: req.user.id } },
      { 'club.members.user': { equals: req.user.id } } as any,
    ],
  } as any
}

const updateAccess: Access = async ({ req, id }) => {
  if (id == null) return false
  return viewerCanMutate(req, id)
}

const deleteAccess: Access = updateAccess

export const BlindBattles: CollectionConfig = {
  slug: 'blind-battles',
  labels: { singular: 'Blindkamp', plural: 'Blindkampar' },
  admin: {
    group: 'Social',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'host', 'club', 'sessionDate'],
  },
  access: {
    read: readAccess,
    create: ({ req }) => Boolean(req.user),
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'title', type: 'text', maxLength: 120 },
    {
      name: 'theme',
      type: 'group',
      fields: [
        {
          name: 'wineType',
          type: 'select',
          required: true,
          defaultValue: 'any',
          options: [
            { label: 'Vilken som', value: 'any' },
            { label: 'Rött', value: 'red' },
            { label: 'Vitt', value: 'white' },
            { label: 'Rosé', value: 'rose' },
            { label: 'Mousserande', value: 'sparkling' },
            { label: 'Orange', value: 'orange' },
            { label: 'Dessert', value: 'dessert' },
          ],
        },
        { name: 'priceMinSek', type: 'number', min: 0 },
        { name: 'priceMaxSek', type: 'number', min: 0 },
        { name: 'countries', type: 'relationship', relationTo: 'countries', hasMany: true },
        { name: 'grapes', type: 'relationship', relationTo: 'grapes', hasMany: true },
      ],
    },
    { name: 'themeDescription', type: 'textarea' },
    { name: 'host', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'club', type: 'relationship', relationTo: 'wine-clubs', index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Öppen för bidrag', value: 'submissions_open' },
        { label: 'Pågående provning', value: 'in_session' },
        { label: 'Klar', value: 'completed' },
        { label: 'Avbruten', value: 'canceled' },
      ],
    },
    { name: 'submissionDeadline', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'sessionDate', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'wineCount', type: 'number', min: 2, max: 30 },
    {
      name: 'revealStrategy',
      type: 'select',
      required: true,
      defaultValue: 'all_at_end',
      options: [
        { label: 'Avslöja ett vin i taget', value: 'one_by_one' },
        { label: 'Avslöja allt i slutet', value: 'all_at_end' },
      ],
    },
    { name: 'inviteCode', type: 'text', required: true, unique: true, index: true },
    {
      name: 'currentSession',
      type: 'relationship',
      relationTo: 'course-sessions',
      admin: { description: 'Populated when the host opens the session.' },
    },
    {
      name: 'remindersSentAt',
      type: 'date',
      admin: { readOnly: true, description: 'Stamped when the 24h-before reminder fired.' },
    },
  ],
}
