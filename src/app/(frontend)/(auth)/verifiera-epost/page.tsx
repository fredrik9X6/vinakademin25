'use client' // Mark this page as a Client Component

// Need Suspense for reading search parameters
import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { EmailVerificationHandler } from '@/components/auth/EmailVerificationHandler'
import Link from 'next/link'

// Client component to read search params and pass token to the handler
// Since the whole page is client now, this separation isn't strictly necessary, but fine to keep
function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return <EmailVerificationHandler token={token ?? ''} />
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-brand-gradient font-heading text-3xl">
          Vinakademin
        </Link>
        <Suspense fallback={<div className="text-center p-4">Verifierar...</div>}>
          <VerifyEmailClient />
        </Suspense>
      </div>
    </div>
  )
}
