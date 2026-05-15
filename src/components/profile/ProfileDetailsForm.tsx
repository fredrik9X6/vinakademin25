'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/context/AuthContext'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  profilePublic: z.boolean().optional(),
})

export type ProfileFormValues = {
  firstName: string
  lastName: string
  email: string
  bio: string
  handle: string
  profilePublic: boolean
}

interface ProfileDetailsFormProps {
  userId: string
  initialData?: Partial<ProfileFormValues>
  onSuccess?: () => void
}

export function ProfileDetailsForm({ userId, initialData, onSuccess }: ProfileDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { setUser } = useAuth()

  // Sticky lock: once a handle is known (from initialData or just-saved on this
  // page), we never let it un-set. The server enforces immutability; this state
  // makes sure the UI also renders the read-only branch consistently even when
  // initialData transiently echoes back an empty handle (auth-context refresh
  // race, etc.). To unlock for a user, clear the handle in Payload admin.
  const [lockedHandle, setLockedHandle] = useState<string>(
    (initialData?.handle ?? '').trim().toLowerCase(),
  )
  const hasLockedHandle = lockedHandle.length > 0

  // Sync upward (initialData → state) only when initialData provides a non-empty
  // handle. Never reset to empty from props.
  useEffect(() => {
    const next = (initialData?.handle ?? '').trim().toLowerCase()
    if (next && next !== lockedHandle) {
      setLockedHandle(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.handle])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema) as any,
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      bio: initialData?.bio || '',
      handle: initialData?.handle || '',
      profilePublic: initialData?.profilePublic ?? true,
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
        profilePublic: initialData.profilePublic ?? true,
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
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        bio: trimmedBio ? trimmedBio : null,
        profilePublic: values.profilePublic ?? true,
      }
      // Only send handle when it's not locked yet (i.e. first time setting it).
      // Server also enforces this, but be defensive here.
      if (!hasLockedHandle && trimmedHandle) {
        payload.handle = trimmedHandle
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
          // Sticky lock: if we just set the handle for the first time, commit
          // it locally so the read-only branch renders immediately on next
          // render — without waiting for a parent re-fetch.
          const newlyLockedHandle =
            !hasLockedHandle && trimmedHandle
              ? trimmedHandle
              : lockedHandle || trimmedHandle || saved.handle || ''
          if (newlyLockedHandle && newlyLockedHandle !== lockedHandle) {
            setLockedHandle(newlyLockedHandle)
          }
          // ALWAYS preserve the locked handle. Server may echo an empty string
          // on race conditions, but the URL slug is permanent once set.
          form.reset({
            firstName: saved.firstName ?? values.firstName,
            lastName: saved.lastName ?? values.lastName,
            email: saved.email ?? values.email,
            bio: (trimmedBio || saved.bio) ?? values.bio ?? '',
            handle: newlyLockedHandle,
            profilePublic:
              typeof saved.profilePublic === 'boolean'
                ? saved.profilePublic
                : (values.profilePublic ?? true),
          })
          // Push the saved fields into the auth context so the user object
          // available app-wide (top-nav, dropdown, profile page on remount)
          // has the just-saved handle/bio/profilePublic. Without this, the
          // sticky lockedHandle state evaporates on remount because
          // initialData.handle (derived from useAuth().user.handle) is still
          // empty until the next /api/users/me refresh.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUser((prev: any) =>
            prev
              ? {
                  ...prev,
                  firstName: saved.firstName ?? prev.firstName,
                  lastName: saved.lastName ?? prev.lastName,
                  email: saved.email ?? prev.email,
                  bio: saved.bio ?? prev.bio ?? null,
                  handle: newlyLockedHandle || prev.handle,
                  profilePublic:
                    typeof saved.profilePublic === 'boolean'
                      ? saved.profilePublic
                      : prev.profilePublic,
                }
              : prev,
          )
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
              <span className="font-mono">vinakademin.se/profil/&lt;namn&gt;</span>. Lämna tomt för att
              hålla profilen privat.
            </p>
          </div>

          {hasLockedHandle ? (
            <div>
              <Label htmlFor="handle">Användarnamn</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">vinakademin.se/profil/</span>
                <Input
                  id="handle"
                  value={lockedHandle}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Användarnamnet kan inte ändras efter att det sparats.
              </p>
            </div>
          ) : (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            <FormField
              control={form.control as any}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Användarnamn</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">vinakademin.se/profil/</span>
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
                    3–30 tecken, a–z, 0–9, bindestreck. Lämna tomt för att hålla profilen privat.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <FormField
            control={form.control as any}
            name="profilePublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 rounded border-input accent-brand-400"
                    checked={field.value !== false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={!hasLockedHandle || isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">Min profil är synlig på Vinakademin</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {hasLockedHandle
                      ? 'När detta är av visas inte din profil eller publicerade provningar publikt.'
                      : 'Sätt ett användarnamn först för att aktivera profilen.'}
                  </p>
                </div>
              </FormItem>
            )}
          />

          {(lockedHandle || handleValue) && (
            <Link
              href={`/profil/${lockedHandle || handleValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-400 hover:underline"
            >
              Visa profil <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </section>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Sparar...' : 'Spara ändringar'}
        </Button>
      </form>
    </Form>
  )
}
