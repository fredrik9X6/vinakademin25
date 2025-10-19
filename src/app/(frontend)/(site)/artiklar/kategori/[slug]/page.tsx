import { Suspense } from 'react'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { BlogPostCard, BlogFilters } from '@/components/blog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { BlogPost, BlogCategory, BlogTag } from '@/payload-types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    search?: string
    tags?: string | string[]
    page?: string
  }>
}

const POSTS_PER_PAGE = 12

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { search = '', tags = [], page = '1' } = await searchParams

  const payload = await getPayload({ config })

  try {
    // Find the category first
    const categoryResult = await payload.find({
      collection: 'blog-categories',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (!categoryResult.docs || categoryResult.docs.length === 0) {
      return {
        title: 'Kategori inte hittad | Vinakademin',
        description: 'Den begärda kategorin kunde inte hittas.',
      }
    }

    const category = categoryResult.docs[0] as BlogCategory
    const currentPage = Math.max(1, parseInt(page))
    const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : []

    // Generate title and description
    const pageNumber = currentPage > 1 ? ` - Sida ${currentPage}` : ''
    const searchText = search ? ` för "${search}"` : ''
    const tagsText = tagsArray.length > 0 ? ` taggade med ${tagsArray.join(', ')}` : ''

    const title = `${category.name} - Artiklar${searchText}${tagsText}${pageNumber}`
    const description = category.description
      ? `${category.description} Läs alla artiklar inom kategorin ${category.name} på Vinakademin.`
      : `Alla artiklar inom kategorin ${category.name} på Vinakademin - din guide till vinets värld.`

    // Generate canonical URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    tagsArray.forEach((tag) => params.append('tags', tag))
    if (currentPage > 1) params.set('page', currentPage.toString())

    const canonicalUrl = `${baseUrl}/artiklar/kategori/${slug}${params.toString() ? `?${params.toString()}` : ''}`

    const robotsContent =
      currentPage > 1
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

    return {
      title: `${title} | Vinakademin`,
      description: description,
      keywords: `vin, vinakademin, vinkunskap, artiklar, ${category.name}${tagsArray.length > 0 ? `, ${tagsArray.join(', ')}` : ''}`,
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
  } catch (error) {
    console.error('Error generating metadata for category page:', error)
    return {
      title: 'Kategori | Vinakademin',
      description: 'Vinakademin - din guide till vinets värld.',
    }
  }
}

async function CategoryContent({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { search = '', tags = [], page = '1' } = await searchParams

  const currentPage = Math.max(1, parseInt(page))
  const tagsArray = Array.isArray(tags) ? tags : tags ? [tags] : []

  const payload = await getPayload({ config })

  try {
    // Find the category first
    const categoryResult = await payload.find({
      collection: 'blog-categories',
      where: { slug: { equals: slug } },
      limit: 1,
    })

    if (!categoryResult.docs || categoryResult.docs.length === 0) {
      notFound()
    }

    const category = categoryResult.docs[0] as BlogCategory

    // Build where conditions
    const whereConditions: any[] = [
      { _status: { equals: 'published' } },
      { category: { equals: category.id } },
    ]

    // Add search condition
    if (search) {
      whereConditions.push({
        or: [{ title: { contains: search } }, { excerpt: { contains: search } }],
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

    // Fetch blog posts
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

    // Fetch all tags for filters
    const tagsResult = await payload.find({
      collection: 'blog-tags',
      limit: 100,
      sort: 'name',
    })

    const blogPosts = postsResult.docs as BlogPost[]
    const allTags = tagsResult.docs as BlogTag[]
    const totalDocs = postsResult.totalDocs
    const totalPages = postsResult.totalPages

    const hasFilters = search || tagsArray.length > 0

    // Get category color class
    const getCategoryColorClass = (categoryColor?: string | null) => {
      switch (categoryColor) {
        case 'red':
          return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        case 'blue':
          return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        case 'green':
          return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        case 'purple':
          return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
        case 'yellow':
          return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
        case 'pink':
          return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
        default:
          return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      }
    }

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back to blog link */}
        <div className="mb-6">
          <Link
            href="/artiklar"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till artiklar
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Badge
              variant="secondary"
              className={`text-sm px-3 py-1 ${getCategoryColorClass(category.color)}`}
            >
              {category.name}
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-medium mb-4 text-foreground">{category.name}</h1>

          {category.description && (
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {category.description}
            </p>
          )}
        </div>

        {/* Filters (without category filter since we're already in a category) */}
        <div className="mb-8">
          <BlogFilters
            categories={[]} // Don't show category filter on category page
            tags={allTags}
            selectedCategory={slug}
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
                `Inga artiklar i kategorin "${category.name}"`
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

        {/* Blog Posts Grid */}
        {blogPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {hasFilters
                ? 'Inga artiklar matchar dina filter'
                : `Inga artiklar i kategorin "${category.name}" än`}
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
              tagsArray.forEach((tag) => params.append('tags', tag))
              if (pageNum > 1) params.set('page', pageNum.toString())

              return (
                <a
                  key={pageNum}
                  href={`/artiklar/kategori/${slug}?${params.toString()}`}
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
    console.error('Error fetching category posts:', error)
    notFound()
  }
}

function CategorySkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-6 w-40" />
      </div>

      <div className="mb-8 text-center">
        <Skeleton className="h-8 w-32 mx-auto mb-4" />
        <Skeleton className="h-10 w-64 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto" />
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

export default function CategoryPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
