import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * SessionGuesses
 *
 * One row per (session, pour, identity). Identity is either a logged-in
 * `user` OR an unauthenticated `sessionParticipant` (guest). The POST endpoint
 * (`/api/session-guesses`) is the only writer in v1 and enforces upserts so
 * we never end up with two rows for the same identity+pour.
 *
 * Reads are admin-only by default. The live guest UI reads its own guesses
 * via a dedicated GET endpoint that filters to the caller's identity, and
 * the recap aggregator reads everything via `overrideAccess: true` server-side.
 */
export const SessionGuesses: CollectionConfig = {
  slug: 'session-guesses',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['session', 'pourOrder', 'guessedCountry', 'guessedGrape', 'guessedPriceBucket'],
    group: 'Sessions',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: adminOnly,
    update: ({ req }) => Boolean(req.user),
    delete: adminOnly,
  },
  fields: [
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'course-sessions',
      required: true,
      index: true,
    },
    {
      name: 'sessionParticipant',
      type: 'relationship',
      relationTo: 'session-participants',
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'pourOrder',
      type: 'number',
      required: true,
      index: true,
      min: 1,
    },
    { name: 'guessedCountry', type: 'text' },
    { name: 'guessedGrape', type: 'text' },
    {
      name: 'guessedPriceBucket',
      type: 'select',
      options: [
        { label: 'Under 100 kr', value: '0_99' },
        { label: '100–149 kr', value: '100_149' },
        { label: '150–199 kr', value: '150_199' },
        { label: '200–249 kr', value: '200_249' },
        { label: '250–299 kr', value: '250_299' },
        { label: '300+ kr', value: '300_plus' },
      ],
    },
    {
      // NULL = draft / autosaved; set = "locked in" (Lås in). MUST NOT gate
      // recap inclusion — drives the swarm/host tracker and the social
      // "I'm done" moment only.
      name: 'submittedAt',
      type: 'date',
      index: true,
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
