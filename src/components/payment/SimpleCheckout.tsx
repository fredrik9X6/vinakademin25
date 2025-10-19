'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { Loader2, CreditCard } from 'lucide-react'
import { formatPrice } from '@/lib/stripe'
import type { Course } from '@/payload-types'

interface SimpleCheckoutProps {
  course: Course
  onError?: (error: string) => void
}

export function SimpleCheckout({ course, onError }: SimpleCheckoutProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleCheckout = async () => {
    if (!user) {
      setError('Du måste vara inloggad för att köpa kurser')
      onError?.('Du måste vara inloggad för att köpa kurser')
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

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4">
        <div className="flex items-start sm:items-center justify-between mb-2 gap-2">
          <span className="font-medium text-sm sm:text-base leading-tight">{course.title}</span>
          <span className="font-bold text-lg sm:text-xl text-orange-500 whitespace-nowrap">
            {formatPrice(course.price || 0)}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Engångsbetalning • Livstidsåtkomst • 30 dagars pengarna-tillbaka-garanti
        </p>
      </div>

      <Button onClick={handleCheckout} disabled={isLoading || !user} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Skapar betalning...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Köp nu för {formatPrice(course.price || 0)}
          </>
        )}
      </Button>

      <div className="text-center space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center">🔒 Säker betalning</span>
          <span className="flex items-center">💳 Alla kort accepteras</span>
          <span className="flex items-center">📱 Klarna tillgängligt</span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed px-2 sm:px-0">
          Du kommer att omdirigeras till Stripe för säker betalning. Genom att fortsätta godkänner
          du våra{' '}
          <a href="/villkor" className="underline hover:no-underline">
            användarvillkor
          </a>{' '}
          och{' '}
          <a href="/integritet" className="underline hover:no-underline">
            integritetspolicy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
