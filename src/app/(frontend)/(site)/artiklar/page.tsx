import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { BlogPostCard, BlogFilters } from '@/components/blog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { BlogPost, BlogCategory, BlogTag } from '@/payload-types'
import type { Metadata } from 'next'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'
import { calculateReadingTime, calculateReadingTimeFromExcerpt } from '@/lib/reading-time'

const log = loggerFor('(frontend)-(site)-artiklar-page')

interface PageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    tags?: string | string[]
    page?: string
  }>
}

const POSTS_PER_PAGE = 12

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { search = '', category = '', tags = [], page = '1' } = await searchParams

  const currentPage = Math.max(1, parseInt(page))
  const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : []

  // Generate title and description based on filters
  const pageNumber = currentPage > 1 ? ` - Sida ${currentPage}` : ''
  const searchText = search ? ` för "${search}"` : ''
  const categoryText = category ? ` i kategorin ${category}` : ''
  const tagsText = tagsArray.length > 0 ? ` taggade med ${tagsArray.join(', ')}` : ''

  const title = `Artiklar${searchText}${categoryText}${tagsText}${pageNumber}`
  const description = search
    ? `Sökresultat för "${search}" bland våra artiklar om vin, vinkunskap och vinresor på Vinakademin.`
    : 'Upptäck vinets värld genom våra expertguider, recensioner och utbildningsartiklar på Vinakademin - din guide till vinets värld.'

  // Generate canonical URL
  const baseUrl = getSiteURL()
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  tagsArray.forEach((tag) => params.append('tags', tag))
  if (currentPage > 1) params.set('page', currentPage.toString())

  const canonicalUrl = `${baseUrl}/artiklar${params.toString() ? `?${params.toString()}` : ''}`

  const robotsContent =
    currentPage > 1
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  return {
    title: `${title} | Vinakademin`,
    description: description,
    keywords: `vin, vinakademin, vinkunskap, artiklar, vinartiklar${category ? `, ${category}` : ''}${tagsArray.length > 0 ? `, ${tagsArray.join(', ')}` : ''}`,
    robots: robotsContent,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      title: title,
      description: description,
      url: canonicalUrl,
      siteName: 'Vinakademin',
      locale: 'sv_SE',
    },
    twitter: {
      card: 'summary',
      title: title,
      description: description,
      site: '@vinakademin',
    },
  }
}

async function ArticlesContent({ searchParams }: PageProps) {
  const { search = '', category = '', tags = [], page = '1' } = await searchParams

  const currentPage = Math.max(1, parseInt(page))
  const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : []

  const payload = await getPayload({ config })

  try {
    // Build query filters
    const whereConditions: any[] = [{ _status: { equals: 'published' } }]

    // Add search condition
    if (search) {
      whereConditions.push({
        or: [{ title: { contains: search } }, { excerpt: { contains: search } }],
      })
    }

    // Add category filter
    if (category) {
      const categoryDoc = await payload.find({
        collection: 'blog-categories',
        where: { slug: { equals: category } },
        limit: 1,
      })

      if (categoryDoc.docs.length === 0) {
        notFound()
      }

      whereConditions.push({
        category: { equals: categoryDoc.docs[0].id },
      })
    }

    // Add tags filter
    if (tagsArray.length > 0) {
      const tagDocs = await payload.find({
        collection: 'blog-tags',
        where: { slug: { in: tagsArray } },
      })

      if (tagDocs.docs.length > 0) {
        whereConditions.push({
          tags: { in: tagDocs.docs.map((tag) => tag.id) },
        })
      }
    }

    // Fetch blog posts with pagination
    const postsResult = await payload.find({
      collection: 'blog-posts',
      where: {
        and: whereConditions,
      },
      depth: 2,
      limit: POSTS_PER_PAGE,
      page: currentPage,
      sort: '-publishedDate',
    })

    // Fetch all categories and tags for filters
    const [categoriesResult, tagsResult] = await Promise.all([
      payload.find({
        collection: 'blog-categories',
        limit: 100,
        sort: 'name',
      }),
      payload.find({
        collection: 'blog-tags',
        limit: 100,
        sort: 'name',
      }),
    ])

    const categories = categoriesResult.docs as BlogCategory[]
    const allTags = tagsResult.docs as BlogTag[]
    const blogPosts = postsResult.docs as BlogPost[]
    const totalDocs = postsResult.totalDocs
    const totalPages = postsResult.totalPages

    const hasFilters = !!search || !!category || tagsArray.length > 0
    // Featured hero: only on the unfiltered first page, when there's at least one post
    const showFeatured = !hasFilters && currentPage === 1 && blogPosts.length > 0
    const featured = showFeatured ? blogPosts[0] : null
    const restPosts = showFeatured ? blogPosts.slice(1) : blogPosts

    const buildPageHref = (pageNum: number) => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      tagsArray.forEach((tag) => params.append('tags', tag))
      if (pageNum > 1) params.set('page', String(pageNum))
      const qs = params.toString()
      return `/artiklar${qs ? `?${qs}` : ''}`
    }

    return (
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
            Vinakademin · Magasin
          </span>
          <h1 className="mb-4 text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            Artiklar
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Upptäck allt om vin genom våra expertguider, recensioner och utbildningsartiklar.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <BlogFilters
            categories={categories}
            tags={allTags}
            selectedCategory={category}
            selectedTags={tagsArray}
            searchQuery={search}
          />
        </div>

        {/* Results Summary */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {totalDocs === 0 ? (
              hasFilters ? (
                'Inga artiklar matchar dina filter'
              ) : (
                'Inga artiklar hittades'
              )
            ) : (
              <>
                Visar {(currentPage - 1) * POSTS_PER_PAGE + 1}–
                {Math.min(currentPage * POSTS_PER_PAGE, totalDocs)} av {totalDocs} artiklar
                {hasFilters && ' (filtrerade)'}
              </>
            )}
          </div>
        </div>

        {/* Featured hero (unfiltered page 1 only) */}
        {featured ? <FeaturedArticleHero post={featured} /> : null}

        {/* Posts grid */}
        {restPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
            ))}
          </div>
        ) : !featured ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-6 py-12 text-center">
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {hasFilters ? 'Inga artiklar matchar dina filter' : 'Inga artiklar än'}
            </h3>
            <p className="text-muted-foreground">
              {hasFilters
                ? 'Prova att justera dina filter eller söka efter något annat.'
                : 'Nya artiklar kommer snart!'}
            </p>
          </div>
        ) : null}

        {/* Pagination — Föregående / Sida X av Y / Nästa */}
        {totalPages > 1 ? (
          <div className="mt-12 flex items-center justify-center gap-3">
            {currentPage > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(currentPage - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Föregående
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Föregående
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              Sida <span className="font-semibold text-brand-400">{currentPage}</span> av {totalPages}
            </div>
            {currentPage < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildPageHref(currentPage + 1)}>
                  Nästa
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Nästa
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    )
  } catch (error) {
    log.error('Error fetching blog posts:', error)
    notFound()
  }
}

function FeaturedArticleHero({ post }: { post: BlogPost }) {
  const readingTime = post.content
    ? calculateReadingTime(post.content)
    : calculateReadingTimeFromExcerpt(post.excerpt || '')

  const author = post.author && typeof post.author === 'object' ? post.author : null
  const authorName = author
    ? `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email || 'Okänd'
    : 'Okänd'
  const authorAvatar: string | undefined =
    author?.avatar && typeof author.avatar === 'object' ? author.avatar.url || undefined : undefined
  const authorInitials = authorName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const featuredImage =
    post.featuredImage && typeof post.featuredImage === 'object' ? post.featuredImage : null
  const categoryName =
    post.category && typeof post.category === 'object' ? post.category.name : null

  return (
    <Link
      href={`/artiklar/${post.slug}`}
      className="group mb-10 block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-brand-400/40 hover:shadow-xl hover:shadow-brand-400/5"
    >
      <div className="grid gap-0 md:grid-cols-5">
        {/* Image — wider half */}
        <div className="relative aspect-[16/10] md:aspect-auto md:col-span-3 overflow-hidden bg-muted">
          {featuredImage?.url ? (
            <Image
              src={featuredImage.url}
              alt={featuredImage.alt || post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 60vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-300/20 via-muted to-muted" />
          )}
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400 shadow-sm backdrop-blur-sm">
            ✦ Senast publicerat
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between gap-6 p-6 md:col-span-2 md:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {categoryName ? (
                <Badge
                  variant="outline"
                  className="border-brand-300/40 bg-brand-300/10 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-brand-400"
                >
                  {categoryName}
                </Badge>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {readingTime.text}
              </span>
            </div>
            <h2 className="text-2xl font-medium leading-tight tracking-tight text-foreground transition-colors group-hover:text-brand-400 md:text-3xl">
              {post.title}
            </h2>
            {post.excerpt ? (
              <p className="text-base leading-relaxed text-muted-foreground line-clamp-4">
                {post.excerpt}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="bg-brand-300/15 text-xs font-semibold text-brand-400">
                  {authorInitials || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-xs">
                <div className="truncate font-medium text-foreground">{authorName}</div>
                {post.publishedDate ? (
                  <time
                    dateTime={post.publishedDate}
                    className="block text-muted-foreground"
                  >
                    {new Date(post.publishedDate).toLocaleDateString('sv-SE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                ) : null}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-400 transition-transform group-hover:translate-x-0.5">
              Läs artikeln
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ArticlesSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96" />
      </div>

      <div className="mb-8">
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BlogPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<ArticlesSkeleton />}>
      <ArticlesContent searchParams={searchParams} />
    </Suspense>
  )
}
