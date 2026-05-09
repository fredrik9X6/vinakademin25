import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import JoinSessionDialog from '@/components/course/JoinSessionDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Users, XCircle } from 'lucide-react'
import { lookupSessionByCode, type LookupSessionResult } from '@/lib/sessions'
import { PausedWatcher } from './PausedWatcher'

export const metadata: Metadata = {
  title: 'Gå med i en vinprovning | Vinakademin',
  description: 'Anslut till en pågående grupprovning med koden från arrangören.',
  robots: { index: false, follow: false },
}

interface JoinPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { code: rawCode } = await searchParams
  const code = (rawCode || '').trim().toUpperCase()

  // No code → render the existing manual-entry dialog (today's UX).
  if (!code) {
    return (
      <PageShell>
        <JoinSessionDialog isOpen standalone initialCode="" />
      </PageShell>
    )
  }

  const payload = await getPayload({ config })
  const lookup = await lookupSessionByCode(payload, code)

  if (lookup.status === 'active') {
    return (
      <PageShell>
        <JoinSessionDialog isOpen standalone initialCode={code} />
      </PageShell>
    )
  }

  if (lookup.status === 'paused') {
    return (
      <PageShell>
        <PausedState lookup={lookup} code={code} />
      </PageShell>
    )
  }

  if (lookup.status === 'completed') {
    return (
      <PageShell>
        <EndedState
          icon={<XCircle className="h-6 w-6" />}
          heading="Sessionen är slut"
          body="Den här grupprovningen är avslutad. Vi har många fler."
          courseTitle={lookup.course?.title}
        />
      </PageShell>
    )
  }

  if (lookup.status === 'expired') {
    return (
      <PageShell>
        <EndedState
          icon={<Clock className="h-6 w-6" />}
          heading="Sessionen har gått ut"
          body="Tiden för att ansluta har löpt ut."
          courseTitle={lookup.course?.title}
        />
      </PageShell>
    )
  }

  if (lookup.status === 'full') {
    return (
      <PageShell>
        <FullState lookup={lookup} />
      </PageShell>
    )
  }

  // not_found
  return (
    <PageShell>
      <NotFoundState />
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-heading mb-4">Gå med i en vinprovning</h1>
        <p className="text-muted-foreground">
          Ange koden du fick från arrangören för att ansluta
        </p>
      </div>
      {children}
    </div>
  )
}

function StateCard({
  tone = 'default',
  icon,
  heading,
  courseTitle,
  children,
}: {
  tone?: 'default' | 'warning'
  icon: React.ReactNode
  heading: string
  courseTitle?: string
  children: React.ReactNode
}) {
  const toneCls =
    tone === 'warning'
      ? 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20'
      : 'border-border bg-background'
  return (
    <div className={`rounded-lg border ${toneCls} p-6 space-y-4`}>
      <div className="flex items-center gap-3 text-foreground">
        {icon}
        <h2 className="text-xl font-heading">{heading}</h2>
      </div>
      {courseTitle && (
        <p className="text-sm text-muted-foreground">
          Vinprovning: <span className="text-foreground">{courseTitle}</span>
        </p>
      )}
      {children}
    </div>
  )
}

function PausedState({ lookup, code }: { lookup: LookupSessionResult; code: string }) {
  return (
    <>
      <StateCard
        tone="warning"
        icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
        heading="Värden har pausat sessionen"
        courseTitle={lookup.course?.title}
      >
        <p className="text-sm text-muted-foreground">
          Du kan ansluta så snart värden återupptar. Vi kollar automatiskt.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Väntar på att sessionen ska återupptas…
        </div>
      </StateCard>
      <PausedWatcher code={code} />
    </>
  )
}

function EndedState({
  icon,
  heading,
  body,
  courseTitle,
}: {
  icon: React.ReactNode
  heading: string
  body: string
  courseTitle?: string
}) {
  return (
    <StateCard icon={icon} heading={heading} courseTitle={courseTitle}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild className="btn-brand">
        <Link href="/vinprovningar">Bläddra vinprovningar →</Link>
      </Button>
    </StateCard>
  )
}

function FullState({ lookup }: { lookup: LookupSessionResult }) {
  const count = lookup.participantCount ?? 0
  const max = lookup.maxParticipants ?? 0
  return (
    <StateCard
      icon={<Users className="h-6 w-6" />}
      heading="Sessionen är full"
      courseTitle={lookup.course?.title}
    >
      <p className="text-sm text-muted-foreground">
        {count} av {max} deltagare har redan anslutit.
      </p>
      <Button asChild className="btn-brand">
        <Link href="/vinprovningar">Bläddra vinprovningar →</Link>
      </Button>
    </StateCard>
  )
}

function NotFoundState() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Hittar ingen session med den koden</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Dubbelkolla koden från värden.</p>
        <Button asChild variant="outline">
          <Link href="/delta">Försök igen →</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
