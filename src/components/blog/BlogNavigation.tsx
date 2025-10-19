import { getPayload } from 'payload'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Folder, Tag } from 'lucide-react'
import config from '@/payload.config'
import type { BlogCategory, BlogTag } from '@/payload-types'

interface BlogNavigationProps {
  className?: string
}

export async function BlogNavigation({ className }: BlogNavigationProps) {
  const payload = await getPayload({ config })

  try {
    // Fetch categories and tags
    const [categoriesResult, tagsResult] = await Promise.all([
      payload.find({
        collection: 'blog-categories',
        limit: 10,
        sort: 'name',
      }),
      payload.find({
        collection: 'blog-tags',
        limit: 12,
        sort: 'name',
      }),
    ])

    const categories = categoriesResult.docs as BlogCategory[]
    const tags = tagsResult.docs as BlogTag[]

    // Get tag color class
    const getTagColorClass = (tagColor?: string | null) => {
      switch (tagColor) {
        case 'red':
          return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
        case 'blue':
          return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
        case 'green':
          return 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
        case 'purple':
          return 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800'
        case 'yellow':
          return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800'
        case 'pink':
          return 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-300 dark:hover:bg-pink-800'
        default:
          return 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800'
      }
    }

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Categories */}
        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Kategorier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/artiklar/kategori/${category.slug}`}
                  className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                    >
                      {/* Post count would be calculated here in a real implementation */}•
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </Link>
              ))}
              <Link
                href="/artiklar"
                className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-orange-600 dark:text-orange-400 font-medium"
              >
                Visa alla kategorier →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Popular Tags */}
        {tags.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Populära taggar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 8).map((tag) => (
                  <Link key={tag.id} href={`/artiklar/tagg/${tag.slug}`}>
                    <Badge
                      variant="secondary"
                      className={`text-xs transition-colors cursor-pointer ${getTagColorClass(tag.color)}`}
                    >
                      {tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
              <Link
                href="/artiklar"
                className="inline-block mt-3 text-sm text-orange-600 dark:text-orange-400 font-medium hover:underline"
              >
                Visa alla taggar →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error fetching blog navigation data:', error)
    return null
  }
}
