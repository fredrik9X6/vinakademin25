import React from 'react'
import { VerifyEmailMessage } from '@/components/auth/VerifyEmailMessage'
import Link from 'next/link'

export default function VerifyEmailInfoPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-brand-gradient font-heading text-3xl">
          Vinakademin
        </Link>
        <VerifyEmailMessage />
      </div>
    </div>
  )
}
