import { RequestPasswordResetForm } from '@/components/auth/RequestPasswordResetForm'
import { Sparkles } from 'lucide-react'
import React from 'react'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md">
            <Sparkles className="size-5 text-secondary" />
          </div>
          <span className="font-heading text-2xl">Vinakademin</span>
        </a>
        <RequestPasswordResetForm />
      </div>
    </div>
  )
}
