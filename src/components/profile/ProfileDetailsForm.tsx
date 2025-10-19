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
import { Loader2 } from 'lucide-react'

// Define Zod schema for profile validation (Swedish messages)
const ProfileSchema = z.object({
  firstName: z.string().min(1, { message: 'Förnamn krävs.' }),
  lastName: z.string().min(1, { message: 'Efternamn krävs.' }),
  email: z.string().email({ message: 'Ogiltig e-postadress.' }),
  bio: z.string().max(500, { message: 'Bio kan inte vara längre än 500 tecken.' }).optional(),
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
      })
    }
  }, [initialData, form])

  async function onSubmit(values: ProfileFormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include',
      })

      if (response.ok) {
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

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (valfritt)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Berätta lite om dig själv..."
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Sparar...' : 'Spara ändringar'}
        </Button>
      </form>
    </Form>
  )
}
