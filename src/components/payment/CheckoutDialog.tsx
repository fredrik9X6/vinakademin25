'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SimpleCheckout } from './SimpleCheckout'
import { OrderSummary } from './OrderSummary'
import { PaymentStatus } from './PaymentStatus'

import { useAuth } from '@/context/AuthContext'
import { usePathname } from 'next/navigation'
import type { Course } from '@/payload-types'

interface CheckoutDialogProps {
  course: Course
  isOpen: boolean
  onClose: () => void
}

type CheckoutStep = 'checkout' | 'processing' | 'success' | 'error'

export function CheckoutDialog({ course, isOpen, onClose }: CheckoutDialogProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('checkout')
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const pathname = usePathname()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('checkout')
      setPaymentIntentId(null)
      setError(null)
    }
  }, [isOpen])

  // Check if user is logged in
  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Logga in för att köpa</DialogTitle>
          </DialogHeader>
          <div className="py-4 sm:py-6">
            <Alert>
              <AlertDescription>
                Du måste vara inloggad för att köpa vinprovningar. Logga in eller skapa ett konto för att
                fortsätta.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button asChild className="flex-1">
                <a href={`/logga-in?from=${encodeURIComponent(pathname)}`}>Logga in</a>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <a href={`/registrera?from=${encodeURIComponent(pathname)}`}>Skapa konto</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Payment processing handled by Stripe Checkout redirect

  // Payment success handled by redirect to success page

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    setCurrentStep('error')
  }

  const getDialogTitle = () => {
    switch (currentStep) {
      case 'checkout':
        return 'Köp vinprovning'
      case 'processing':
        return 'Behandlar betalning...'
      case 'success':
        return 'Köp genomfört!'
      case 'error':
        return 'Ett fel uppstod'
      default:
        return 'Checkout'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-2 sm:py-4">
          {currentStep === 'checkout' && (
            <div className="space-y-6">
              <OrderSummary course={course} />
              <SimpleCheckout course={course} onError={handlePaymentError} />
            </div>
          )}

          {(currentStep === 'processing' ||
            currentStep === 'success' ||
            currentStep === 'error') && (
            <PaymentStatus
              status={currentStep}
              course={course}
              error={error}
              onClose={onClose}
              onRetry={() => setCurrentStep('checkout')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
