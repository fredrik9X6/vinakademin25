'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Tag as TagIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { BlogCategory, BlogTag } from '@/payload-types'

interface BlogFiltersProps {
  categories: BlogCategory[]
  tags: BlogTag[]
  selectedCategory?: string
  selectedTags?: string[]
  searchQuery?: string
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors',
        active
          ? 'border-brand-400/30 bg-brand-300/15 text-brand-400'
          : 'border-border bg-background text-foreground hover:border-brand-400/50 hover:bg-brand-300/5',
      )}
    >
      {children}
    </button>
  )
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

  const updateFilters = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
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
    // Resetting filters always returns to page 1
    params.delete('page')
    router.push(`/artiklar?${params.toString()}`)
  }

  const handleCategoryFilter = (categorySlug: string | null) => {
    updateFilters({ category: selectedCategory === categorySlug ? null : categorySlug })
  }

  const handleTagFilter = (tagSlug: string) => {
    const newTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug]
    updateFilters({ tags: newTags })
  }

  const clearFilters = () => {
    setLocalSearch('')
    router.push('/artiklar')
  }

  // Debounced search — skip when value already matches the URL
  // (otherwise pagination clicks would reset to page 1).
  useEffect(() => {
    const currentSearch = searchParams?.get('search') || ''
    if (localSearch === currentSearch) return
    const t = setTimeout(() => {
      updateFilters({ search: localSearch || null })
    }, 350)
    return () => clearTimeout(t)
  }, [localSearch, searchParams])

  const hasActiveFilters = !!selectedCategory || selectedTags.length > 0 || !!searchQuery

  return (
    <div className="w-full space-y-3">
      {/* Row 1: Search */}
      <div className="relative w-full md:max-w-3xl mx-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Sök artiklar, författare, ämne…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Row 2: Category pills + Tag dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPill active={!selectedCategory} onClick={() => handleCategoryFilter(null)}>
            Alla
          </FilterPill>
          {categories.map((cat) => (
            <FilterPill
              key={cat.id}
              active={selectedCategory === cat.slug}
              onClick={() => handleCategoryFilter(cat.slug)}
            >
              {cat.name}
            </FilterPill>
          ))}
        </div>

        {tags.length > 0 ? (
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label="Filtrera på taggar"
                >
                  <TagIcon className="h-4 w-4" />
                  Taggar
                  {selectedTags.length > 0 ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-400 px-1.5 text-[10px] font-semibold text-white">
                      {selectedTags.length}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTags.includes(tag.slug)}
                    onCheckedChange={() => handleTagFilter(tag.slug)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {/* Row 3: Active filter chips */}
      {hasActiveFilters ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {searchQuery ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-400/20 bg-brand-300/10 px-3 py-1 text-xs font-medium text-brand-400">
                <span>Sök: {searchQuery}</span>
                <button
                  type="button"
                  aria-label={`Ta bort sökning ${searchQuery}`}
                  onClick={() => {
                    setLocalSearch('')
                    updateFilters({ search: null })
                  }}
                  className="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-brand-400/15"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}

            {selectedCategory ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-400/20 bg-brand-300/10 px-3 py-1 text-xs font-medium text-brand-400">
                <span>Kategori: {categories.find((c) => c.slug === selectedCategory)?.name}</span>
                <button
                  type="button"
                  aria-label="Ta bort kategorifilter"
                  onClick={() => handleCategoryFilter(null)}
                  className="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-brand-400/15"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}

            {selectedTags.map((tagSlug) => {
              const tag = tags.find((t) => t.slug === tagSlug)
              if (!tag) return null
              return (
                <span
                  key={tagSlug}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-400/20 bg-brand-300/10 px-3 py-1 text-xs font-medium text-brand-400"
                >
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    aria-label={`Ta bort tagg ${tag.name}`}
                    onClick={() => handleTagFilter(tagSlug)}
                    className="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-brand-400/15"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>

          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Rensa alla filter
          </Button>
        </div>
      ) : null}
    </div>
  )
}
