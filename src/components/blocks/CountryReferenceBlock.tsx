'use client'

import Link from 'next/link'
import { Card, CardContent } from '../ui/card'
import { Globe } from 'lucide-react'
import type { Country } from '../../payload-types'

interface CountryReferenceBlockProps {
  country: Country
  displayStyle: 'inline' | 'card' | 'link'
  customText?: string
}

export function CountryReferenceBlock({
  country,
  displayStyle,
  customText,
}: CountryReferenceBlockProps) {
  const href = `/lander/${country.slug}`
  const displayText = customText || country.name

  if (displayStyle === 'link') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 underline underline-offset-2 transition-colors font-medium"
      >
        {displayText}
      </Link>
    )
  }

  if (displayStyle === 'inline') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
        <Globe className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
        <Link
          href={href}
          className="text-gray-900 dark:text-gray-100 hover:text-orange-500 dark:hover:text-orange-400 font-medium transition-colors"
        >
          {country.name}
        </Link>
      </span>
    )
  }

  if (displayStyle === 'card') {
    return (
      <Card className="my-6 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-sidebar shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20 flex-shrink-0">
              <Globe className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={href}
                className="text-lg font-semibold text-sidebar-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-2"
              >
                {country.name}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
