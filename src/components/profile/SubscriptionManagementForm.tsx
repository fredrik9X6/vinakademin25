'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Crown, Check, X, Calendar, CreditCard, AlertTriangle } from 'lucide-react'

// Subscription types
interface Subscription {
  id: string
  plan: 'basic' | 'premium' | 'enterprise'
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  startDate: string
  endDate: string
  autoRenew: boolean
  paymentMethod?: {
    type: 'card' | 'paypal'
    last4?: string
    brand?: string
  }
  features: string[]
  price: {
    amount: number
    currency: string
    interval: 'month' | 'year'
  }
}

interface SubscriptionManagementFormProps {
  userId: string
  currentSubscription?: Subscription | null
  availablePlans?: Array<{
    id: string
    name: string
    price: { amount: number; currency: string; interval: 'month' | 'year' }
    features: string[]
    popular?: boolean
  }>
  onSubscriptionChange?: (newSubscription: Subscription) => void
}

const defaultPlans = [
  {
    id: 'basic',
    name: 'Basic',
    price: { amount: 99, currency: 'SEK', interval: 'month' as const },
    features: ['Tillgång till grundkurser', 'Månadsvis nyhetsbrev', 'Community-forum'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: { amount: 199, currency: 'SEK', interval: 'month' as const },
    features: [
      'Alla grundkurser',
      'Avancerade kurser',
      'Live vinprovningar',
      'Personliga rekommendationer',
      'Prioritetssupport',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { amount: 999, currency: 'SEK', interval: 'month' as const },
    features: [
      'Allt i Premium',
      'Företagsrabatter',
      'Skräddarsydda kurser',
      'Dedikerad support',
      'Team management',
    ],
  },
]

export function SubscriptionManagementForm({
  userId,
  currentSubscription,
  availablePlans = defaultPlans,
  onSubscriptionChange,
}: SubscriptionManagementFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  useEffect(() => {
    if (currentSubscription) {
      setSelectedPlan(currentSubscription.plan)
    }
  }, [currentSubscription])

  const formatPrice = (price: { amount: number; currency: string; interval: string }) => {
    return `${price.amount} ${price.currency}/${price.interval === 'month' ? 'månad' : 'år'}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv'
      case 'cancelled':
        return 'Avbruten'
      case 'expired':
        return 'Utgången'
      case 'pending':
        return 'Väntande'
      default:
        return status
    }
  }

  async function handlePlanChange(planId: string) {
    if (planId === currentSubscription?.plan) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/subscriptions/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
        credentials: 'include',
      })

      if (response.ok) {
        const updatedSubscription = await response.json()
        toast.success('Prenumeration uppdaterad', {
          description: 'Din prenumeration har ändrats.',
        })
        onSubscriptionChange?.(updatedSubscription)
        setSelectedPlan(planId)
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte uppdatera prenumerationen.'
        toast.error('Uppdatering misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Subscription update error:', error)
      toast.error('Prenumerationsfel', {
        description: 'Ett oväntat fel inträffade vid uppdatering av prenumerationen.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCancelSubscription() {
    if (!currentSubscription) return

    const confirmed = confirm('Är du säker på att du vill avbryta din prenumeration?')
    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/subscriptions/user/${userId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Prenumeration avbruten', {
          description: 'Din prenumeration har avbrutits och kommer inte att förnyas.',
        })
        // Update local state or trigger parent callback
        if (currentSubscription) {
          const cancelledSubscription = {
            ...currentSubscription,
            status: 'cancelled' as const,
            autoRenew: false,
          }
          onSubscriptionChange?.(cancelledSubscription)
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte avbryta prenumerationen.'
        toast.error('Avbokning misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Subscription cancellation error:', error)
      toast.error('Avbokningsfel', {
        description: 'Ett oväntat fel inträffade vid avbokning av prenumerationen.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReactivateSubscription() {
    if (!currentSubscription) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/subscriptions/user/${userId}/reactivate`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Prenumeration återaktiverad', {
          description: 'Din prenumeration har återaktiverats.',
        })
        // Update local state
        if (currentSubscription) {
          const reactivatedSubscription = {
            ...currentSubscription,
            status: 'active' as const,
            autoRenew: true,
          }
          onSubscriptionChange?.(reactivatedSubscription)
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte återaktivera prenumerationen.'
        toast.error('Återaktivering misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Subscription reactivation error:', error)
      toast.error('Återaktiveringsfel', {
        description: 'Ett oväntat fel inträffade vid återaktivering av prenumerationen.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5" />
              <span>Nuvarande prenumeration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg capitalize">{currentSubscription.plan}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(currentSubscription.price)}
                </p>
              </div>
              <Badge className={getStatusColor(currentSubscription.status)}>
                {getStatusText(currentSubscription.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Startdatum: {formatDate(currentSubscription.startDate)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Slutdatum: {formatDate(currentSubscription.endDate)}</span>
              </div>
              {currentSubscription.paymentMethod && (
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {currentSubscription.paymentMethod.brand} ****{' '}
                    {currentSubscription.paymentMethod.last4}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                {currentSubscription.autoRenew ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span>Autoförnyelse {currentSubscription.autoRenew ? 'på' : 'av'}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Inkluderade funktioner:</h4>
              <ul className="text-sm space-y-1">
                {currentSubscription.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex space-x-2">
              {currentSubscription.status === 'active' && (
                <Button variant="outline" onClick={handleCancelSubscription} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Avbryt prenumeration
                </Button>
              )}
              {currentSubscription.status === 'cancelled' && (
                <Button onClick={handleReactivateSubscription} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Återaktivera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Tillgängliga planer</CardTitle>
          <CardDescription>
            Välj den plan som passar dig bäst. Du kan när som helst ändra eller avbryta din
            prenumeration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''} ${
                  selectedPlan === plan.id ? 'bg-muted' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Populär</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-center">{plan.name}</CardTitle>
                  <div className="text-center">
                    <span className="text-3xl font-bold">{plan.price.amount}</span>
                    <span className="text-muted-foreground ml-1">
                      {plan.price.currency}/{plan.price.interval === 'month' ? 'mån' : 'år'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={selectedPlan === plan.id ? 'outline' : 'default'}
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={isLoading || selectedPlan === plan.id}
                  >
                    {isLoading && selectedPlan === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {selectedPlan === plan.id
                      ? 'Nuvarande plan'
                      : currentSubscription
                        ? 'Byt till denna plan'
                        : 'Välj denna plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Notice */}
      {currentSubscription?.status === 'cancelled' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Prenumeration avbruten</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Din prenumeration är avbruten och kommer att upphöra{' '}
                  {formatDate(currentSubscription.endDate)}. Du kommer att behålla tillgång till
                  alla funktioner fram till dess.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
