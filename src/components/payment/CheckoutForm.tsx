'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { DiscountCodeInput } from './DiscountCodeInput'
import { formatPrice, getStripe } from '@/lib/stripe'
import { useAuth } from '@/context/AuthContext'
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react'
import type { Course } from '@/payload-types'

interface CheckoutFormProps {
  course: Course
  onProcessing: (clientSecret: string) => void
  onSuccess: () => void
  onError: (error: string) => void
}

// Stripe Elements styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      backgroundColor: 'transparent',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true,
}

function CheckoutFormInner({ course, onProcessing, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'klarna'>('card')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string
    type: 'percentage' | 'fixed'
    value: number
    description: string
  } | null>(null)
  const paymentIntentRef = useRef<string>('')
  const isCreatingIntentRef = useRef(false)

  // Create payment intent only once when component mounts
  useEffect(() => {
    let isMounted = true

    const createPaymentIntent = async () => {
      if (isCreatingIntentRef.current || paymentIntentRef.current) {
        console.log('createPaymentIntent: Already creating or intent exists. Skipping.')
        return
      }

      isCreatingIntentRef.current = true

      try {
        console.log(
          'createPaymentIntent: Calling /api/payments/create-payment-intent for course:',
          course.id,
          'with method: card', // Always use card for initial payment intent
        )

        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            courseId: course.id,
            paymentMethod: 'card', // Always create card payment intent initially
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('createPaymentIntent: API response not OK:', response.status, errorData)
          throw new Error(errorData.error || 'Failed to create payment intent')
        }

        const { clientSecret } = await response.json()
        console.log('createPaymentIntent: Payment intent clientSecret received.')

        // Only update state if component is still mounted
        if (isMounted) {
          setClientSecret(clientSecret)
          paymentIntentRef.current = clientSecret
          setIsInitialized(true)
          console.log('createPaymentIntent: State updated: clientSecret set, isInitialized true.')
        }
      } catch (err) {
        console.error('createPaymentIntent: Error creating payment intent:', err)
        if (isMounted) {
          onError(err instanceof Error ? err.message : 'Ett fel uppstod vid skapande av betalning')
        }
      } finally {
        isCreatingIntentRef.current = false
        console.log('createPaymentIntent: isCreatingIntentRef set to false.')
      }
    }

    if (course.id && user && !isInitialized && !paymentIntentRef.current) {
      console.log('useEffect: Conditions met to call createPaymentIntent.')
      createPaymentIntent()
    } else {
      console.log(
        'useEffect: Conditions NOT met to call createPaymentIntent. course.id:',
        !!course.id,
        'user:',
        !!user,
        'isInitialized:',
        isInitialized,
        'paymentIntentRef.current:',
        !!paymentIntentRef.current,
      )
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false
      console.log('useEffect cleanup: isMounted set to false.')
    }
  }, [course.id, user, isInitialized, onError]) // Removed paymentMethod dependency

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()

      if (!stripe || !elements) {
        onError('Stripe har inte laddats korrekt. Försök ladda om sidan.')
        return
      }

      if (!clientSecret) {
        onError('Betalningsintent har inte skapats. Försök ladda om sidan.')
        return
      }

      setIsProcessing(true)
      setError('')
      onProcessing(clientSecret)

      try {
        console.log('Processing payment with method:', paymentMethod)

        if (paymentMethod === 'card') {
          await handleCardPayment()
        } else if (paymentMethod === 'klarna') {
          await handleKlarnaPayment()
        }
      } catch (err) {
        console.error('Payment error:', err)
        setIsProcessing(false)
        onError(err instanceof Error ? err.message : 'Ett fel uppstod vid betalning')
      }
    },
    [stripe, elements, clientSecret, paymentMethod, onProcessing, onError],
  )

  const handleCardPayment = useCallback(async () => {
    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      throw new Error('Kort-element hittades inte')
    }

    console.log('Confirming card payment...')

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          email: user?.email || '',
        },
      },
    })

    setIsProcessing(false)

    if (error) {
      console.error('Card payment error:', error)
      throw new Error(error.message || 'Kortbetalning misslyckades')
    }

    console.log('Card payment successful:', paymentIntent.status)

    if (paymentIntent.status === 'succeeded') {
      onSuccess()
    } else {
      throw new Error('Betalning kunde inte slutföras')
    }
  }, [stripe, elements, clientSecret, user, onSuccess])

  const handleKlarnaPayment = useCallback(async () => {
    if (!stripe) return

    console.log('Creating Klarna payment intent...')

    // For Klarna, we need to create a new payment intent with Klarna configuration
    try {
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          courseId: course.id,
          paymentMethod: 'klarna',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create Klarna payment intent')
      }

      const { clientSecret: klarnaClientSecret } = await response.json()
      console.log('Klarna payment intent created')

      const { error } = await stripe.confirmKlarnaPayment(klarnaClientSecret, {
        payment_method: {
          billing_details: {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
            email: user?.email || '',
            address: {
              country: 'SE', // Sweden
            },
          },
        },
        return_url: `${window.location.origin}/checkout/success`,
      })

      setIsProcessing(false)

      if (error) {
        console.error('Klarna payment error:', error)
        throw new Error(error.message || 'Klarna-betalning misslyckades')
      }

      console.log('Klarna payment initiated successfully')
      // For Klarna, the user will be redirected and then return
      // The payment status will be handled by the webhook
    } catch (err) {
      setIsProcessing(false)
      throw err
    }
  }, [stripe, course.id, user])

  const handlePaymentMethodChange = useCallback((method: 'card' | 'klarna') => {
    console.log('Payment method changed to:', method)
    setPaymentMethod(method)
    setError('') // Clear any previous errors when switching methods
  }, [])

  const handleDiscountApplied = useCallback(
    (discount: {
      code: string
      type: 'percentage' | 'fixed'
      value: number
      description: string
    }) => {
      setAppliedDiscount(discount)
      setError('') // Clear any previous errors when applying discount
    },
    [],
  )

  const handleDiscountRemoved = useCallback(() => {
    setAppliedDiscount(null)
  }, [])

  // Memoize the form to prevent unnecessary re-renders
  const paymentForm = useMemo(
    () => (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Välj betalmetod</Label>
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={handlePaymentMethodChange}
          />
        </div>

        <Separator />

        {/* Discount Code */}
        <DiscountCodeInput
          onDiscountApplied={handleDiscountApplied}
          onDiscountRemoved={handleDiscountRemoved}
          disabled={isProcessing}
        />

        <Separator />

        {/* Payment Details */}
        {paymentMethod === 'card' && (
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Kortuppgifter
            </Label>

            <div className="border rounded-lg p-4 bg-background">
              <CardElement options={cardElementOptions} />
            </div>

            <p className="text-sm text-muted-foreground">
              Vi accepterar Visa, Mastercard och American Express. Dina kortuppgifter är säkert
              krypterade.
            </p>
          </div>
        )}

        {paymentMethod === 'klarna' && (
          <div className="space-y-4">
            <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <h3 className="font-medium">Klarna</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Betala direkt, efter 30 dagar eller dela upp betalningen. Du kommer att omdirigeras
                till Klarna för att slutföra köpet.
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
          <div className="flex items-center text-green-800 dark:text-green-200 mb-2">
            <ShieldCheck className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">Säker betalning</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300">
            Din betalning behandlas säkert av Stripe med SSL-kryptering. Vi sparar aldrig dina
            kortuppgifter.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret || !isInitialized}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Behandlar...
            </>
          ) : (
            <>Betala {formatPrice(course.price || 0)}</>
          )}
        </Button>

        {/* Debug information - remove this after fixing the issue */}
        <div className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 p-2 rounded">
          <div>
            Debug: stripe={!!stripe}, isProcessing={isProcessing}, clientSecret={!!clientSecret},
            isInitialized={isInitialized}
          </div>
          <div>
            Button disabled:{' '}
            {(!stripe || isProcessing || !clientSecret || !isInitialized).toString()}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Genom att klicka på "Betala" godkänner du våra{' '}
          <a href="/villkor" className="underline hover:no-underline">
            användarvillkor
          </a>{' '}
          och{' '}
          <a href="/integritet" className="underline hover:no-underline">
            integritetspolicy
          </a>
          .
        </p>
      </form>
    ),
    [
      handleSubmit,
      paymentMethod,
      handlePaymentMethodChange,
      error,
      stripe,
      isProcessing,
      clientSecret,
      isInitialized,
      course.price,
    ],
  )

  return paymentForm
}

// Main component that wraps with Elements provider
export function CheckoutForm(props: CheckoutFormProps) {
  // Create a stable Stripe promise that doesn't change on re-renders
  const stripePromise = useMemo(() => getStripe(), [])

  // Create a stable key to prevent Elements from being recreated
  const elementsKey = useMemo(() => `checkout-${props.course.id}`, [props.course.id])

  return (
    <Elements stripe={stripePromise} key={elementsKey}>
      <CheckoutFormInner {...props} />
    </Elements>
  )
}
