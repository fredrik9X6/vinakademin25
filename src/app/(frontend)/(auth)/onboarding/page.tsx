import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('(frontend)-(auth)-onboarding-page')

interface OnboardingPageProps {
  searchParams: Promise<{
    next?: string
    source?: string
  }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const nextPath = params.next ? decodeURIComponent(params.next) : '/mina-provningar'
  const source = params.source === 'guest_checkout' ? 'guest_checkout' : 'registration'

  const user = await getUser()
  if (!user?.id) {
    redirect(`/logga-in?from=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(nextPath)}`)}`)
  }

  const onboarding = (user as any).onboarding
  if (onboarding?.completedAt || onboarding?.skippedAt) {
    redirect(nextPath)
  }

  log.info('[onboarding_funnel] onboarding_started', {
    userId: user.id,
    source,
  })

  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-br from-brand-300/10 via-background to-background flex items-center justify-center p-4 sm:p-6">
      {/* Soft brand blob backdrop — pure decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl"
      />
      <div className="relative z-10 w-full">
        <OnboardingWizard source={source} nextPath={nextPath} />
      </div>
    </div>
  )
}
