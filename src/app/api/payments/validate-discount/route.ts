import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe'
import { getUser } from '@/lib/get-user'

// Mock discount codes for demonstration
// In production, these would be stored in Stripe or a database
const MOCK_DISCOUNT_CODES = [
  {
    code: 'WELCOME10',
    type: 'percentage' as const,
    value: 10,
    description: 'Välkomstrabatt 10%',
    valid: true,
    usageLimit: 1,
    expiresAt: '2024-12-31',
  },
  {
    code: 'SAVE50',
    type: 'fixed' as const,
    value: 50,
    description: 'Spara 50 kr',
    valid: true,
    usageLimit: 100,
    expiresAt: '2024-12-31',
  },
  {
    code: 'STUDENT20',
    type: 'percentage' as const,
    value: 20,
    description: 'Studentrabatt 20%',
    valid: true,
    usageLimit: 50,
    expiresAt: '2024-12-31',
  },
]

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att använda rabattkoder' },
        { status: 401 },
      )
    }

    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Rabattkod krävs' }, { status: 400 })
    }

    // Find the discount code
    const discountCode = MOCK_DISCOUNT_CODES.find(
      (dc) => dc.code.toUpperCase() === code.toUpperCase(),
    )

    if (!discountCode) {
      return NextResponse.json({
        valid: false,
        message: 'Ogiltig rabattkod',
      })
    }

    // Check if code is expired
    if (discountCode.expiresAt && new Date() > new Date(discountCode.expiresAt)) {
      return NextResponse.json({
        valid: false,
        message: 'Rabattkoden har utgått',
      })
    }

    // In a real implementation, you would check usage limits here
    // For now, we'll just return the discount code info

    return NextResponse.json({
      valid: true,
      code: discountCode.code,
      type: discountCode.type,
      value: discountCode.value,
      description: discountCode.description,
    })
  } catch (error) {
    console.error('Error validating discount code:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid validering av rabattkod' },
      { status: 500 },
    )
  }
}
