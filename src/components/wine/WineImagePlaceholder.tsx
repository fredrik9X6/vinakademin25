import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface WineImagePlaceholderProps {
  /** Kept for backwards-compatibility with callers; not used (image scales via object-contain). */
  size?: Size
  className?: string
}

export function WineImagePlaceholder({ size: _size, className }: WineImagePlaceholderProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/placeholder-wine-bottle.webp"
      alt=""
      aria-hidden
      className={cn('absolute inset-0 w-full h-full object-contain', className)}
    />
  )
}
