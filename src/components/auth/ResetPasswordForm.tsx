'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'

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
const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Lösenordet måste vara minst 8 tecken.' }),
    confirmPassword: z.string().min(1, { message: 'Bekräfta lösenord krävs.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Lösenorden matchar inte.',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>

interface ResetPasswordFormProps {
  token: string
  onSuccess?: () => void
}

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
        credentials: 'include',
      })

      if (response.ok) {
        setIsSuccess(true)
        toast.success('Lösenord återställt', {
          description: 'Ditt lösenord har uppdaterats. Du kan nu logga in med ditt nya lösenord.',
        })
        onSuccess?.()

        // Redirect to login after success
        setTimeout(() => {
          router.push('/logga-in')
        }, 2000)
      } else {
        const errorData = await response.json()
        let errorMessage = 'Kunde inte återställa lösenordet.'

        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map((e: any) => e.message).join(', ')
        } else if (errorData.message) {
          errorMessage = errorData.message
        }

        toast.error('Återställning misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error('Återställningsfel', {
        description: 'Ett oväntat fel inträffade. Försök igen senare.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Lösenord återställt</CardTitle>
          <CardDescription>
            Ditt lösenord har uppdaterats. Du omdirigeras till inloggningssidan.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/logga-in" className="w-full">
            <Button className="w-full">Gå till inloggning</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Återställ lösenord</CardTitle>
        <CardDescription>Ange ditt nya lösenord nedan.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nytt lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Ange ditt nya lösenord"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bekräfta lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Bekräfta ditt nya lösenord"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Återställer...' : 'Återställ lösenord'}
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
