'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BlogCategory, BlogTag } from '@/payload-types'

interface BlogFiltersProps {
  categories: BlogCategory[]
  tags: BlogTag[]
  selectedCategory?: string
  selectedTags?: string[]
  searchQuery?: string
}

export function BlogFilters({
  categories,
  tags,
  selectedCategory,
  selectedTags = [],
  searchQuery = '',
}: BlogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Update URL with filters
  const updateFilters = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || (Array.isArray(value) && value.length === 0)) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach((v) => params.append(key, v))
      } else {
        params.set(key, value)
      }
    })

    router.push(`/artiklar?${params.toString()}`)
  }

  // Handle search
  const handleSearch = (query: string) => {
    updateFilters({ search: query || null })
  }

  // Handle category filter
  const handleCategoryFilter = (categorySlug: string | null) => {
    updateFilters({ category: categorySlug })
  }

  // Handle tag filter
  const handleTagFilter = (tagSlug: string) => {
    const newTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug]

    updateFilters({ tags: newTags })
  }

  // Clear all filters
  const clearFilters = () => {
    setLocalSearch('')
    router.push('/artiklar')
  }

  // Handle search input changes with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (localSearch !== searchQuery) {
        handleSearch(localSearch)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [localSearch])

  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || searchQuery

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Sök artiklar..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Kategori
              {selectedCategory && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => handleCategoryFilter(null)}>
              <span className={!selectedCategory ? 'font-medium' : ''}>Alla kategorier</span>
            </DropdownMenuItem>
            {categories.map((category) => (
              <DropdownMenuItem
                key={category.id}
                onClick={() => handleCategoryFilter(category.slug)}
              >
                <span className={selectedCategory === category.slug ? 'font-medium' : ''}>
                  {category.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tag Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Taggar
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <DropdownMenuItem key={tag.id} onClick={() => handleTagFilter(tag.slug)}>
                <span className={selectedTags.includes(tag.slug) ? 'font-medium' : ''}>
                  {tag.name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <X className="h-4 w-4" />
            Rensa filter
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Sökning: "{searchQuery}"
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-600"
                onClick={() => {
                  setLocalSearch('')
                  handleSearch('')
                }}
              />
            </Badge>
          )}

          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Kategori: {categories.find((c) => c.slug === selectedCategory)?.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-600"
                onClick={() => handleCategoryFilter(null)}
              />
            </Badge>
          )}

          {selectedTags.map((tagSlug) => {
            const tag = tags.find((t) => t.slug === tagSlug)
            return tag ? (
              <Badge key={tagSlug} variant="secondary" className="gap-1">
                {tag.name}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-600"
                  onClick={() => handleTagFilter(tagSlug)}
                />
              </Badge>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
