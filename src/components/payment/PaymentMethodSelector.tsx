import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'

interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'klarna'
  onMethodChange: (method: 'card' | 'klarna') => void
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Card Payment */}
      <Button
        type="button"
        variant={selectedMethod === 'card' ? 'default' : 'outline'}
        className="h-auto p-4 flex-col space-y-2"
        onClick={() => onMethodChange('card')}
      >
        <CreditCard className="w-6 h-6" />
        <div className="space-y-1 text-center">
          <div className="font-medium">Kort</div>
          <div className="text-xs text-muted-foreground">Visa, Mastercard, Amex</div>
        </div>
      </Button>

      {/* Klarna Payment */}
      <Button
        type="button"
        variant={selectedMethod === 'klarna' ? 'default' : 'outline'}
        className="h-auto p-4 flex-col space-y-2"
        onClick={() => onMethodChange('klarna')}
      >
        <div className="w-6 h-6 bg-pink-500 rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">K</span>
        </div>
        <div className="space-y-1 text-center">
          <div className="font-medium">Klarna</div>
          <div className="text-xs text-muted-foreground">Betala senare eller dela upp</div>
        </div>
      </Button>
    </div>
  )
}
