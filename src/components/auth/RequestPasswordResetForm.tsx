'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Define Zod schema for validation (Swedish messages)
const RequestPasswordResetSchema = z.object({
  email: z.string().email({ message: 'Ogiltig e-postadress.' }),
})

type RequestPasswordResetFormValues = z.infer<typeof RequestPasswordResetSchema>

interface RequestPasswordResetFormProps {
  onSuccess?: () => void
}

export function RequestPasswordResetForm({ onSuccess }: RequestPasswordResetFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<RequestPasswordResetFormValues>({
    resolver: zodResolver(RequestPasswordResetSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: RequestPasswordResetFormValues) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include',
      })

      if (response.ok) {
        setEmailSent(true)
        toast.success('E-post skickat', {
          description:
            'Kontrollera din inkorg för instruktioner om hur du återställer ditt lösenord.',
        })
        onSuccess?.()
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte skicka återställnings-e-post.'
        toast.error('Fel vid återställning', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Password reset request error:', error)
      toast.error('Återställningsfel', {
        description: 'Ett oväntat fel inträffade. Försök igen senare.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">E-post skickat</CardTitle>
          <CardDescription>
            Vi har skickat instruktioner för lösenordsåterställning till din e-post.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/logga-in" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka till inloggning
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Återställ lösenord</CardTitle>
        <CardDescription>
          Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input placeholder="namn@exempel.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Skickar...' : 'Skicka återställnings-e-post'}
            </Button>
            <Link href="/logga-in" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till inloggning
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
