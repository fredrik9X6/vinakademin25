'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// Define Zod schema for validation (Swedish messages)
const LoginSchema = z.object({
  email: z.string().email({ message: 'Ogiltig e-postadress.' }),
  password: z.string().min(1, { message: 'Lösenord krävs.' }),
})

type LoginFormValues = z.infer<typeof LoginSchema>

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  returnTo?: string
}

export function LoginForm({ className, returnTo, ...props }: LoginFormProps) {
  const { loginUser, isLoading } = useAuth()
  const router = useRouter()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    const success = await loginUser(values)
    if (success) {
      // Redirect to the return URL if provided, otherwise go to dashboard
      const redirectTo = returnTo ? decodeURIComponent(returnTo) : '/profil'
      router.push(redirectTo)
    }
    // Error handling is done via toasts in AuthContext
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Välkommen tillbaka</CardTitle>
          <CardDescription>Logga in med ditt Apple eller Google konto</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <div className="flex flex-col gap-4">
                
                
              </div>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  Eller fortsätt med e-post
                </span>
              </div>
              <div className="grid gap-6">
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
                          placeholder="m@example.com"
                          disabled={isLoading}
                          {...field}
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
                      <div className="flex items-center">
                        <FormLabel htmlFor="password">Lösenord</FormLabel>
                        <a
                          href="/glomt-losenord"
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                          Glömt ditt lösenord?
                        </a>
                      </div>
                      <FormControl>
                        <Input id="password" type="password" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant={'default'} type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isLoading ? 'Loggar in...' : 'Logga in'}
                </Button>
              </div>
              <div className="text-center text-sm">
                Har du inget konto?{' '}
                <a
                  href={
                    returnTo ? `/registrera?from=${encodeURIComponent(returnTo)}` : '/registrera'
                  }
                  className="underline underline-offset-4"
                >
                  Skapa ett konto
                </a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        Genom att fortsätta, godkänner du våra <a href="/villkor">villkor</a> och{' '}
        <a href="/integritetspolicy">integritetspolicy</a>.
      </div>
    </div>
  )
}
