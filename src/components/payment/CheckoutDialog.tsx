'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SimpleCheckout } from './SimpleCheckout'
import { OrderSummary } from './OrderSummary'
import { PaymentStatus } from './PaymentStatus'

import { useAuth } from '@/context/AuthContext'
import type { Vinprovningar } from '@/payload-types'

interface CheckoutDialogProps {
  course: Vinprovningar
  isOpen: boolean
  onClose: () => void
}

type CheckoutStep = 'checkout' | 'processing' | 'success' | 'error'

export function CheckoutDialog({ course, isOpen, onClose }: CheckoutDialogProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('checkout')
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('checkout')
      setError(null)
    }
  }, [isOpen])

  // Payment processing handled by Stripe Checkout redirect

  // Payment success handled by redirect to success page

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    setCurrentStep('error')
  }

  const getDialogTitle = () => {
    switch (currentStep) {
      case 'checkout':
        return user ? 'Köp vinprovning' : 'Köp vinprovning utan konto'
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
