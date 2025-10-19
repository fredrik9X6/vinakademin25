'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Define Zod schema for validation (Swedish messages)
const RegistrationSchema = z
  .object({
    firstName: z.string().min(1, { message: 'Förnamn krävs.' }),
    lastName: z.string().min(1, { message: 'Efternamn krävs.' }),
    email: z.string().email({ message: 'Ogiltig e-postadress.' }),
    password: z.string().min(8, { message: 'Lösenordet måste vara minst 8 tecken.' }),
    confirmPassword: z.string().min(1, { message: 'Bekräfta lösenord krävs.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Lösenorden matchar inte.',
    path: ['confirmPassword'],
  })

export type RegistrationFormValues = z.infer<typeof RegistrationSchema>

interface RegistrationFormProps extends React.ComponentPropsWithoutRef<'div'> {
  returnTo?: string
}

export function RegistrationForm({ className, returnTo, ...props }: RegistrationFormProps) {
  const { registerUser, isLoading } = useAuth()
  const router = useRouter()

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(RegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: RegistrationFormValues) {
    // Transform the form data to match the expected API structure
    const userData = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    }

    const success = await registerUser(userData)
    if (success) {
      // Show success message and redirect to email verification, passing along returnTo
      const verificationUrl = returnTo
        ? `/verifiera-epost-meddelande?from=${encodeURIComponent(returnTo)}`
        : '/verifiera-epost-meddelande'
      router.push(verificationUrl)
    }
    // Error handling is done via toasts in AuthContext
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Skapa ditt konto</CardTitle>
          <CardDescription>Fyll i uppgifterna nedan för att komma igång</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel htmlFor="firstName">Förnamn</FormLabel>
                        <FormControl>
                          <Input
                            id="firstName"
                            placeholder="Anna"
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
                    name="lastName"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel htmlFor="lastName">Efternamn</FormLabel>
                        <FormControl>
                          <Input
                            id="lastName"
                            placeholder="Andersson"
                            {...field}
                            disabled={isLoading}
                          />
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
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="email">E-post</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="password">Lösenord</FormLabel>
                      <FormControl>
                        <Input id="password" type="password" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="confirmPassword">Bekräfta lösenord</FormLabel>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant={'default'} type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isLoading ? 'Skapar konto...' : 'Skapa konto'}
                </Button>
              </div>
              <div className="text-center text-sm">
                Har du redan ett konto?{' '}
                <a
                  href={returnTo ? `/logga-in?from=${encodeURIComponent(returnTo)}` : '/logga-in'}
                  className="underline underline-offset-4"
                >
                  Logga in här
                </a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        Genom att fortsätta, godkänner du våra <a href="/villkor">villkor</a> och{' '}
        <a href="/integritetspolicy">integritetspolicy</a>.
      </div>
    </div>
  )
}
