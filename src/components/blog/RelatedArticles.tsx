import { getPayload } from 'payload'
import Link from 'next/link'
import config from '@/payload.config'
import { BlogPostCard } from './BlogPostCard'
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
      <section className="mt-16 border-t border-border/60 pt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
              Fortsätt läsa
            </span>
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              Relaterade artiklar
            </h2>
          </div>
          <Link
            href="/artiklar"
            className="hidden text-sm text-muted-foreground hover:text-brand-400 hover:underline underline-offset-2 sm:inline"
          >
            Se alla artiklar →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {relatedPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} size="medium" showAuthor={true} />
          ))}
        </div>
      </section>
    )
  } catch (error) {
    console.error('Error fetching related articles:', error)
    return null
  }
}
