import Link from 'next/link'
import type { TastingTemplate, Media } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Wine as WineIcon } from 'lucide-react'

export interface TemplateCardProps {
  template: TastingTemplate
}

export function TemplateCard({ template }: TemplateCardProps) {
  const wineCount = template.wines?.length ?? 0
  const image =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null
  const imageUrl =
    image && typeof image === 'object'
      ? image.sizes?.thumbnail?.url ?? image.url ?? null
      : null

  return (
    <Link href={`/provningsmallar/${template.slug}`} className="block group">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-[4/3] bg-muted relative">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <WineIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <h3 className="font-semibold truncate group-hover:text-brand-400 transition-colors">
            {template.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {[template.occasion, `${wineCount} viner`].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Av Vinakademin</p>
        </div>
      </Card>
    </Link>
  )
}
