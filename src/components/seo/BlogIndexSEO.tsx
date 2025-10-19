import type { BlogCategory, BlogTag } from '@/payload-types'

interface BlogIndexSEOProps {
  type: 'index' | 'category' | 'tag'
  category?: BlogCategory
  tag?: BlogTag
  url: string
  searchQuery?: string
  currentPage?: number
}

export function BlogIndexSEO({
  type,
  category,
  tag,
  url,
  searchQuery,
  currentPage = 1,
}: BlogIndexSEOProps) {
  // Generate title and description based on page type
  const generateSEOContent = () => {
    const pageNumber = currentPage > 1 ? ` - Sida ${currentPage}` : ''

    switch (type) {
      case 'category':
        if (category) {
          return {
            title: `${category.name} - Artiklar${pageNumber}`,
            description: category.description
              ? `${category.description} Läs alla artiklar inom kategorin ${category.name} på Vinakademin.`
              : `Alla artiklar inom kategorin ${category.name} på Vinakademin - din guide till vinets värld.`,
            breadcrumb: [
              { name: 'Hem', url: '/' },
              { name: 'Artiklar', url: '/artiklar' },
              { name: category.name, url },
            ],
          }
        }
        break

      case 'tag':
        if (tag) {
          return {
            title: `${tag.name} - Artiklar${pageNumber}`,
            description: tag.description
              ? `${tag.description} Utforska alla artiklar taggade med ${tag.name} på Vinakademin.`
              : `Alla artiklar taggade med ${tag.name} på Vinakademin - din guide till vinets värld.`,
            breadcrumb: [
              { name: 'Hem', url: '/' },
              { name: 'Artiklar', url: '/artiklar' },
              { name: tag.name, url },
            ],
          }
        }
        break

      default: // index
        const searchText = searchQuery ? ` för "${searchQuery}"` : ''
        return {
          title: `Artiklar${searchText}${pageNumber}`,
          description: searchQuery
            ? `Sökresultat för "${searchQuery}" bland våra artiklar om vin, vinkunskap och vinresor på Vinakademin.`
            : 'Upptäck vinets värld genom våra expertguider, recensioner och utbildningsartiklar på Vinakademin - din guide till vinets värld.',
          breadcrumb: [
            { name: 'Hem', url: '/' },
            { name: 'Artiklar', url },
          ],
        }
    }

    return { title: 'Artiklar', description: 'Vinakademin artiklar', breadcrumb: [] }
  }

  const { title, description, breadcrumb } = generateSEOContent()

  // Structured data for breadcrumbs
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumb.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http')
        ? item.url
        : `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${item.url}`,
    })),
  }

  // Structured data for blog section
  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Vinakademin Artiklar',
    description: 'Expertguider, recensioner och utbildningsartiklar om vin',
    url: url,
    publisher: {
      '@type': 'Organization',
      name: 'Vinakademin',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/logo.png`,
      },
    },
    inLanguage: 'sv-SE',
  }

  const robotsContent =
    currentPage > 1
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{title} | Vinakademin</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content={`vin, vinakademin, vinkunskap, artiklar, ${category?.name || tag?.name || 'vinartiklar'}`}
      />
      <link rel="canonical" href={url} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Vinakademin" />
      <meta property="og:locale" content="sv_SE" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:site" content="@vinakademin" />

      {/* SEO Meta Tags */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content="index, follow" />

      {/* Pagination Meta Tags */}
      {currentPage > 1 && (
        <>
          <link
            rel="prev"
            href={
              currentPage === 2 ? url.split('?')[0] : `${url.split('?')[0]}?page=${currentPage - 1}`
            }
          />
          <meta name="robots" content="noindex, follow" />
        </>
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData, null, 2),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogStructuredData, null, 2),
        }}
      />
    </>
  )
}
