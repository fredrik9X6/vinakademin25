import Link from 'next/link'
import { RequestPasswordResetForm } from '@/components/auth/RequestPasswordResetForm'

interface ActivateAccountPageProps {
  searchParams: Promise<{
    email?: string
    next?: string
  }>
}

export default async function ActivateAccountPage({ searchParams }: ActivateAccountPageProps) {
  const params = await searchParams
  const email = params.email ? decodeURIComponent(params.email) : ''
  const next = params.next ? decodeURIComponent(params.next) : '/mina-provningar'
  const loginHref = `/logga-in?from=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}&source=guest_checkout`)}`

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center text-brand-gradient font-heading text-3xl">
          Vinakademin
        </Link>

        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Vi har skickat ett kvitto till din e-post. Fyll i din e-postadress nedan så skickar vi en
          säker länk där du kan välja lösenord och aktivera ditt konto.
        </div>

        <RequestPasswordResetForm initialEmail={email} loginHref={loginHref} />
      </div>
    </div>
  )
}
