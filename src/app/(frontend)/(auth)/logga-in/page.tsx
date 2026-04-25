import Link from 'next/link'

import { LoginForm } from '@/components/login-form'

interface LoginPageProps {
  searchParams: Promise<{
    from?: string
    redirect?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams
  // Support both 'from' and 'redirect' parameters for flexibility
  const returnTo = resolvedSearchParams.from || resolvedSearchParams.redirect

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-brand-gradient font-heading text-3xl">
          Vinakademin
        </Link>
        <LoginForm returnTo={returnTo} />
      </div>
    </div>
  )
}
