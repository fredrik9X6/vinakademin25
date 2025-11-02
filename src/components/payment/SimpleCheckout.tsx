'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { Loader2, CreditCard, ShieldCheck, Lock, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/stripe'
import type { Vinprovningar } from '@/payload-types'

interface SimpleCheckoutProps {
  course: Vinprovningar
  discountAmount?: number
  onError?: (error: string) => void
}

export function SimpleCheckout({ course, discountAmount = 0, onError }: SimpleCheckoutProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const finalPrice = (course.price || 0) - discountAmount

  const handleCheckout = async () => {
    if (!user) {
      setError('Du måste vara inloggad för att köpa vinprovningar')
      onError?.('Du måste vara inloggad för att köpa vinprovningar')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('Creating checkout session for course:', course.id)

      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          courseId: course.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      console.log('Checkout session created, redirecting to:', url)

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod vid betalning'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Price Display - Single, Prominent */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-800/30">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Totalt att betala</p>
            <div className="flex items-baseline gap-2">
              {discountAmount > 0 && (
                <span className="text-lg line-through text-muted-foreground">
                  {formatPrice(course.price || 0)}
                </span>
              )}
              <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {formatPrice(finalPrice)}
              </span>
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Du sparar {formatPrice(discountAmount)}!
              </p>
            )}
          </div>
          <Sparkles className="w-6 h-6 text-orange-500 opacity-60" />
        </div>
      </div>

      {/* Primary CTA Button */}
      <Button
        onClick={handleCheckout}
        disabled={isLoading || !user}
        className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Skapar betalning...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Köp nu för {formatPrice(finalPrice)}
          </>
        )}
      </Button>

      {/* Trust Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Säker betalning</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>30 dagars garanti</span>
        </div>
        <span className="text-border">•</span>
        <span>Klarna tillgängligt</span>
      </div>

      {/* Legal Text */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
        Du kommer att omdirigeras till Stripe för säker betalning. Genom att fortsätta godkänner
        du våra{' '}
        <a href="/villkor" className="underline hover:text-foreground transition-colors">
          användarvillkor
        </a>{' '}
        och{' '}
        <a href="/integritet" className="underline hover:text-foreground transition-colors">
          integritetspolicy
        </a>
        .
      </p>
    </div>
  )
}
