import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import Link from 'next/link'
import Image from 'next/image'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Wine as WineIcon, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getSiteURL } from '@/lib/site-url'
import { resolveSeo } from '@/lib/seo'

type PageProps = {
  params: Promise<{ slug: string }>
}

async function fetchRegionBySlug(slug: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'regions',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  })
  return res.docs?.[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const region = await fetchRegionBySlug(slug)
  const baseUrl = getSiteURL()

  if (!region) {
    return {
      title: 'Region | Vinakademin',
      description: 'Vinregion på Vinakademin',
    }
  }

  const country = typeof region.country === 'object' ? region.country : null
  const fallbackTitle = `${region.name}${country ? `, ${country.name}` : ''} | Vinakademin`
  const fallbackDescription = `Utforska viner från ${region.name}${country ? ` i ${country.name}` : ''}. Lär dig om regionens terroir och druvor.`
  const canonicalUrl = `${baseUrl}/regioner/${slug}`
  const seo = resolveSeo(region as any, {
    title: fallbackTitle,
    description: fallbackDescription,
  })

  return {
    title: seo.title,
    description: seo.description,
    robots: seo.noindex
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: 'Vinakademin',
      locale: 'sv_SE',
      ...(seo.imageUrl && { images: [{ url: seo.imageUrl }] }),
    },
  }
}

export default async function RegionDetailPage({ params }: PageProps) {
  const { slug } = await params
  const region = await fetchRegionBySlug(slug)
  if (!region) return notFound()

  const payload = await getPayload({ config })
  const country = typeof region.country === 'object' ? region.country : null

  // Fetch wines from this region
  const winesRes = await payload.find({
    collection: 'wines',
    where: { region: { equals: region.id } },
    depth: 1,
    limit: 100,
    sort: 'name',
  })
  const wines = winesRes.docs || []

  // Fetch published blog posts (check for region references)
  const postsRes = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    depth: 2 as any,
    limit: 100,
  } as any)
  const regionIdStr = String(region.id)
  const blogPosts = (postsRes.docs || []).filter((p: any) => {
    const json = JSON.stringify(p.content || {})
    return json.includes(regionIdStr) && json.includes('region-reference')
  })

  // Fetch vinprovningar that reference this region
  const vinRes = await payload.find({
    collection: 'vinprovningar',
    where: { _status: { equals: 'published' } },
    depth: 2 as any,
    limit: 100,
  } as any)
  const vinprovningar = (vinRes.docs || []).filter((v: any) => {
    const json = JSON.stringify(v.fullDescription || {})
    return json.includes(regionIdStr)
  })

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(price)

  const siteURL = getSiteURL()
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: `${siteURL}/` },
          { name: 'Vinregioner', url: `${siteURL}/regioner` },
          { name: (region as any).name, url: `${siteURL}/regioner/${(region as any).slug}` },
        ]}
      />
      <div className="mb-6">
        <Link href="/regioner" className="text-sm text-muted-foreground hover:underline">
          ← Alla regioner
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
            <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{region.name}</h1>
            {country && (
              <Link
                href={`/lander/${country.slug}`}
                className="text-muted-foreground hover:text-orange-500 transition-colors"
              >
                {country.name}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Description */}
      {region.description && typeof region.description === 'object' && region.description.root && (
        <div className="mb-10">
          <RichTextRenderer content={region.description} />
        </div>
      )}

      {/* Wines from this region */}
      {wines.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <WineIcon className="h-5 w-5 text-orange-500" />
            Viner från {region.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wines.map((wine: any) => {
              const wineImage = wine.image && typeof wine.image === 'object' ? wine.image : null
              const href = wine.systembolagetUrl || `/vinlistan/${wine.slug}`
              const isExternal = !!wine.systembolagetUrl

              return (
                <Card key={wine.id} className="group hover:border-orange-300 dark:hover:border-orange-700 transition-all">
                  <CardContent className="p-0">
                    {wineImage?.url && (
                      <div className="relative h-40 bg-muted/30">
                        <Image
                          src={wineImage.url}
                          alt={wine.name}
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2"
                        >
                          {wine.name}
                          <ExternalLink className="inline h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2"
                        >
                          {wine.name}
                        </Link>
                      )}
                      {wine.winery && (
                        <p className="text-sm text-muted-foreground mt-1">{wine.winery}</p>
                      )}
                      {wine.price && (
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-2">
                          {formatPrice(wine.price)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Related vinprovningar */}
      {vinprovningar.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Vinprovningar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {vinprovningar.map((v: any) => (
              <Link
                key={v.id}
                href={`/vinprovningar/${v.slug}`}
                className="block p-4 rounded-lg border border-border/50 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
              >
                <h3 className="font-semibold">{v.title}</h3>
                {v.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related blog posts */}
      {blogPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Artiklar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {blogPosts.map((post: any) => (
              <Link
                key={post.id}
                href={`/artiklar/${post.slug}`}
                className="block p-4 rounded-lg border border-border/50 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
              >
                <h3 className="font-semibold">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
