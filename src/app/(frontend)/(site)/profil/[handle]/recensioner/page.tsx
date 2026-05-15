import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Review, User } from '@/payload-types'
import { WineReviewListItem } from '@/components/wine-review/WineReviewListItem'

export const dynamic = 'force-dynamic'

async function loadHandle(handle: string): Promise<User | null> {
  const payload = await getPayload({ config })
  const lowered = handle.toLowerCase()
  const { docs } = await payload.find({
    collection: 'users',
    where: { handle: { equals: lowered } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (docs[0] as User) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const user = await loadHandle(handle)
  if (!user) return { title: 'Profil saknas — Vinakademin' }
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || `@${user.handle}`
  return {
    title: `${name}s recensioner — Vinakademin`,
    description: `Publicerade vinrecensioner av ${name}.`,
  }
}

export default async function ProfilRecensionerPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const profileUser = await loadHandle(handle)
  // Honor public/private toggle. Default true for users created before
  // the profilePublic field existed.
  if (!profileUser || (profileUser as any).profilePublic === false) notFound()

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'reviews',
    where: {
      and: [
        { user: { equals: profileUser.id } },
        { publishedToProfile: { equals: true } },
      ],
    },
    sort: '-createdAt',
    limit: 200,
    depth: 2,
    overrideAccess: true, // we've already gated on profilePublic + publishedToProfile
  })
  const reviews = docs as Review[]
  const displayName =
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(' ') ||
    `@${profileUser.handle}`

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link
          href={`/profil/${handle}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {displayName}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Recensioner av {displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length} publicerad{reviews.length === 1 ? '' : 'e'} recension
          {reviews.length === 1 ? '' : 'er'}.
        </p>
      </header>

      {reviews.length === 0 ? (
        <p className="text-muted-foreground">Inga publicerade recensioner än.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <WineReviewListItem
                review={r}
                href={`/profil/${handle}/recension/${r.id}`}
                showPublishedBadge={false}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
