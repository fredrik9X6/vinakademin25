'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Loader2,
  Download,
  CreditCard,
  Calendar,
  Receipt,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'

interface PaymentHistoryProps {
  userId: string
}

interface Order {
  id: string
  orderNumber: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  amount: number
  currency: string
  items: Array<{
    course: {
      id: string
      title: string
    }
    price: number
    quantity: number
  }>
  createdAt: string
  paidAt?: string
  invoiceUrl?: string
  receiptUrl?: string
}

interface Invoice {
  id: string
  number: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void'
  createdAt: string
  dueDate?: string
  paidAt?: string
  downloadUrl?: string
}

export function PaymentHistory({ userId }: PaymentHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders')

  useEffect(() => {
    fetchPaymentHistory()
  }, [userId])

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true)

      // Fetch orders
      const ordersResponse = await fetch(`/api/orders/user/${userId}`, {
        credentials: 'include',
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setOrders(ordersData.orders || [])
      }

      // Fetch invoices
      const invoicesResponse = await fetch(`/api/invoices/user/${userId}`, {
        credentials: 'include',
      })

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setInvoices(invoicesData.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast.error('Kunde inte hämta betalningshistorik')
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount) // Amount is already in major currency unit (SEK)
  }

  const handleDownloadReceipt = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/receipt`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.receiptUrl) {
          // Open Stripe receipt in new tab
          window.open(data.receiptUrl, '_blank', 'noopener,noreferrer')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Kunde inte hämta kvitto')
      }
    } catch (error) {
      console.error('Error fetching receipt:', error)
      toast.error('Ett fel uppstod vid hämtning av kvitto')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
      case 'void':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Slutförd'
      case 'pending':
        return 'Väntande'
      case 'processing':
        return 'Behandlas'
      case 'failed':
        return 'Misslyckades'
      case 'cancelled':
        return 'Avbruten'
      case 'refunded':
        return 'Återbetald'
      case 'paid':
        return 'Betald'
      case 'open':
        return 'Öppen'
      case 'void':
        return 'Void'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
      case 'void':
        return <XCircle className="h-4 w-4" />
      case 'pending':
      case 'open':
      case 'processing':
        return <Clock className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`, {
        credentials: 'include',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast.error('Kunde inte ladda ner fakturan')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Ett fel uppstod vid nedladdning')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betalningshistorik</CardTitle>
          <CardDescription>Dina ordrar och fakturor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Laddar betalningshistorik...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betalningshistorik</CardTitle>
        <CardDescription>Dina ordrar och fakturor</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('orders')}
          >
            Ordrar ({orders.length})
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('invoices')}
          >
            Fakturor ({invoices.length})
          </Button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Inga ordrar hittades</p>
              </div>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Order #{order.orderNumber}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{getStatusText(order.status)}</span>
                        </Badge>
                        <span className="font-semibold">
                          {formatPrice(order.amount, order.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.course.title}</span>
                          <span>{formatPrice(item.price * item.quantity, order.currency)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {order.paidAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Betald: {formatDate(order.paidAt)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.invoiceUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" />
                              Faktura
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(order.id)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Kvitto
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Inga fakturor hittades</p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <Card key={invoice.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Faktura #{invoice.number}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">{getStatusText(invoice.status)}</span>
                        </Badge>
                        <span className="font-semibold">
                          {formatPrice(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {invoice.dueDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Förfaller: {formatDate(invoice.dueDate)}</span>
                          </div>
                        )}
                        {invoice.paidAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>Betald: {formatDate(invoice.paidAt)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {invoice.downloadUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={invoice.downloadUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Visa
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Ladda ner
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
