/**
 * JSON-LD helpers. Each component emits a single <script type="application/ld+json">.
 * Keep them server-renderable (no 'use client').
 */

type JsonLdProps = { data: Record<string, unknown> }

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // Schema is static, server-rendered JSON. Safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ---------- Organization + WebSite (sitewide, root layout) ---------- */

export function OrganizationJsonLd({ siteURL }: { siteURL: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vinakademin',
    url: siteURL,
    logo: `${siteURL}/brand/logomark-gradient.svg`,
    sameAs: [
      'https://www.instagram.com/vinakademin',
      'https://www.facebook.com/vinakademin',
    ],
  }
  return <JsonLd data={data} />
}

export function WebSiteJsonLd({ siteURL }: { siteURL: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Vinakademin',
    url: siteURL,
    inLanguage: 'sv-SE',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteURL}/sok?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return <JsonLd data={data} />
}

/* ---------- BreadcrumbList (detail pages) ---------- */

export type BreadcrumbItem = { name: string; url: string }

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return <JsonLd data={data} />
}

/* ---------- Course (vinprovning detail) ---------- */

type CourseJsonLdInput = {
  siteURL: string
  title: string
  slug: string
  description: string
  imageUrl: string | null
  price?: number | null
  currency?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | null
  durationHours?: number | null
  instructorName?: string | null
}

export function CourseJsonLd(input: CourseJsonLdInput) {
  const {
    siteURL,
    title,
    slug,
    description,
    imageUrl,
    price,
    currency = 'SEK',
    level,
    durationHours,
    instructorName,
  } = input
  const url = `${siteURL}/vinprovningar/${slug}`

  // Schema.org `EducationalLevel` text values; Google accepts free-form.
  const levelText =
    level === 'beginner'
      ? 'Beginner'
      : level === 'intermediate'
        ? 'Intermediate'
        : level === 'advanced'
          ? 'Advanced'
          : undefined

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: title,
    description,
    url,
    inLanguage: 'sv-SE',
    provider: {
      '@type': 'Organization',
      name: 'Vinakademin',
      sameAs: siteURL,
    },
    ...(imageUrl && { image: imageUrl }),
    ...(instructorName && {
      author: { '@type': 'Person', name: instructorName },
    }),
    ...(levelText && { educationalLevel: levelText }),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      // ISO 8601 duration (e.g. PT2H). Fallback omitted if unknown.
      ...(durationHours && durationHours > 0
        ? { courseWorkload: `PT${Math.round(durationHours)}H` }
        : {}),
      ...(instructorName && { instructor: { '@type': 'Person', name: instructorName } }),
    },
    offers:
      typeof price === 'number' && price > 0
        ? {
            '@type': 'Offer',
            price: price.toFixed(2),
            priceCurrency: currency,
            availability: 'https://schema.org/InStock',
            category: 'Paid',
            url,
          }
        : {
            '@type': 'Offer',
            price: '0',
            priceCurrency: currency,
            category: 'Free',
            url,
          },
  }

  return <JsonLd data={data} />
}

/* ---------- Product + AggregateRating (wine detail) ---------- */

type WineProductJsonLdInput = {
  siteURL: string
  name: string
  slug: string
  description: string
  imageUrl: string | null
  producer?: string | null
  countryName?: string | null
  vintage?: number | null
  price?: number | null
  currency?: string
  aggregateRating?: { value: number; count: number } | null
}

export function WineProductJsonLd(input: WineProductJsonLdInput) {
  const {
    siteURL,
    name,
    slug,
    description,
    imageUrl,
    producer,
    countryName,
    vintage,
    price,
    currency = 'SEK',
    aggregateRating,
  } = input
  const url = `${siteURL}/vinlistan/${slug}`

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    ...(imageUrl && { image: imageUrl }),
    ...(producer && { brand: { '@type': 'Brand', name: producer } }),
    ...(countryName && { countryOfOrigin: countryName }),
    ...(vintage && { productionDate: String(vintage) }),
    category: 'Wine',
    ...(typeof price === 'number' &&
      price > 0 && {
        offers: {
          '@type': 'Offer',
          price: price.toFixed(2),
          priceCurrency: currency,
          availability: 'https://schema.org/InStock',
          url,
        },
      }),
    ...(aggregateRating &&
      aggregateRating.count > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: aggregateRating.value.toFixed(1),
          reviewCount: aggregateRating.count,
          bestRating: '5',
          worstRating: '1',
        },
      }),
  }

  return <JsonLd data={data} />
}

/* ---------- Article (blog post) — replaces inline tags in BlogSEO ---------- */

type ArticleJsonLdInput = {
  siteURL: string
  url: string
  headline: string
  description: string
  imageUrls: string[]
  authorName: string
  datePublished: string
  dateModified: string
  section?: string
  keywords?: string[]
}

export function ArticleJsonLd(input: ArticleJsonLdInput) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    image: input.imageUrls,
    author: { '@type': 'Person', name: input.authorName },
    publisher: {
      '@type': 'Organization',
      name: 'Vinakademin',
      logo: {
        '@type': 'ImageObject',
        url: `${input.siteURL}/brand/logomark-gradient.svg`,
      },
    },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    ...(input.section && { articleSection: input.section }),
    ...(input.keywords && input.keywords.length > 0 && { keywords: input.keywords.join(', ') }),
    url: input.url,
    inLanguage: 'sv-SE',
  }
  return <JsonLd data={data} />
}
