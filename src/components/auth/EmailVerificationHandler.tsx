'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface EmailVerificationHandlerProps {
  token: string
}

export function EmailVerificationHandler({ token }: EmailVerificationHandlerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setError('Ingen verifieringstoken angiven.') // Swedish
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      try {
        // Make the actual API call to Payload's verification endpoint
        const response = await fetch(`/api/users/verify/${token}`, {
          method: 'POST',
          headers: {
            // No Content-Type needed for POST without body usually
            // Add Authorization header if required by your setup, though unlikely for verify
          },
          // No body needed for this specific Payload endpoint
        })

        const data = await response.json()

        if (response.ok) {
          // Verification successful
          setSuccessMessage('E-post verifierad! Du kan nu logga in.')
          toast.success('E-post verifierad', {
            description: 'Ditt konto har aktiverats. Du kan nu logga in.',
          })

          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/logga-in')
          }, 2000)
        } else {
          // Verification failed
          const errorMessage = data.message || 'Verifieringen misslyckades.'
          setError(errorMessage)
          toast.error('Verifieringen misslyckades', {
            description: errorMessage,
          })
        }
      } catch (err) {
        console.error('Email verification error:', err)
        const errorMessage = 'Ett oväntat fel inträffade vid verifiering.'
        setError(errorMessage)
        toast.error('Verifieringsfel', {
          description: errorMessage,
        })
      } finally {
        setIsLoading(false)
      }
    }

    handleVerification()
  }, [token, router])

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">E-postverifiering</CardTitle>
        <CardDescription>Verifierar din e-postadress...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Verifierar...</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && (error || successMessage) && (
          <div className="text-center pt-4">
            <Button
              onClick={() => router.push('/logga-in')}
              className="w-full"
              variant={error ? 'outline' : 'default'}
            >
              Gå till inloggning
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
