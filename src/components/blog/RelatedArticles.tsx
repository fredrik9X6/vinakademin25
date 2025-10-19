import { getPayload } from 'payload'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import config from '@/payload.config'
import type { BlogPost } from '@/payload-types'

interface RelatedArticlesProps {
  currentPost: BlogPost
  limit?: number
}

export async function RelatedArticles({ currentPost, limit = 3 }: RelatedArticlesProps) {
  const payload = await getPayload({ config })

  try {
    // First, try to find articles in the same category
    let relatedPosts: BlogPost[] = []

    if (currentPost.category && typeof currentPost.category === 'object') {
      const { docs: categoryPosts } = await payload.find({
        collection: 'blog-posts',
        where: {
          and: [
            { slug: { not_equals: currentPost.slug } }, // Exclude current post
            { category: { equals: currentPost.category.id } },
            { _status: { equals: 'published' } },
          ],
        },
        limit,
        depth: 2,
        sort: '-publishedDate',
      })
      relatedPosts = categoryPosts as BlogPost[]
    }

    // If we don't have enough posts from the same category, find posts with similar tags
    if (relatedPosts.length < limit && currentPost.tags && currentPost.tags.length > 0) {
      const tagIds = currentPost.tags
        .filter((tag) => typeof tag === 'object')
        .map((tag) => (tag as any).id)

      if (tagIds.length > 0) {
        const { docs: tagPosts } = await payload.find({
          collection: 'blog-posts',
          where: {
            and: [
              { slug: { not_equals: currentPost.slug } },
              { tags: { in: tagIds } },
              { _status: { equals: 'published' } },
              // Exclude posts we already have
              ...(relatedPosts.length > 0
                ? [{ id: { not_in: relatedPosts.map((p) => p.id) } }]
                : []),
            ],
          },
          limit: limit - relatedPosts.length,
          depth: 2,
          sort: '-publishedDate',
        })
        relatedPosts = [...relatedPosts, ...(tagPosts as BlogPost[])]
      }
    }

    // If we still don't have enough, get recent posts
    if (relatedPosts.length < limit) {
      const { docs: recentPosts } = await payload.find({
        collection: 'blog-posts',
        where: {
          and: [
            { slug: { not_equals: currentPost.slug } },
            { _status: { equals: 'published' } },
            // Exclude posts we already have
            ...(relatedPosts.length > 0 ? [{ id: { not_in: relatedPosts.map((p) => p.id) } }] : []),
          ],
        },
        limit: limit - relatedPosts.length,
        depth: 2,
        sort: '-publishedDate',
      })
      relatedPosts = [...relatedPosts, ...(recentPosts as BlogPost[])]
    }

    if (relatedPosts.length === 0) {
      return null
    }

    return (
      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-medium mb-6 text-foreground">Relaterade artiklar</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {relatedPosts.map((post) => (
            <Link key={post.id} href={`/artiklar/${post.slug}`} className="group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg border-border">
                {post.featuredImage &&
                  typeof post.featuredImage === 'object' &&
                  post.featuredImage.url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img
                        src={post.featuredImage.url}
                        alt={post.featuredImage.alt || ''}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  )}

                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    {post.category && typeof post.category === 'object' && (
                      <Badge variant="secondary" className="text-xs">
                        {post.category.name}
                      </Badge>
                    )}
                    {post.publishedDate && (
                      <time dateTime={post.publishedDate} className="text-xs text-muted-foreground">
                        {new Date(post.publishedDate).toLocaleDateString('sv-SE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    )}
                  </div>

                  <h3 className="font-medium text-foreground group-hover:text-secondary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </CardHeader>

                {post.excerpt && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>
    )
  } catch (error) {
    console.error('Error fetching related articles:', error)
    return null
  }
}
