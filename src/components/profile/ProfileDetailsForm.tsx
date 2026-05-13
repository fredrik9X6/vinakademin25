'use client'

import React, { useState, useEffect } from 'react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Define Zod schema for profile validation (Swedish messages)
const ProfileSchema = z.object({
  firstName: z.string().min(1, { message: 'Förnamn krävs.' }),
  lastName: z.string().min(1, { message: 'Efternamn krävs.' }),
  email: z.string().email({ message: 'Ogiltig e-postadress.' }),
  bio: z.string().max(280, { message: 'Bio kan inte vara längre än 280 tecken.' }).default(''),
  handle: z
    .string()
    .default('')
    .refine(
      (val) => {
        if (!val) return true
        if (val.length < 3 || val.length > 30) return false
        return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(val)
      },
      {
        message:
          '3–30 tecken, a–z, 0–9 och bindestreck. Får inte börja eller sluta med bindestreck.',
      },
    ),
})

export type ProfileFormValues = z.infer<typeof ProfileSchema>

interface ProfileDetailsFormProps {
  userId: string
  initialData?: Partial<ProfileFormValues>
  onSuccess?: () => void
}

export function ProfileDetailsForm({ userId, initialData, onSuccess }: ProfileDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      bio: initialData?.bio || '',
      handle: initialData?.handle || '',
    },
  })

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        bio: initialData.bio || '',
        handle: initialData.handle || '',
      })
    }
  }, [initialData, form])

  const handleValue = form.watch('handle') ?? ''
  const bioValue = form.watch('bio') ?? ''

  async function onSubmit(values: ProfileFormValues) {
    setIsLoading(true)
    try {
      const trimmedHandle = (values.handle ?? '').toLowerCase().trim()
      const trimmedBio = (values.bio ?? '').trim()
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        bio: trimmedBio ? trimmedBio : null,
        handle: trimmedHandle ? trimmedHandle : null,
      }
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (response.ok) {
        const json = await response.json()
        const saved = json?.data as Partial<ProfileFormValues> | undefined
        if (saved) {
          form.reset({
            firstName: saved.firstName ?? values.firstName,
            lastName: saved.lastName ?? values.lastName,
            email: saved.email ?? values.email,
            bio: saved.bio ?? values.bio ?? '',
            handle: saved.handle ?? trimmedHandle ?? '',
          })
        }
        toast.success('Profil uppdaterad', {
          description: 'Dina profiluppgifter har sparats.',
        })
        onSuccess?.()
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte uppdatera profilen.'
        toast.error('Uppdatering misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Profilfel', {
        description: 'Ett oväntat fel inträffade vid uppdatering av profilen.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Förnamn</FormLabel>
                <FormControl>
                  <Input placeholder="Anna" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Efternamn</FormLabel>
                <FormControl>
                  <Input placeholder="Andersson" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-post</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="anna@exempel.com"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <section className="space-y-4 rounded-md border bg-card p-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Offentlig profil</h2>
            <p className="text-sm text-muted-foreground">
              Aktivera ett användarnamn för att göra din profil synlig på{' '}
              <span className="font-mono">vinakademin.se/v/&lt;namn&gt;</span>. Lämna tomt för att
              hålla profilen privat.
            </p>
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <FormField
            control={form.control as any}
            name="handle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Användarnamn</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">vinakademin.se/v/</span>
                    <Input
                      placeholder="ditt-namn"
                      maxLength={30}
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  3–30 tecken, a–z, 0–9 och bindestreck. Lämna tomt för att hålla profilen privat.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio (valfritt)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Vem är du? Vad gillar du för vin?"
                    className="resize-none"
                    maxLength={280}
                    {...field}
                    value={field.value ?? ''}
                    disabled={isLoading}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">{bioValue.length}/280</p>
                <FormMessage />
              </FormItem>
            )}
          />

          {handleValue ? (
            <Link
              href={`/v/${handleValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-400 hover:underline"
            >
              Visa profil <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
        </section>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Sparar...' : 'Spara ändringar'}
        </Button>
      </form>
    </Form>
  )
}
