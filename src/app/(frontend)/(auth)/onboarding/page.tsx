import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

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

  console.log('[onboarding_funnel] onboarding_started', {
    userId: user.id,
    source,
  })

  return (
    <div className="min-h-svh bg-muted flex items-center justify-center p-6">
      <OnboardingWizard source={source} nextPath={nextPath} />
    </div>
  )
}
