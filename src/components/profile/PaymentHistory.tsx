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
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
      case 'pending':
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50'
      case 'failed':
      case 'void':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
      case 'cancelled':
      case 'refunded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
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
        {/* Tab Navigation - Mobile Optimized */}
        <div className="flex gap-2 mb-6 w-full">
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('orders')}
            className="flex-1 sm:flex-none"
          >
            <Receipt className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Ordrar</span>
            <span className="sm:hidden">Ordrar</span>
            <span className="ml-1">({orders.length})</span>
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('invoices')}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Fakturor</span>
            <span className="sm:hidden">Fakturor</span>
            <span className="ml-1">({invoices.length})</span>
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
                    {/* Header Section - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">
                            {order.items[0]?.course.title || `Order #${order.orderNumber}`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Status and Amount - Stacked on Mobile */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
                        <Badge className={`${getStatusColor(order.status)} flex-shrink-0`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{getStatusText(order.status)}</span>
                        </Badge>
                        <span className="font-bold text-lg sm:text-base">
                          {formatPrice(order.amount, order.currency)}
                        </span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Footer Section - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {order.paidAt && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">Betald: {formatDate(order.paidAt)}</span>
                        </div>
                      )}

                      {/* Action Buttons - Full Width on Mobile */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {order.invoiceUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 sm:flex-none"
                          >
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
                          className="flex-1 sm:flex-none"
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
                    {/* Header Section - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Receipt className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate">Faktura #{invoice.number}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(invoice.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Status and Amount - Stacked on Mobile */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                        <Badge className={`${getStatusColor(invoice.status)} flex-shrink-0`}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">{getStatusText(invoice.status)}</span>
                        </Badge>
                        <span className="font-bold text-lg sm:text-base">
                          {formatPrice(invoice.amount, invoice.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Dates Section - Stacked on Mobile */}
                    {(invoice.dueDate || invoice.paidAt) && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 bg-muted/30 rounded-lg p-3">
                        {invoice.dueDate && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              Förfaller: {formatDate(invoice.dueDate)}
                            </span>
                          </div>
                        )}
                        {invoice.paidAt && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">Betald: {formatDate(invoice.paidAt)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons - Full Width on Mobile */}
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                      {invoice.downloadUrl && (
                        <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
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
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Ladda ner
                      </Button>
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
