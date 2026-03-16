'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { Loader2, CreditCard, ShieldCheck, Lock } from 'lucide-react'
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
  const [guestEmail, setGuestEmail] = useState('')
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')

  const finalPrice = (course.price || 0) - discountAmount
  const guestCheckoutEnabled = process.env.NEXT_PUBLIC_ENABLE_GUEST_CHECKOUT === 'true'
  const canUseGuestCheckout = !user && guestCheckoutEnabled
  const hasValidGuestEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())

  const handleCheckout = async () => {
    if (!user && !guestCheckoutEnabled) {
      setError('Du måste vara inloggad för att köpa vinprovningar')
      onError?.('Du måste vara inloggad för att köpa vinprovningar')
      return
    }

    if (!user && !hasValidGuestEmail) {
      setError('Ange en giltig e-postadress för att fortsätta')
      onError?.('Ange en giltig e-postadress för att fortsätta')
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
          guestEmail: !user ? guestEmail.trim().toLowerCase() : undefined,
          guestFirstName: !user ? guestFirstName.trim() : undefined,
          guestLastName: !user ? guestLastName.trim() : undefined,
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

      {canUseGuestCheckout && (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Fortsätt utan konto</p>
          <p className="text-xs text-muted-foreground">
            Ange din e-post så skickar vi kvitto och instruktioner för att aktivera ditt konto efter köp.
          </p>
          <Input
            type="email"
            placeholder="E-postadress"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            disabled={isLoading}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              type="text"
              placeholder="Förnamn (valfritt)"
              value={guestFirstName}
              onChange={(e) => setGuestFirstName(e.target.value)}
              disabled={isLoading}
            />
            <Input
              type="text"
              placeholder="Efternamn (valfritt)"
              value={guestLastName}
              onChange={(e) => setGuestLastName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Price Display - Clean, Elegant */}
      <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Totalt att betala</p>
            <div className="flex items-baseline gap-2">
              {discountAmount > 0 && (
                <span className="text-lg line-through text-muted-foreground">
                  {formatPrice(course.price || 0)}
                </span>
              )}
              <span className="text-3xl font-bold text-foreground">
                {formatPrice(finalPrice)}
              </span>
            </div>
            {discountAmount > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                Du sparar {formatPrice(discountAmount)}!
              </p>
            )}
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Primary CTA Button */}
      <Button
        onClick={handleCheckout}
        disabled={
          isLoading ||
          (!user && !guestCheckoutEnabled) ||
          (!user && guestCheckoutEnabled && !hasValidGuestEmail)
        }
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
