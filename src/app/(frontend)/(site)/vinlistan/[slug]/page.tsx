import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { BlogPostCard } from '@/components/blog'

type PageProps = {
  params: Promise<{ slug: string }>
}

async function fetchWineBySlug(slug: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'wines',
    where: {
      or: [{ slug: { equals: slug } }, { id: { equals: slug } }],
    },
    depth: 2 as any,
    limit: 1,
  } as any)
  const wine = res.docs?.[0]
  if (!wine) return null

  // Load a trusted review if exists for rating display
  const reviews = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }, { wine: { equals: wine.id } }],
    },
    depth: 1 as any,
    limit: 1,
    sort: '-rating',
    overrideAccess: false,
  } as any)
  const review = reviews.docs?.[0] || null
  return { wine, review }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchWineBySlug(slug)
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  if (!data) {
    return {
      title: `Vin | Vinakademin`,
      description: 'Vin i Vinlistan på Vinakademin',
      robots: 'noindex, follow',
      alternates: { canonical: `${baseUrl}/vinlistan/${slug}` },
    }
  }
  const { wine } = data as any
  const title = `${wine.name}${wine.vintage ? ` · ${wine.vintage}` : ''} | Vinakademin`
  const description = `${wine.winery || ''}${wine.region?.name ? ` · ${wine.region.name}` : ''}$${
    wine.country?.name ? `, ${wine.country.name}` : ''
  }`.replace(/\$+/g, '')
  const canonicalUrl = `${baseUrl}/vinlistan/${wine.slug || wine.id}`
  return {
    title,
    description,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonicalUrl,
      siteName: 'Vinakademin',
      locale: 'sv_SE',
      images: wine.image?.url ? [{ url: wine.image.url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params
  const data = await fetchWineBySlug(slug)
  if (!data) return notFound()
  const { wine, review } = data as any

  const payload = await getPayload({ config })

  // Fetch only:
  // - Vinakademins verifierade (trusted) recensioner
  // - Den inloggade användarens egna recensioner
  const headersList = await headers()
  const cookieString = headersList.get('cookie') || ''
  const { user } = await payload.auth({
    headers: new Headers({
      Cookie: cookieString,
    }),
  })

  const trustedReviewsRes = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ isTrusted: { equals: true } }, { wine: { equals: wine.id } }],
    },
    sort: '-createdAt',
    depth: 1 as any,
    limit: 10,
    overrideAccess: false,
    req: {
      headers: new Headers({
        Cookie: cookieString,
      }),
      user,
      payload,
    } as any,
  } as any)

  const myReviewsRes = user?.id
    ? await payload.find({
        collection: 'reviews',
        where: {
          and: [{ wine: { equals: wine.id } }, { user: { equals: Number(user.id) } }],
        },
        sort: '-createdAt',
        depth: 1 as any,
        limit: 10,
        overrideAccess: false,
        req: {
          headers: new Headers({
            Cookie: cookieString,
          }),
          user,
          payload,
        } as any,
      } as any)
    : { docs: [] }

  const visibleReviewsRaw = [
    ...(trustedReviewsRes.docs || []),
    ...((myReviewsRes as any).docs || []),
  ]
  const seen = new Set<string>()
  const visibleReviews = visibleReviewsRaw
    .filter((r: any) => {
      const id = String(r?.id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice()
    .sort((a: any, b: any) => {
      const ta = a.isTrusted ? 1 : 0
      const tb = b.isTrusted ? 1 : 0
      if (tb - ta !== 0) return tb - ta
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

  // Fetch related wines by region or grapes
  const grapeIds: number[] = Array.isArray(wine.grapes)
    ? (wine.grapes as any[])
        .map((g: any) => (typeof g === 'object' ? Number(g.id) : Number(g)))
        .filter(Boolean)
    : []
  const relatedRes = await payload.find({
    collection: 'wines',
    where: {
      and: [
        { id: { not_equals: wine.id } },
        {
          or: [
            ...(wine.region?.id ? [{ region: { equals: wine.region.id } }] : []),
            ...(grapeIds.length > 0 ? [{ grapes: { in: grapeIds } }] : []),
          ],
        },
      ],
    },
    depth: 1 as any,
    limit: 8,
  } as any)
  const relatedWines = relatedRes.docs || []

  // Fetch blog posts where this wine is referenced in content blocks
  const postsRes = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    depth: 2 as any,
    limit: 100,
  } as any)
  const blogPostsAll = postsRes.docs || []
  const wineIdStr = String(wine.id)
  const wineSlugStr = String(wine.slug || '')
  const referencesWine = (content: any): boolean => {
    if (!content || typeof content !== 'object') return false
    const stack: any[] = [content]

    const getRelId = (w: any): string | null => {
      if (!w) return null
      if (typeof w === 'string' || typeof w === 'number') return String(w)
      // Payload relationship shapes
      if (typeof w === 'object') {
        if (w.id) return String(w.id)
        if (w.value) return String(typeof w.value === 'object' ? (w.value.id ?? w.value) : w.value)
        if (w.doc && w.doc.id) return String(w.doc.id)
      }
      return null
    }

    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue

      // Detect wine-reference blocks in various shapes
      const blockType =
        node.blockType || node.blockName || node?.fields?.blockType || node?.fields?.blockName
      const isWineBlock = blockType === 'wine-reference' || blockType === 'WineReference'
      if (
        isWineBlock ||
        node.type === 'wine-reference' ||
        (node.type === 'block' && node.fields?.blockType === 'wine-reference')
      ) {
        const wRaw =
          node.fields?.wine ?? node.wine ?? node.fields?.data?.wine ?? node.fields?.fields?.wine
        const wid = getRelId(wRaw)
        if (wid && wid === wineIdStr) return true
        // Also compare by slug when full doc is embedded
        if (wRaw && typeof wRaw === 'object') {
          const wslug = String((wRaw as any).slug || '')
          if (wslug && wslug === wineSlugStr) return true
        }
      }

      // Detect link nodes pointing to this wine
      const url: string | undefined =
        (node.url || node.href || node?.fields?.url) &&
        String(node.url || node.href || node?.fields?.url)
      if (
        url &&
        (url.includes(`/vinlistan/${wineSlugStr}`) || url.includes(`/vinlistan/${wineIdStr}`))
      ) {
        return true
      }

      // Detect internal link nodes with doc relation to wines
      const doc = (node as any).doc || (node as any)?.fields?.doc
      if (doc && (doc.relationTo === 'wines' || doc.relationTo === 'wine')) {
        const docVal = doc.value || doc.id
        const wid = getRelId(docVal)
        if (wid && wid === wineIdStr) return true
      }

      for (const key of Object.keys(node)) {
        const val = (node as any)[key]
        if (val && typeof val === 'object') stack.push(val)
        if (Array.isArray(val)) val.forEach((v) => stack.push(v))
      }
    }
    // Fallback: string search in serialized content
    try {
      const json = JSON.stringify(content)
      if (
        json.includes(`/vinlistan/${wineSlugStr}`) ||
        json.includes(`/vinlistan/${wineIdStr}`) ||
        (json.includes('"wine"') && json.includes(`"${wineIdStr}"`))
      ) {
        return true
      }
    } catch {}
    return false
  }
  const blogPosts = blogPostsAll.filter((p: any) => referencesWine(p.content))

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(price)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/vinlistan" className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till Vinlistan
        </Link>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-2xl font-semibold break-words">
              {wine.name} {wine.vintage ? `· ${wine.vintage}` : ''}
            </CardTitle>
            {Number(wine.price) ? (
              <div className="text-base sm:text-lg font-semibold text-primary">
                {formatPrice(Number(wine.price))}
              </div>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            {wine.winery}
            {wine.region?.name ? ` · ${wine.region.name}` : ''}
            {wine.country?.name ? `, ${wine.country.name}` : ''}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative h-56 w-28 sm:h-72 sm:w-40 mx-auto sm:mx-0 rounded-md overflow-hidden bg-transparent">
              {wine.image?.url ? (
                <Image src={wine.image.url} alt={wine.name} fill className="object-contain" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-3">
                    <div className="text-sm">Druvor</div>
                    <div className="text-sm text-muted-foreground">
                      {Array.isArray(wine.grapes)
                        ? (wine.grapes as any[])
                            .map((g: any) => (typeof g === 'object' ? g.name : g))
                            .join(', ')
                        : '—'}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm">Alkohol</div>
                    <div className="text-sm text-muted-foreground">
                      {wine.alcohol ? `${wine.alcohol}%` : '—'}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-sm">Betyg</div>
                    <div className="text-sm text-muted-foreground">{review?.rating ?? '—'}/5</div>
                  </div>
                  {review ? (
                    <div className="mt-4">
                      <Badge variant="secondary">Verifierad</Badge>
                    </div>
                  ) : null}
                </div>
                {wine.description?.root ? (
                  <div>
                    <div className="text-sm font-medium mb-1">Beskrivning</div>
                    <div className="prose prose-sm dark:prose-invert">
                      <RichTextRenderer content={wine.description} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {/* Description moved into right column on desktop */}
          {wine.systembolagetUrl && wine.systembolagetUrl.trim() ? (
            <div className="mt-3">
              <a
                href={
                  wine.systembolagetUrl.startsWith('http')
                    ? wine.systembolagetUrl
                    : `https://${wine.systembolagetUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Länk till Systembolaget
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Reviews */}
      <div className="mt-8">
        <h2 className="text-xl font-medium mb-4">Recensioner</h2>
        {visibleReviews.length === 0 ? (
          <div className="text-sm text-muted-foreground">Inga recensioner ännu.</div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {visibleReviews.map((r: any) => {
              const wset = r.wsetTasting || {}
              const appearance = wset.appearance || {}
              const nose = wset.nose || {}
              const palate = wset.palate || {}
              const conclusion = wset.conclusion || {}
              const reviewer = r.user && typeof r.user === 'object' ? r.user : null
              const isOwn = Boolean(user?.id && reviewer?.id && String(reviewer.id) === String(user.id))
              const reviewerName = r.isTrusted
                ? 'Vinakademin'
                : isOwn
                  ? 'Du'
                  : reviewer
                    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') ||
                      reviewer.email ||
                      'Okänd'
                    : 'Okänd'
              return (
                <AccordionItem key={r.id} value={String(r.id)}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      {r.isTrusted ? <Badge variant="secondary">Verifierad</Badge> : null}
                      {isOwn && !r.isTrusted ? <Badge variant="outline">Du</Badge> : null}
                      <span className="font-medium">{reviewerName}</span>
                      <span className="text-muted-foreground">• {r.rating ?? '—'}/5</span>
                      <span className="text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('sv-SE') : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md border p-4 text-sm">
                      {/* Section: Utseende */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Utseende
                        </div>
                        <div className="divide-y">
                          {[
                            ['Klarhet', appearance.clarity],
                            ['Intensitet', appearance.intensity],
                            ['Färg', appearance.color],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Doft */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Doft
                        </div>
                        <div className="divide-y">
                          {[
                            ['Intensitet', nose.intensity],
                            ['Primära aromer', (nose.primaryAromas || []).join(', ')],
                            ['Sekundära aromer', (nose.secondaryAromas || []).join(', ')],
                            ['Tertiära aromer', (nose.tertiaryAromas || []).join(', ')],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Smak */}
                      <div className="rounded-md border mb-3">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Smak
                        </div>
                        <div className="divide-y">
                          {[
                            ['Sötma', palate.sweetness],
                            ['Syra', palate.acidity],
                            ['Tannin', palate.tannin],
                            ['Alkohol', palate.alcohol],
                            ['Fyllighet', palate.body],
                            ['Smakintensitet', palate.flavourIntensity],
                            ['Primära smaker', (palate.primaryFlavours || []).join(', ')],
                            ['Sekundära smaker', (palate.secondaryFlavours || []).join(', ')],
                            ['Tertiära smaker', (palate.tertiaryFlavours || []).join(', ')],
                            ['Eftersmak', palate.finish],
                          ].map(([label, val]) => (
                            <div
                              key={String(label)}
                              className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3 even:bg-muted/40"
                            >
                              <div className="text-sm font-medium text-muted-foreground">
                                {label}
                              </div>
                              <div className="md:col-span-2 text-sm">{val || '—'}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section: Slutsats */}
                      <div className="rounded-md border">
                        <div className="bg-secondary text-secondary-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
                          Slutsats
                        </div>
                        <div className="divide-y">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                            <div className="text-sm font-medium text-muted-foreground">
                              Kvalitet
                            </div>
                            <div className="md:col-span-2 text-sm">{conclusion.quality || '—'}</div>
                          </div>
                          {r.reviewText?.root ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                              <div className="text-sm font-medium text-muted-foreground">
                                Noteringar
                              </div>
                              <div className="md:col-span-2 text-sm">
                                <RichTextRenderer content={r.reviewText} />
                              </div>
                            </div>
                          ) : null}
                          {conclusion.summary ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 md:px-4 md:py-3">
                              <div className="text-sm font-medium text-muted-foreground">
                                Sammanfattning
                              </div>
                              <div className="md:col-span-2 text-sm whitespace-pre-wrap">
                                {conclusion.summary}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>

      {/* Blog posts referencing this wine */}
      {blogPosts.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-xl font-medium mb-4">Artiklar där vinet nämns</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post: any) => (
              <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
