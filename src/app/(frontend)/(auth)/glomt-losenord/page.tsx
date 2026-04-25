import { RequestPasswordResetForm } from '@/components/auth/RequestPasswordResetForm'
import React from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-brand-gradient font-heading text-3xl">
          Vinakademin
        </Link>
        <RequestPasswordResetForm />
      </div>
    </div>
  )
}
