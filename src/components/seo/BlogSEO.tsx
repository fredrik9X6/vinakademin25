import type { BlogPost, BlogTag } from '@/payload-types'

interface BlogSEOProps {
  post: BlogPost
  url: string
}

export function BlogSEO({ post, url }: BlogSEOProps) {
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
  const updatedDate = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedDate

  // SEO title and description
  const seoTitle = post.seoTitle || post.title
  const seoDescription =
    post.seoDescription ||
    post.excerpt ||
    `Läs mer om ${post.title} på Vinakademin - din guide till vinets värld.`

  // Structured data for article
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: seoDescription,
    image: featuredImage ? [featuredImage.url] : [],
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vinakademin',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/logo.png`,
      },
    },
    datePublished: publishedDate,
    dateModified: updatedDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: categoryName,
    keywords: tags.join(', '),
    url: url,
  }

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{seoTitle} | Vinakademin</title>
      <meta name="description" content={seoDescription} />
      <meta
        name="keywords"
        content={[...tags, 'vin', 'vinakademin', 'vinkunskap', categoryName.toLowerCase()].join(
          ', ',
        )}
      />
      <meta name="author" content={authorName} />
      <link rel="canonical" href={url} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Vinakademin" />
      <meta property="og:locale" content="sv_SE" />

      {/* Open Graph Article Meta */}
      <meta property="article:author" content={authorName} />
      <meta property="article:published_time" content={publishedDate} />
      <meta property="article:modified_time" content={updatedDate} />
      <meta property="article:section" content={categoryName} />
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Open Graph Image */}
      {featuredImage && (
        <>
          <meta property="og:image" content={featuredImage.url} />
          <meta property="og:image:alt" content={featuredImage.alt} />
          <meta property="og:image:width" content={featuredImage.width.toString()} />
          <meta property="og:image:height" content={featuredImage.height.toString()} />
          <meta property="og:image:type" content="image/jpeg" />
        </>
      )}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={featuredImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:creator" content="@vinakademin" />
      <meta name="twitter:site" content="@vinakademin" />

      {featuredImage && (
        <>
          <meta name="twitter:image" content={featuredImage.url} />
          <meta name="twitter:image:alt" content={featuredImage.alt} />
        </>
      )}

      {/* Additional SEO Meta Tags */}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="googlebot" content="index, follow" />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2),
        }}
      />
    </>
  )
}
