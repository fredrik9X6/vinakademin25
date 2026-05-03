'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Filter, ArrowUpDown, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input as TextInput } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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

export function VinlistanToolbar({
  q,
  sort,
  countryOptions = [],
  regionOptions = [],
  grapeOptions = [],
}: {
  q: string
  sort: string
  countryOptions?: string[]
  regionOptions?: string[]
  grapeOptions?: string[]
}) {
  const [value, setValue] = React.useState(q)
  const [sortVal, setSortVal] = React.useState(sort || 'rating-desc')
  const [country, setCountry] = React.useState<string>('')
  const [region, setRegion] = React.useState<string>('')
  const [grape, setGrape] = React.useState<string>('')
  const [priceMax, setPriceMax] = React.useState<string>('')
  const [ratingMin, setRatingMin] = React.useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (!searchParams) return
    setCountry(searchParams.get('country') || '')
    setRegion(searchParams.get('region') || '')
    setGrape(searchParams.get('grape') || '')
    setPriceMax(searchParams.get('priceMax') || '')
    setRatingMin(searchParams.get('ratingMin') || '')
  }, [searchParams])

  const apply = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value) params.set('q', value)
    else params.delete('q')
    if (sortVal) params.set('sort', sortVal)
    else params.delete('sort')
    params.delete('page')
    router.push(`/vinlistan?${params.toString()}`)
  }

  // Debounced as-you-type search.
  // Skip when `value` already matches the URL — otherwise navigation that
  // doesn't change the search input (e.g. clicking pagination) would re-run
  // this effect, strip `page`, and bounce the user back to page 1.
  React.useEffect(() => {
    const currentQ = searchParams?.get('q') || ''
    if (value === currentQ) return
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || '')
      if (value) params.set('q', value)
      else params.delete('q')
      params.delete('page')
      router.replace(`/vinlistan?${params.toString()}`)
    }, 350)
    return () => clearTimeout(t)
  }, [value, router, searchParams])

  const applyQuick = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    // Toggle behavior: support multi-select for type
    if (key === 'type') {
      const currentAll = params.getAll('type')
      const idx = currentAll.indexOf(val)
      if (idx >= 0) {
        const next = currentAll.filter((v) => v !== val)
        params.delete('type')
        next.forEach((v) => params.append('type', v))
      } else {
        params.append('type', val)
      }
    } else if (key === 'priceMax') {
      const current = params.get('priceMax') || ''
      if (current === val) params.delete('priceMax')
      else params.set('priceMax', val)
    } else {
      applyQuickParam(params, key, val)
    }
    params.delete('page')
    router.push(`/vinlistan?${params.toString()}`)
  }

  const clearParam = (key: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete(key)
    params.delete('page')
    if (key === 'q') setValue('')
    router.push(`/vinlistan?${params.toString()}`)
  }

  const clearParamValue = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (key === 'type') {
      const currentAll = params.getAll('type')
      const next = currentAll.filter((v) => v !== val)
      params.delete('type')
      next.forEach((v) => params.append('type', v))
    } else if ((params.get(key) || '') === val) {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/vinlistan?${params.toString()}`)
  }

  return (
    <div className="w-full space-y-3">
      {/* Row 1: Search */}
      <div className="flex items-center gap-2 w-full md:max-w-3xl mx-auto">
        <Input
          placeholder="Sök vin, producent..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
        />
      </div>

      {/* Row 2: Filters (left) + Sort (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter icon + dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Filter">
                <Filter className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Select
                    value={country || 'any'}
                    onValueChange={(v) => setCountry(v === 'any' ? '' : v)}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Alla länder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla länder</SelectItem>
                      {countryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={region || 'any'}
                    onValueChange={(v) => setRegion(v === 'any' ? '' : v)}
                  >
                    <SelectTrigger id="region">
                      <SelectValue placeholder="Alla regioner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla regioner</SelectItem>
                      {regionOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grape">Druva</Label>
                  <Select
                    value={grape || 'any'}
                    onValueChange={(v) => setGrape(v === 'any' ? '' : v)}
                  >
                    <SelectTrigger id="grape">
                      <SelectValue placeholder="Alla druvor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Alla druvor</SelectItem>
                      {grapeOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMax">Maxpris (kr)</Label>
                  <TextInput
                    id="priceMax"
                    inputMode="numeric"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min betyg</Label>
                  <Select
                    value={ratingMin || 'any'}
                    onValueChange={(v) => setRatingMin(v === 'any' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj" />
                    </SelectTrigger>
                    <SelectContent>
                      {['any', '1', '2', '3', '4'].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v === 'any' ? 'Alla' : `${v}+`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString() || '')
                    ;['country', 'region', 'grape', 'priceMax', 'ratingMin', 'type'].forEach((k) =>
                      params.delete(k),
                    )
                    router.push(`/vinlistan?${params.toString()}`)
                  }}
                >
                  Rensa
                </Button>
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString() || '')
                    if (country) params.set('country', country)
                    else params.delete('country')
                    if (region) params.set('region', region)
                    else params.delete('region')
                    if (grape) params.set('grape', grape)
                    else params.delete('grape')
                    if (priceMax) params.set('priceMax', priceMax)
                    else params.delete('priceMax')
                    if (ratingMin) params.set('ratingMin', ratingMin)
                    else params.delete('ratingMin')
                    params.delete('page')
                    router.push(`/vinlistan?${params.toString()}`)
                  }}
                >
                  Verkställ filter
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick chips next to icon */}
          <FilterPill
            active={(searchParams?.getAll('type') || []).includes('red')}
            onClick={() => {
              setValue('')
              applyQuick('type', 'red')
            }}
          >
            Rött vin
          </FilterPill>
          <FilterPill
            active={(searchParams?.getAll('type') || []).includes('white')}
            onClick={() => {
              setValue('')
              applyQuick('type', 'white')
            }}
          >
            Vitt vin
          </FilterPill>
          <FilterPill
            active={(searchParams?.getAll('type') || []).includes('sparkling')}
            onClick={() => {
              setValue('')
              applyQuick('type', 'sparkling')
            }}
          >
            Mousserande
          </FilterPill>
          <FilterPill
            active={(searchParams?.getAll('type') || []).includes('rose')}
            onClick={() => {
              setValue('')
              applyQuick('type', 'rose')
            }}
          >
            Rosé
          </FilterPill>
          <FilterPill
            active={(searchParams?.getAll('type') || []).includes('orange')}
            onClick={() => {
              setValue('')
              applyQuick('type', 'orange')
            }}
          >
            Orange
          </FilterPill>
          <FilterPill
            active={(searchParams?.get('priceMax') || '') === '150'}
            onClick={() => {
              setValue('')
              applyQuick('priceMax', '150')
            }}
          >
            Under 150 kr
          </FilterPill>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort icon with instant apply */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Sortera">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                { v: 'rating-desc', label: 'Betyg: högst först' },
                { v: 'rating-asc', label: 'Betyg: lägst först' },
                { v: 'price-asc', label: 'Pris: lägst först' },
                { v: 'price-desc', label: 'Pris: högst först' },
                { v: 'newest', label: 'Nyast' },
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.v}
                  onClick={() => {
                    setSortVal(opt.v as any)
                    const params = new URLSearchParams(searchParams?.toString() || '')
                    params.set('sort', opt.v)
                    params.delete('page')
                    router.push(`/vinlistan?${params.toString()}`)
                  }}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 3: Active filters */}
      {(() => {
        const active: { key: string; label: string; value?: string }[] = []
        const qp = searchParams?.get('q') || ''
        const types = searchParams?.getAll('type') || []
        const pm = searchParams?.get('priceMax') || ''
        const co = searchParams?.get('country') || ''
        const re = searchParams?.get('region') || ''
        const gr = searchParams?.get('grape') || ''
        const rm = searchParams?.get('ratingMin') || ''

        if (qp) active.push({ key: 'q', label: `Sök: ${qp}` })
        if (types.includes('red')) active.push({ key: 'type', value: 'red', label: 'Rött vin' })
        if (types.includes('white')) active.push({ key: 'type', value: 'white', label: 'Vitt vin' })
        if (types.includes('sparkling'))
          active.push({ key: 'type', value: 'sparkling', label: 'Mousserande' })
        if (types.includes('rose')) active.push({ key: 'type', value: 'rose', label: 'Rosé' })
        if (types.includes('orange')) active.push({ key: 'type', value: 'orange', label: 'Orange' })
        if (types.includes('fortified'))
          active.push({ key: 'type', value: 'fortified', label: 'Starkvin' })
        if (types.includes('dessert'))
          active.push({ key: 'type', value: 'dessert', label: 'Dessertvin' })
        if (pm) active.push({ key: 'priceMax', label: `Under ${pm} kr` })
        if (co) active.push({ key: 'country', label: `Land: ${co}` })
        if (re) active.push({ key: 'region', label: `Region: ${re}` })
        if (gr) active.push({ key: 'grape', label: `Druva: ${gr}` })
        if (rm) active.push({ key: 'ratingMin', label: `Betyg: ${rm}+` })

        if (active.length === 0) return null
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {active.map((p, i) => (
                <span
                  key={`${p.key}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-400/20 bg-brand-300/10 px-3 py-1 text-xs font-medium text-brand-400"
                >
                  <span>{p.label}</span>
                  <button
                    type="button"
                    aria-label={`Ta bort ${p.label}`}
                    onClick={() => (p.value ? clearParamValue(p.key, p.value) : clearParam(p.key))}
                    className="ml-1 inline-flex items-center rounded-full p-0.5 hover:bg-brand-400/15"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString() || '')
                ;[
                  'q',
                  'type',
                  'priceMax',
                  'country',
                  'region',
                  'grape',
                  'ratingMin',
                  'page',
                ].forEach((k) => params.delete(k))
                setValue('')
                router.push(`/vinlistan?${params.toString()}`)
              }}
            >
              Rensa alla filter
            </Button>
          </div>
        )
      })()}
    </div>
  )
}

function applyQuickParam(params: URLSearchParams, key: string, val: string) {
  if (key === 'type') params.set('type', val)
  if (key === 'priceMax') params.set('priceMax', val)
}
