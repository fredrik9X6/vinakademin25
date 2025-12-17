import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock } from 'lucide-react'
import { calculateReadingTime, calculateReadingTimeFromExcerpt } from '@/lib/reading-time'
import type { BlogPost } from '@/payload-types'

interface BlogPostCardProps {
  post: BlogPost
  showAuthor?: boolean
  size?: 'small' | 'medium' | 'large'
}

export function BlogPostCard({ post, showAuthor = true, size = 'medium' }: BlogPostCardProps) {
  const readingTime = post.content
    ? calculateReadingTime(post.content)
    : calculateReadingTimeFromExcerpt(post.excerpt || '')

  // Get author info
  const getAuthorName = () => {
    if (post.author && typeof post.author === 'object') {
      const firstName = post.author.firstName || ''
      const lastName = post.author.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      return fullName || post.author.email
    }
    return 'Unknown Author'
  }

  const getAuthorAvatar = (): string | undefined => {
    if (post.author && typeof post.author === 'object' && post.author.avatar) {
      if (typeof post.author.avatar === 'object' && post.author.avatar.url) {
        return post.author.avatar.url
      }
    }
    return undefined
  }

  const authorName = getAuthorName()
  const authorAvatar = getAuthorAvatar()
  const authorInitials = authorName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()

  const sizeClasses = {
    small: {
      card: 'h-full',
      image: 'aspect-video',
      title: 'text-base font-medium line-clamp-2',
      excerpt: 'text-sm line-clamp-2',
      meta: 'text-xs',
      avatar: 'h-6 w-6',
    },
    medium: {
      card: 'h-full',
      image: 'aspect-video',
      title: 'text-lg font-medium line-clamp-2',
      excerpt: 'text-sm line-clamp-3',
      meta: 'text-xs',
      avatar: 'h-8 w-8',
    },
    large: {
      card: 'h-full',
      image: 'aspect-[16/10]',
      title: 'text-xl font-medium line-clamp-2',
      excerpt: 'text-base line-clamp-4',
      meta: 'text-sm',
      avatar: 'h-10 w-10',
    },
  }

  const classes = sizeClasses[size]

  return (
    <Link href={`/artiklar/${post.slug}`} className="group">
      <Card className={`${classes.card} transition-all duration-200 hover:shadow-lg border-border`}>
        {post.featuredImage && typeof post.featuredImage === 'object' && post.featuredImage.url && (
          <div className={`${classes.image} overflow-hidden rounded-t-lg`}>
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || ''}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        )}

        <CardHeader className="pb-3">
          {/* Category and metadata */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {post.category && typeof post.category === 'object' && (
                <Badge variant="secondary" className="text-xs">
                  {post.category.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className={classes.meta}>{readingTime.text}</span>
            </div>
          </div>

          {/* Title */}
          <h3
            className={`${classes.title} text-foreground group-hover:text-secondary transition-colors`}
          >
            {post.title}
          </h3>

          {/* Date */}
          {post.publishedDate && (
            <time dateTime={post.publishedDate} className={`${classes.meta} text-muted-foreground`}>
              {new Date(post.publishedDate).toLocaleDateString('sv-SE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </CardHeader>

        {/* Excerpt */}
        {post.excerpt && (
          <CardContent className="pt-0 pb-4">
            <p className={`${classes.excerpt} text-muted-foreground`}>{post.excerpt}</p>
          </CardContent>
        )}

        {/* Author */}
        {showAuthor && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <Avatar className={classes.avatar}>
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="text-xs font-medium">{authorInitials}</AvatarFallback>
              </Avatar>
              <span className={`${classes.meta} text-muted-foreground`}>{authorName}</span>
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
