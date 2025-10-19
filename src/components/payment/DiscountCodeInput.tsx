'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, Tag } from 'lucide-react'

interface DiscountCodeInputProps {
  onDiscountApplied: (discount: {
    code: string
    type: 'percentage' | 'fixed'
    value: number
    description: string
  }) => void
  onDiscountRemoved: () => void
  disabled?: boolean
}

interface DiscountCode {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  valid: boolean
}

export function DiscountCodeInput({
  onDiscountApplied,
  onDiscountRemoved,
  disabled = false,
}: DiscountCodeInputProps) {
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null)

  const validateDiscountCode = async (discountCode: string) => {
    if (!discountCode.trim()) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/payments/validate-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: discountCode }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        const discount: DiscountCode = {
          code: discountCode,
          type: data.type,
          value: data.value,
          description: data.description,
          valid: true,
        }

        setAppliedDiscount(discount)
        onDiscountApplied(discount)
        toast.success('Rabattkod tillämpad', {
          description: `${data.description} - ${data.type === 'percentage' ? `${data.value}%` : `${data.value} kr`} rabatt`,
        })
      } else {
        toast.error('Ogiltig rabattkod', {
          description: data.message || 'Koden kunde inte valideras',
        })
      }
    } catch (error) {
      console.error('Error validating discount code:', error)
      toast.error('Ett fel uppstod', {
        description: 'Kunde inte validera rabattkoden',
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmit = () => {
    if (code.trim() && !disabled) {
      validateDiscountCode(code.trim())
    }
  }

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null)
    setCode('')
    onDiscountRemoved()
    toast.success('Rabattkod borttagen')
  }

  const formatDiscountValue = (discount: DiscountCode) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`
    } else {
      return `${discount.value} kr`
    }
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium flex items-center">
        <Tag className="w-4 h-4 mr-2" />
        Rabattkod
      </Label>

      {appliedDiscount ? (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  {appliedDiscount.code}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {appliedDiscount.description} - {formatDiscountValue(appliedDiscount)} rabatt
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRemoveDiscount} disabled={disabled}>
              <XCircle className="h-4 w-4 mr-1" />
              Ta bort
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ange rabattkod"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={disabled || isValidating}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!code.trim() || disabled || isValidating}
            size="sm"
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Använd'}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Har du en rabattkod? Ange den här för att få rabatt på din beställning.
      </p>
    </div>
  )
}
