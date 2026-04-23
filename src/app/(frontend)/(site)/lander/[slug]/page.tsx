import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import Link from 'next/link'
import Image from 'next/image'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { Card, CardContent } from '@/components/ui/card'
import { Globe, MapPin, Wine as WineIcon, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'
import { getSiteURL } from '@/lib/site-url'

type PageProps = {
  params: Promise<{ slug: string }>
}

async function fetchCountryBySlug(slug: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'countries',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
  })
  return res.docs?.[0] || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const country = await fetchCountryBySlug(slug)
  const baseUrl = getSiteURL()

  if (!country) {
    return {
      title: 'Land | Vinakademin',
      description: 'Vinland på Vinakademin',
    }
  }

  const title = `${country.name} | Vinakademin`
  const description = `Utforska viner och vinregioner från ${country.name}. Lär dig om landets vintraditioner och druvor.`
  const canonicalUrl = `${baseUrl}/lander/${slug}`

  return {
    title,
    description,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonicalUrl,
      siteName: 'Vinakademin',
      locale: 'sv_SE',
    },
  }
}

export default async function CountryDetailPage({ params }: PageProps) {
  const { slug } = await params
  const country = await fetchCountryBySlug(slug)
  if (!country) return notFound()

  const payload = await getPayload({ config })

  // Fetch regions in this country
  const regionsRes = await payload.find({
    collection: 'regions',
    where: { country: { equals: country.id } },
    depth: 0,
    limit: 100,
    sort: 'name',
  })
  const regions = regionsRes.docs || []

  // Fetch wines from this country
  const winesRes = await payload.find({
    collection: 'wines',
    where: { country: { equals: country.id } },
    depth: 1,
    limit: 100,
    sort: 'name',
  })
  const wines = winesRes.docs || []

  // Fetch published blog posts (check for country references)
  const postsRes = await payload.find({
    collection: 'blog-posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedDate',
    depth: 2 as any,
    limit: 100,
  } as any)
  const countryIdStr = String(country.id)
  const blogPosts = (postsRes.docs || []).filter((p: any) => {
    const json = JSON.stringify(p.content || {})
    return json.includes(countryIdStr) && json.includes('country-reference')
  })

  // Fetch vinprovningar that reference this country
  const vinRes = await payload.find({
    collection: 'vinprovningar',
    where: { _status: { equals: 'published' } },
    depth: 2 as any,
    limit: 100,
  } as any)
  const vinprovningar = (vinRes.docs || []).filter((v: any) => {
    const json = JSON.stringify(v.fullDescription || {})
    return json.includes(countryIdStr)
  })

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(price)

  const siteURL = getSiteURL()
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Hem', url: `${siteURL}/` },
          { name: 'Vinländer', url: `${siteURL}/lander` },
          { name: (country as any).name, url: `${siteURL}/lander/${(country as any).slug}` },
        ]}
      />
      <div className="mb-6">
        <Link href="/lander" className="text-sm text-muted-foreground hover:underline">
          ← Alla länder
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
            <Globe className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold">{country.name}</h1>
        </div>
      </header>

      {/* Description */}
      {country.description && typeof country.description === 'object' && (country.description as any).root && (
        <div className="mb-10">
          <RichTextRenderer content={country.description} />
        </div>
      )}

      {/* Regions in this country */}
      {regions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            Regioner i {country.name}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((region: any) => (
              <Link
                key={region.id}
                href={`/regioner/${region.slug}`}
                className="flex items-center gap-2 p-3 rounded-lg border border-border/50 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
              >
                <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="font-medium">{region.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Wines from this country */}
      {wines.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <WineIcon className="h-5 w-5 text-orange-500" />
            Viner från {country.name}
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
                      {wine.region && typeof wine.region === 'object' && (
                        <Link
                          href={`/regioner/${wine.region.slug}`}
                          className="text-xs text-muted-foreground hover:text-orange-500 transition-colors"
                        >
                          {wine.region.name}
                        </Link>
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
