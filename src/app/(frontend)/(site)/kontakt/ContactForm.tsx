'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Send, CheckCircle } from 'lucide-react'

const contactFormSchema = z.object({
  name: z.string().min(2, 'Namn måste vara minst 2 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Välj ett ämne'),
  message: z.string().min(10, 'Meddelandet måste vara minst 10 tecken'),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

const subjects = [
  { value: 'course', label: 'Kursfrågor' },
  { value: 'tasting', label: 'Vinprovningar' },
  { value: 'corporate', label: 'Företag & Grupper' },
  { value: 'technical', label: 'Teknisk support' },
  { value: 'billing', label: 'Fakturafrågor' },
  { value: 'other', label: 'Övrigt' },
]

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
  })

  async function onSubmit(data: ContactFormValues) {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setIsSuccess(true)
      toast.success('Meddelande skickat!', {
        description: 'Vi återkommer inom 24 timmar.',
      })
      form.reset()

      // Reset success state after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000)
    } catch (error) {
      console.error('Error sending contact form:', error)
      toast.error('Kunde inte skicka meddelandet', {
        description: 'Försök igen eller kontakta oss direkt via e-post.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-950">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Tack för ditt meddelande!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Vi har tagit emot ditt meddelande och återkommer inom 24 timmar på vardagar.
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsSuccess(false)}>
            Skicka ett nytt meddelande
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name and Email Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Namn <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="För- och efternamn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      E-post <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="din@email.se" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone and Subject Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon (valfritt)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+46 70 123 45 67" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Om vi behöver ringa dig</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ämne <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj ett ämne" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.value} value={subject.value}>
                            {subject.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Meddelande <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beskriv ditt ärende så detaljerat som möjligt..."
                      className="min-h-[150px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Minimum 10 tecken. Ju mer detaljer, desto bättre kan vi hjälpa dig.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Skicka meddelande
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => form.reset()}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none"
              >
                Rensa formulär
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Genom att skicka formuläret godkänner du att vi behandlar dina uppgifter enligt vår{' '}
              <a href="/integritetspolicy" className="underline hover:text-foreground">
                integritetspolicy
              </a>
              .
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
