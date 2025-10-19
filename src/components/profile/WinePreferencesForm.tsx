'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { toast } from 'sonner'
import { Wine, MapPin, Palette, DollarSign } from 'lucide-react'

// Define Zod schema matching User collection winePreferences
const WinePreferencesSchema = z.object({
  favoriteGrapes: z.array(z.string()).optional(),
  favoriteRegions: z.array(z.string()).optional(),
  preferredStyles: z.array(z.string()).optional(),
  tastingExperience: z.string().optional(),
  discoveryPreferences: z.array(z.string()).optional(),
  priceRange: z.string().optional(),
  tastingNotes: z.string().optional(),
})

export type WinePreferencesFormValues = z.infer<typeof WinePreferencesSchema>

interface WinePreferencesFormProps {
  userId: string
  initialData?: Partial<WinePreferencesFormValues>
  onSuccess?: () => void
}

// Wine styles from User collection
const wineStyles = [
  { value: 'light_red', label: 'Lätta röda viner' },
  { value: 'medium_red', label: 'Medeltunga röda viner' },
  { value: 'full_red', label: 'Fylliga röda viner' },
  { value: 'light_white', label: 'Lätta vita viner' },
  { value: 'full_white', label: 'Fylliga vita viner' },
  { value: 'sparkling', label: 'Mousserande viner' },
  { value: 'rose', label: 'Rosévin' },
  { value: 'sweet', label: 'Sött vin' },
  { value: 'fortified', label: 'Starkvin' },
]

// Tasting experience levels from User collection
const tastingExperienceLevels = [
  { value: 'Nybörjare', label: 'Nybörjare' },
  { value: 'Medel', label: 'Medel' },
  { value: 'Avancerad', label: 'Avancerad' },
  { value: 'Expert', label: 'Expert' },
]

// Discovery preferences from User collection
const discoveryPreferences = [
  { value: 'new_grapes', label: 'Upptäck nya druvor' },
  { value: 'new_regions', label: 'Utforska nya regioner' },
  { value: 'price_ranges', label: 'Prova olika prisklasser' },
  { value: 'wine_culture', label: 'Lär dig om vinkultur' },
  { value: 'recommendations', label: 'Få personliga rekommendationer' },
  { value: 'virtual_tastings', label: 'Delta i virtuella provningar' },
]

// Price ranges from User collection
const priceRanges = [
  { value: 'budget', label: 'Under 200 kr' },
  { value: 'mid', label: '200-500 kr' },
  { value: 'premium', label: '500-1000 kr' },
  { value: 'luxury', label: 'Över 1000 kr' },
]

interface Grape {
  id: string
  name: string
  color?: string
}

interface Region {
  id: string
  name: string
  country?: {
    name: string
  }
}

export function WinePreferencesForm({ userId, initialData, onSuccess }: WinePreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [availableGrapes, setAvailableGrapes] = useState<Grape[]>([])
  const [availableRegions, setAvailableRegions] = useState<Region[]>([])

  const form = useForm<WinePreferencesFormValues>({
    resolver: zodResolver(WinePreferencesSchema),
    defaultValues: {
      favoriteGrapes: initialData?.favoriteGrapes || [],
      favoriteRegions: initialData?.favoriteRegions || [],
      preferredStyles: initialData?.preferredStyles || [],
      tastingExperience: initialData?.tastingExperience || 'Nybörjare',
      discoveryPreferences: initialData?.discoveryPreferences || [],
      priceRange: initialData?.priceRange || 'mid',
      tastingNotes: initialData?.tastingNotes || '',
    },
  })

  // Transform grapes and regions to MultiSelect format
  const grapeOptions = useMemo(
    () =>
      availableGrapes.map((grape) => ({
        label: grape.name,
        value: grape.id,
      })),
    [availableGrapes],
  )

  const regionOptions = useMemo(
    () =>
      availableRegions.map((region) => ({
        label: `${region.name}${region.country ? ` (${region.country.name})` : ''}`,
        value: region.id,
      })),
    [availableRegions],
  )

  // Fetch available grapes and regions, and current preferences
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [grapesResponse, regionsResponse, preferencesResponse] = await Promise.all([
          fetch('/api/grapes?limit=100&sort=name', { credentials: 'include' }),
          fetch('/api/regions?limit=100&sort=name&depth=1', { credentials: 'include' }),
          fetch(`/api/users/${userId}/preferences`, { credentials: 'include' }),
        ])

        if (grapesResponse.ok) {
          const grapesData = await grapesResponse.json()
          setAvailableGrapes(grapesData.docs || [])
        }

        if (regionsResponse.ok) {
          const regionsData = await regionsResponse.json()
          setAvailableRegions(regionsData.docs || [])
        }

        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json()
          const preferences = preferencesData.data || {}

          // Update form with current preferences
          form.reset({
            favoriteGrapes:
              preferences.favoriteGrapes?.map((grape: any) => grape.id || grape) || [],
            favoriteRegions:
              preferences.favoriteRegions?.map((region: any) => region.id || region) || [],
            preferredStyles: preferences.preferredStyles || [],
            tastingExperience: preferences.tastingExperience || 'Nybörjare',
            discoveryPreferences: preferences.discoveryPreferences || [],
            priceRange: preferences.priceRange || 'mid',
            tastingNotes: preferences.tastingNotes || '',
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsInitialLoad(false)
      }
    }

    fetchData()
  }, [userId, form])

  // Update form when initialData changes
  useEffect(() => {
    if (initialData && !isInitialLoad) {
      form.reset({
        favoriteGrapes: initialData.favoriteGrapes || [],
        favoriteRegions: initialData.favoriteRegions || [],
        preferredStyles: initialData.preferredStyles || [],
        tastingExperience: initialData.tastingExperience || 'Nybörjare',
        discoveryPreferences: initialData.discoveryPreferences || [],
        priceRange: initialData.priceRange || 'mid',
        tastingNotes: initialData.tastingNotes || '',
      })
    }
  }, [initialData, form, isInitialLoad])

  // Auto-save function with debouncing (but don't show loading state for better UX)
  const autoSave = useCallback(
    async (values: WinePreferencesFormValues) => {
      try {
        const response = await fetch(`/api/users/${userId}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
          credentials: 'include',
        })

        if (response.ok) {
          // Don't show success toast for auto-save to reduce UI noise
          onSuccess?.()
        } else {
          const errorData = await response.json()
          const errorMessage = errorData.message || 'Kunde inte uppdatera vinpreferenser.'
          toast.error('Sparning misslyckades', {
            description: errorMessage,
            duration: 4000,
          })
        }
      } catch (error) {
        console.error('Wine preferences update error:', error)
        toast.error('Preferensfel', {
          description: 'Ett oväntat fel inträffade vid sparning.',
          duration: 4000,
        })
      }
    },
    [userId, onSuccess],
  )

  // Memoized debounced auto-save to prevent recreation
  const debouncedAutoSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (values: WinePreferencesFormValues) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => autoSave(values), 300)
    }
  }, [autoSave])

  // Handle field changes without triggering loading state
  const handleFieldChange = useCallback(
    (field: keyof WinePreferencesFormValues, value: any) => {
      form.setValue(field, value)

      // Don't auto-save during initial load
      if (!isInitialLoad) {
        const currentValues = form.getValues()
        debouncedAutoSave(currentValues)
      }
    },
    [form, debouncedAutoSave, isInitialLoad],
  )

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Favorite Grapes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Favoritdruvor</span>
            </CardTitle>
            <CardDescription>Välj dina favoritdruvor för bättre rekommendationer.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="favoriteGrapes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Druvsort</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={grapeOptions}
                      defaultValue={field.value || []}
                      onValueChange={(values) => handleFieldChange('favoriteGrapes', values)}
                      placeholder="Välj favoritdruvor..."
                      variant="secondary"
                      animation={0}
                      maxCount={5}
                      disableSelectAll={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Favorite Regions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Favoritregioner</span>
            </CardTitle>
            <CardDescription>Välj dina favoritregioner för vinrekommendationer.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="favoriteRegions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vinregion</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={regionOptions}
                      defaultValue={field.value || []}
                      onValueChange={(values) => handleFieldChange('favoriteRegions', values)}
                      placeholder="Välj favoritregioner..."
                      variant="secondary"
                      animation={0}
                      maxCount={5}
                      disableSelectAll={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Price Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Prisintervall</span>
            </CardTitle>
            <CardDescription>Välj din önskade prisbudget för vinrekommendationer.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="priceRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prisintervall</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleFieldChange('priceRange', value)}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj prisintervall" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priceRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Preferred Wine Styles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wine className="h-5 w-5" />
              <span>Föredragna vinstilar</span>
            </CardTitle>
            <CardDescription>Välj de vinstilar du föredrar.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="preferredStyles"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wineStyles.map((style) => (
                      <FormField
                        key={style.value}
                        control={form.control}
                        name="preferredStyles"
                        render={({ field }) => (
                          <FormItem
                            key={style.value}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(style.value)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), style.value]
                                    : (field.value || []).filter((value) => value !== style.value)
                                  handleFieldChange('preferredStyles', newValue)
                                }}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{style.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Tasting Experience */}
        <Card>
          <CardHeader>
            <CardTitle>Provningsupplevelse</CardTitle>
            <CardDescription>Välj din erfarenhetsnivå inom vinprovning.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tastingExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Erfarenhetsnivå</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleFieldChange('tastingExperience', value)}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj erfarenhetsnivå" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tastingExperienceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Discovery Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Upptäcktspreferenser</CardTitle>
            <CardDescription>Välj vad du vill upptäcka och lära dig om vin.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="discoveryPreferences"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {discoveryPreferences.map((pref) => (
                      <FormField
                        key={pref.value}
                        control={form.control}
                        name="discoveryPreferences"
                        render={({ field }) => (
                          <FormItem
                            key={pref.value}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(pref.value)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), pref.value]
                                    : (field.value || []).filter((value) => value !== pref.value)
                                  handleFieldChange('discoveryPreferences', newValue)
                                }}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">{pref.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">Sparar preferenser...</div>
        )}
      </div>
    </Form>
  )
}
