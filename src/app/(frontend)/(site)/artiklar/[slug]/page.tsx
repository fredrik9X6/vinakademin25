import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import config from '@/payload.config'
import { RefreshRouteOnSave } from '@/components/RefreshRouteOnSave'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RelatedArticles } from '@/components/blog'
import { Clock } from 'lucide-react'
import { calculateReadingTime } from '@/lib/reading-time'
import type { BlogPost, BlogTag } from '@/payload-types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    preview?: string
  }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const { isEnabled: isDraftMode } = await draftMode()

  // Check if we're in preview/draft mode
  const isPreview = isDraftMode && preview === 'true'

  const payload = await getPayload({ config })

  try {
    // Fetch the blog post by slug
    const result = await payload.find({
      collection: 'blog-posts',
      where: {
        slug: { equals: slug },
      },
      depth: 2,
      draft: isPreview,
      limit: 1,
    })

    if (!result.docs || result.docs.length === 0) {
      return {
        title: 'Artikel inte hittad | Vinakademin',
        description: 'Den begärda artikeln kunde inte hittas.',
      }
    }

    const post = result.docs[0] as BlogPost

    // Get author info safely
    const getAuthorName = () => {
      if (post.author && typeof post.author === 'object') {
        const firstName = post.author.firstName || ''
        const lastName = post.author.lastName || ''
        return `${firstName} ${lastName}`.trim()
      }
      return 'Vinakademin'
    }

    // Get featured image info
    const getFeaturedImage = () => {
      if (post.featuredImage && typeof post.featuredImage === 'object' && post.featuredImage.url) {
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        return {
          url: post.featuredImage.url.startsWith('http')
            ? post.featuredImage.url
            : `${baseUrl}${post.featuredImage.url}`,
          alt: post.featuredImage.alt || post.title,
          width: post.featuredImage.width || 1200,
          height: post.featuredImage.height || 630,
        }
      }
      return null
    }

    // Get category name
    const getCategoryName = () => {
      if (post.category && typeof post.category === 'object') {
        return post.category.name
      }
      return 'Artiklar'
    }

    // Get tags
    const getTags = () => {
      if (post.tags && Array.isArray(post.tags)) {
        return post.tags
          .filter((tag): tag is BlogTag => typeof tag === 'object' && tag !== null && 'name' in tag)
          .map((tag) => tag.name)
      }
      return []
    }

    const authorName = getAuthorName()
    const featuredImage = getFeaturedImage()
    const categoryName = getCategoryName()
    const tags = getTags()
    const publishedDate = post.publishedDate
      ? new Date(post.publishedDate).toISOString()
      : new Date().toISOString()

    // SEO title and description
    const seoTitle = post.seoTitle || post.title
    const seoDescription =
      post.seoDescription ||
      post.excerpt ||
      `Läs mer om ${post.title} på Vinakademin - din guide till vinets värld.`

    // Generate canonical URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const canonicalUrl = `${baseUrl}/artiklar/${post.slug}`

    return {
      title: `${seoTitle} | Vinakademin`,
      description: seoDescription,
      keywords: [...tags, 'vin', 'vinakademin', 'vinkunskap', categoryName.toLowerCase()].join(
        ', ',
      ),
      authors: [{ name: authorName }],
      creator: authorName,
      publisher: 'Vinakademin',
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: 'article',
        title: seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        siteName: 'Vinakademin',
        locale: 'sv_SE',
        publishedTime: publishedDate,
        authors: [authorName],
        section: categoryName,
        tags: tags,
        images: featuredImage
          ? [
              {
                url: featuredImage.url,
                width: featuredImage.width,
                height: featuredImage.height,
                alt: featuredImage.alt,
              },
            ]
          : [],
      },
      twitter: {
        card: featuredImage ? 'summary_large_image' : 'summary',
        title: seoTitle,
        description: seoDescription,
        creator: '@vinakademin',
        site: '@vinakademin',
        images: featuredImage ? [featuredImage.url] : [],
      },
      other: {
        'article:author': authorName,
        'article:published_time': publishedDate,
        'article:section': categoryName,
        'article:tag': tags.join(', '),
      },
    }
  } catch (error) {
    console.error('Error generating metadata for blog post:', error)
    return {
      title: 'Artikel | Vinakademin',
      description: 'Vinakademin - din guide till vinets värld.',
    }
  }
}

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { preview } = await searchParams
  const { isEnabled: isDraftMode } = await draftMode()

  // Check if we're in preview/draft mode
  const isPreview = isDraftMode && preview === 'true'

  const payload = await getPayload({ config })

  try {
    // Fetch the blog post by slug
    const result = await payload.find({
      collection: 'blog-posts',
      where: {
        slug: { equals: slug },
      },
      depth: 2,
      draft: isPreview, // Include drafts if in preview mode
      limit: 1,
    })

    if (!result.docs || result.docs.length === 0) {
      notFound()
    }

    const post = result.docs[0] as BlogPost

    // Get author info safely
    const getAuthorName = () => {
      if (post.author && typeof post.author === 'object') {
        const firstName = post.author.firstName || ''
        const lastName = post.author.lastName || ''
        return `${firstName} ${lastName}`.trim()
      }
      return 'Okänd författare'
    }

    const authorName = getAuthorName()
    const authorInitials = authorName
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()

    // Calculate reading time
    const readingTime = calculateReadingTime(post.content)

    // Generate canonical URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const canonicalUrl = `${baseUrl}/artiklar/${post.slug}`

    return (
      <>
        {/* PayloadCMS 3 native live preview component */}
        <RefreshRouteOnSave />

        <article className="max-w-4xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-medium mb-6 leading-tight">{post.title}</h1>

            {post.excerpt && (
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Substack-style author section */}
            <div className="flex items-center gap-3 pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
              <Avatar className="h-12 w-12">
                {post.author &&
                typeof post.author === 'object' &&
                post.author.avatar &&
                typeof post.author.avatar === 'object' &&
                post.author.avatar.url ? (
                  <AvatarImage src={post.author.avatar.url} alt={authorName} />
                ) : null}
                <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 font-semibold">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{authorName}</span>
                  {post.publishedDate && (
                    <>
                      <span>•</span>
                      <time
                        dateTime={post.publishedDate}
                        className="text-gray-500 dark:text-gray-400"
                      >
                        {new Date(post.publishedDate).toLocaleDateString('sv-SE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    </>
                  )}
                  {readingTime && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{readingTime.text}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Category badge */}
                {post.category && typeof post.category === 'object' && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded">
                      {post.category.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Featured image */}
          {post.featuredImage &&
            typeof post.featuredImage === 'object' &&
            post.featuredImage.url && (
              <div className="mb-8">
                <img
                  src={post.featuredImage.url}
                  alt={post.featuredImage.alt || ''}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </div>
            )}

          {/* Render rich text content with wine reference blocks */}
          <RichTextRenderer content={post.content} />

          {/* Related Articles */}
          <RelatedArticles currentPost={post} />

          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-4">Taggar</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => {
                  if (typeof tag === 'object') {
                    return (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full"
                      >
                        {tag.name}
                      </span>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )}
        </article>
      </>
    )
  } catch (error) {
    console.error('Error fetching blog post:', error)
    notFound()
  }
}
