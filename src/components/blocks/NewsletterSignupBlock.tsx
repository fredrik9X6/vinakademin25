'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { Mail, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface NewsletterSignupBlockProps {
  title?: string
  description?: string
  buttonText?: string
  placeholderText?: string
  style?: 'minimal' | 'featured' | 'inline' | 'swedish'
  backgroundColor?: 'default' | 'orange' | 'blue' | 'green' | 'transparent'
  showIcon?: boolean
  disclaimer?: string
}

export function NewsletterSignupBlock({
  title = 'Stay Updated with Wine Knowledge',
  description = 'Get weekly insights about wine, exclusive tasting notes, and expert recommendations delivered straight to your inbox.',
  buttonText = 'Subscribe Now',
  placeholderText = 'Ange din e-postadress',
  style = 'featured',
  backgroundColor = 'orange',
  showIcon = true,
  disclaimer = 'We respect your privacy. Unsubscribe at any time.',
}: NewsletterSignupBlockProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast.error('Ange en giltig e-postadress')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Något gick fel')
      }

      setIsSubscribed(true)
      toast.success('Välkommen till vårt nyhetsbrev! Kolla din inkorg.')
      setEmail('')
    } catch (error) {
      console.error('Newsletter subscription error:', error)
      toast.error(error instanceof Error ? error.message : 'Något gick fel. Försök igen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Color theme classes
  const getBackgroundClasses = () => {
    switch (backgroundColor) {
      case 'orange':
        return 'bg-accent border-border'
      case 'blue':
        return 'bg-accent border-border'
      case 'green':
        return 'bg-accent border-border'
      case 'transparent':
        return 'bg-transparent border-border'
      default:
        return 'bg-accent border-border'
    }
  }

  const getButtonClasses = () => {
    switch (backgroundColor) {
      case 'transparent':
        return 'bg-primary text-primary-foreground hover:bg-primary/90'
      default:
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    }
  }

  // Inline style variant
  if (style === 'inline') {
    return (
      <div className="my-8 p-6 bg-secondary text-secondary-foreground rounded-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              {showIcon && <Mail className="h-5 w-5" />}
              <h3 className="text-lg font-medium">{title}</h3>
            </div>
            <p className="opacity-90 text-sm">{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 min-w-80">
            <Input
              type="email"
              placeholder={placeholderText}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background text-foreground border border-border dark:border-gray-600 placeholder:text-muted-foreground"
              disabled={isSubmitting || isSubscribed}
            />
            <Button
              type="submit"
              disabled={isSubmitting || isSubscribed}
              className="font-medium px-6"
              variant="secondary"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubscribed ? (
                <Check className="h-4 w-4" />
              ) : (
                buttonText
              )}
            </Button>
          </form>
        </div>

        {disclaimer && (
          <p className="opacity-80 text-xs mt-3 text-center md:text-left">{disclaimer}</p>
        )}
      </div>
    )
  }

  // Swedish style variant
  if (style === 'swedish') {
    return (
      <div className="my-8 max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title || 'Prenumerera på vårt nyhetsbrev'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-0 border border-orange-300 rounded-lg overflow-hidden max-w-md">
            <Input
              type="email"
              placeholder={placeholderText || 'Din email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border-0 focus:ring-0 focus:border-0 bg-white dark:bg-gray-800 rounded-none"
              disabled={isSubmitting || isSubscribed}
            />

            <Button
              type="submit"
              disabled={isSubmitting || isSubscribed}
              className="bg-orange-400 hover:bg-orange-500 text-white font-medium px-6 border-0 rounded-none"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubscribed ? (
                <Check className="h-4 w-4" />
              ) : (
                buttonText || 'Prenumerera'
              )}
            </Button>
          </div>
        </form>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 max-w-md">
          {disclaimer ||
            'Genom att prenumerera godkänner du att Vinakademin hanterar dina personuppgifter.'}
        </p>
      </div>
    )
  }

  // Minimal style variant
  if (style === 'minimal') {
    return (
      <div className="my-8 p-6 border border-border rounded-lg bg-accent">
        <div className="text-center max-w-md mx-auto">
          {showIcon && (
            <div className="flex justify-center mb-3">
              <Mail className="h-6 w-6 text-secondary" />
            </div>
          )}

          <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>

          <p className="text-muted-foreground text-sm mb-4">{description}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder={placeholderText}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background text-foreground border border-border dark:border-gray-600 placeholder:text-muted-foreground"
              disabled={isSubmitting || isSubscribed}
            />

            <Button
              type="submit"
              disabled={isSubmitting || isSubscribed}
              className={`w-full`}
              variant="secondary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Subscribing...
                </>
              ) : isSubscribed ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Subscribed!
                </>
              ) : (
                buttonText
              )}
            </Button>
          </form>

          {disclaimer && <p className="text-muted-foreground text-xs mt-3">{disclaimer}</p>}
        </div>
      </div>
    )
  }

  // Featured style variant (default)
  return (
    <Card className={`my-8 ${getBackgroundClasses()}`}>
      <CardContent className="p-8">
        <div className="text-center max-w-lg mx-auto">
          {showIcon && (
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-background rounded-full shadow-sm border border-border">
                <Mail className="h-8 w-8 text-secondary" />
              </div>
            </div>
          )}

          <h3 className="text-2xl font-medium text-foreground mb-3">{title}</h3>

          <p className="text-muted-foreground mb-6 leading-relaxed">{description}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder={placeholderText}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-background text-foreground border border-border dark:border-gray-600 placeholder:text-muted-foreground"
                disabled={isSubmitting || isSubscribed}
              />

              <Button
                type="submit"
                disabled={isSubmitting || isSubscribed}
                className={`px-8 font-medium`}
                variant="secondary"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Subscribing...
                  </>
                ) : isSubscribed ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Subscribed!
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </div>
          </form>

          {disclaimer && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">{disclaimer}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
