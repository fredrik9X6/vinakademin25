import { Suspense } from 'react'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { BlogPostCard, BlogFilters } from '@/components/blog'
import { Skeleton } from '@/components/ui/skeleton'
import type { BlogPost, BlogCategory, BlogTag } from '@/payload-types'
import type { Metadata } from 'next'

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
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
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

    const hasFilters = search || category || tagsArray.length > 0

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">Artiklar</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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
          <div className="text-sm text-gray-600 dark:text-gray-400">
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

        {/* Blog Posts Grid - All cards with consistent sizing */}
        {blogPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {hasFilters ? 'Inga artiklar matchar dina filter' : 'Inga artiklar än'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {hasFilters
                ? 'Prova att justera dina filter eller söka efter något annat.'
                : 'Nya artiklar kommer snart!'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1
              const isActive = pageNum === currentPage

              const params = new URLSearchParams()
              if (search) params.set('search', search)
              if (category) params.set('category', category)
              tagsArray.forEach((tag) => params.append('tags', tag))
              if (pageNum > 1) params.set('page', pageNum.toString())

              return (
                <a
                  key={pageNum}
                  href={`/artiklar?${params.toString()}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </a>
              )
            })}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    notFound()
  }
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
