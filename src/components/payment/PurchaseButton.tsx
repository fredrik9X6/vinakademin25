'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/stripe'
import { CheckoutDialog } from './CheckoutDialog'
import { ShoppingCart, Lock } from 'lucide-react'
import type { Course } from '@/payload-types'

interface PurchaseButtonProps {
  course: Course
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  showIcon?: boolean
  fullWidth?: boolean
}

export function PurchaseButton({
  course,
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  fullWidth = false,
}: PurchaseButtonProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Don't render if course has no price
  if (!course.price || course.price <= 0) {
    return null
  }

  const handlePurchaseClick = () => {
    setIsCheckoutOpen(true)
  }

  return (
    <>
      <Button
        onClick={handlePurchaseClick}
        variant={variant}
        size={size}
        className={`
          ${fullWidth ? 'w-full' : ''}
          ${className}
          transition-all duration-200 hover:scale-105
        `}
      >
        {showIcon && <ShoppingCart className="w-4 h-4 mr-2" />}
        Köp vinprovning
      </Button>

      <CheckoutDialog
        course={course}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </>
  )
}

// Specialized variants for different contexts
interface CoursePurchasePanelProps {
  course: Course
  className?: string
}

export function CoursePurchasePanel({ course, className = '' }: CoursePurchasePanelProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsCheckoutOpen(true)}
        size="lg"
        className={`w-full text-lg font-semibold py-6 ${className}`}
      >
        Köp vinprovning - {formatPrice(course.price || 0)}
      </Button>

      <CheckoutDialog
        course={course}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </>
  )
}

// Compact purchase button for course cards
interface QuickPurchaseButtonProps {
  course: Course
  className?: string
}

export function QuickPurchaseButton({ course, className = '' }: QuickPurchaseButtonProps) {
  return (
    <PurchaseButton
      course={course}
      variant="outline"
      size="sm"
      className={className}
      showIcon={false}
    />
  )
}
