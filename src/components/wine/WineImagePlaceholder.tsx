import { Wine as WineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { container: string; icon: string; rounded: string }> = {
  sm: { container: 'p-3', icon: 'w-10 h-10', rounded: 'rounded-lg' },
  md: { container: 'p-4', icon: 'w-12 h-12', rounded: 'rounded-lg' },
  lg: { container: 'p-6', icon: 'w-16 h-16', rounded: 'rounded-full' },
}

interface WineImagePlaceholderProps {
  size?: Size
  className?: string
}

export function WineImagePlaceholder({ size = 'md', className }: WineImagePlaceholderProps) {
  const s = SIZES[size]
  return (
    <div
      className={cn('absolute inset-0 w-full h-full flex items-center justify-center', className)}
    >
      <div className={cn('bg-brand-300/15', s.rounded, s.container)}>
        <WineIcon className={cn('text-muted-foreground/40', s.icon)} aria-hidden />
      </div>
    </div>
  )
}
