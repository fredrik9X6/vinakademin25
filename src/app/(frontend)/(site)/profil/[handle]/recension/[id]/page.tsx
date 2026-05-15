import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Card, CardContent } from '@/components/ui/card'
import type { Review, User, Wine, Media } from '@/payload-types'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

async function loadHandle(handle: string): Promise<User | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'users',
    where: { handle: { equals: handle.toLowerCase() } },
    limit: 1,
    overrideAccess: true,
  })
  return (docs[0] as User) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; id: string }>
}): Promise<Metadata> {
  const { handle, id } = await params
  return { title: `Recension #${id} av ${handle} — Vinakademin` }
}

export default async function PublicReviewDetailPage({
  params,
}: {
  params: Promise<{ handle: string; id: string }>
}) {
  const { handle, id } = await params
  const profileUser = await loadHandle(handle)
  if (!profileUser || (profileUser as any).profilePublic === false) notFound()

  const reviewId = Number(id)
  if (!Number.isInteger(reviewId)) notFound()

  const payload = await getPayload({ config })
  let review: Review | null = null
  try {
    review = (await payload.findByID({
      collection: 'reviews',
      id: reviewId,
      depth: 2,
      overrideAccess: true,
    })) as Review
  } catch {
    notFound()
  }
  if (!review) notFound()

  const ownerId = typeof review.user === 'object' ? (review.user as any)?.id : review.user
  if (ownerId !== profileUser.id) notFound()
  if (!review.publishedToProfile) notFound()

  const wine = review.wine
  const wineObj = typeof wine === 'object' ? (wine as Wine) : null
  const custom: any = (review as any).customWine || {}
  const title = wineObj?.name || custom.name || 'Vin'
  const subtitle = wineObj
    ? [wineObj.winery, wineObj.vintage].filter(Boolean).join(' · ')
    : [custom.producer, custom.vintage].filter(Boolean).join(' · ')
  const image = wineObj?.image
  const thumbUrl =
    typeof image === 'object' && image
      ? (image as Media).url ?? null
      : custom.imageUrl || null
  const rating = (review as any).rating as number | undefined
  const wset: any = (review as any).wsetTasting || {}
  const reviewText = (review as any).reviewText as string | undefined
  const authorDisplay =
    (review as any).authorDisplayName ||
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(' ') ||
    profileUser.handle

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href={`/profil/${handle}/recensioner`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Recensioner av {authorDisplay}
      </Link>

      <Card>
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="w-24 h-24 rounded-md bg-muted/40 overflow-hidden flex-shrink-0">
            {thumbUrl && (
              <Image
                src={thumbUrl}
                alt=""
                width={96}
                height={96}
                className="w-full h-full object-contain p-1"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-heading">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            {typeof rating === 'number' && (
              <p className="text-brand-400 text-lg tracking-wider mt-2">
                {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">av {authorDisplay}</p>
          </div>
        </CardContent>
      </Card>

      {/* WSET tasting notes — render only sections that have content */}
      {wset.appearance && (wset.appearance.clarity || wset.appearance.intensity || wset.appearance.color) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Utseende</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.appearance.clarity && (<><dt className="text-muted-foreground">Klarhet</dt><dd className="col-span-2">{wset.appearance.clarity}</dd></>)}
              {wset.appearance.intensity && (<><dt className="text-muted-foreground">Intensitet</dt><dd className="col-span-2">{wset.appearance.intensity}</dd></>)}
              {wset.appearance.color && (<><dt className="text-muted-foreground">Färg</dt><dd className="col-span-2">{wset.appearance.color}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.nose && (wset.nose.intensity || (wset.nose.primaryAromas?.length ?? 0) > 0) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Doft</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.nose.intensity && (<><dt className="text-muted-foreground">Intensitet</dt><dd className="col-span-2">{wset.nose.intensity}</dd></>)}
              {(wset.nose.primaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Primära</dt><dd className="col-span-2">{wset.nose.primaryAromas.join(', ')}</dd></>)}
              {(wset.nose.secondaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Sekundära</dt><dd className="col-span-2">{wset.nose.secondaryAromas.join(', ')}</dd></>)}
              {(wset.nose.tertiaryAromas?.length ?? 0) > 0 && (<><dt className="text-muted-foreground">Tertiära</dt><dd className="col-span-2">{wset.nose.tertiaryAromas.join(', ')}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.palate && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Smak</h2>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {wset.palate.sweetness && (<><dt className="text-muted-foreground">Sötma</dt><dd className="col-span-2">{wset.palate.sweetness}</dd></>)}
              {wset.palate.acidity && (<><dt className="text-muted-foreground">Syra</dt><dd className="col-span-2">{wset.palate.acidity}</dd></>)}
              {wset.palate.tannin && (<><dt className="text-muted-foreground">Tannin</dt><dd className="col-span-2">{wset.palate.tannin}</dd></>)}
              {wset.palate.alcohol && (<><dt className="text-muted-foreground">Alkohol</dt><dd className="col-span-2">{wset.palate.alcohol}</dd></>)}
              {wset.palate.body && (<><dt className="text-muted-foreground">Fyllighet</dt><dd className="col-span-2">{wset.palate.body}</dd></>)}
              {wset.palate.flavourIntensity && (<><dt className="text-muted-foreground">Smakintensitet</dt><dd className="col-span-2">{wset.palate.flavourIntensity}</dd></>)}
              {wset.palate.finish && (<><dt className="text-muted-foreground">Eftersmak</dt><dd className="col-span-2">{wset.palate.finish}</dd></>)}
            </dl>
          </CardContent>
        </Card>
      )}

      {wset.conclusion && (wset.conclusion.quality || wset.conclusion.summary) && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg mb-2">Slutsats</h2>
            {wset.conclusion.quality && (
              <p className="text-sm"><span className="text-muted-foreground">Kvalitet: </span>{wset.conclusion.quality}</p>
            )}
            {wset.conclusion.summary && (
              <p className="text-sm whitespace-pre-wrap mt-2">{wset.conclusion.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {reviewText && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm whitespace-pre-wrap">{reviewText}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
