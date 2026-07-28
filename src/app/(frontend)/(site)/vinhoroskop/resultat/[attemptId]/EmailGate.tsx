'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'

interface Props {
  attemptId: string
  archetypeKey: string
}

export function EmailGate({ attemptId, archetypeKey }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/vinkompassen/attempts/${attemptId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Något gick fel')
      }
      posthog?.capture?.('vinkompass_email_submitted', { archetype: archetypeKey })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-brand-400 bg-card p-7 shadow-sm"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-400">
        Lås upp listan
      </span>
      <h2 className="mt-3 font-heading text-3xl leading-[1.1] tracking-[-0.015em]">
        Se dina 6 viner direkt här
      </h2>
      {/* The old copy said "vi skickar dem direkt" while the button said "visa"
          — and the actual mechanic is an instant on-page reveal. Readers who
          parsed it as "we will email you later" had no reason to act, which is
          the likeliest cause of 0/2 in user testing. State the mechanic first
          (they appear here, now), and the email as the bonus it actually is. */}
      <p className="mt-2 text-muted-foreground">
        Skriv in din e-post så låses hela listan upp på den här sidan direkt. Vi mailar den också,
        så att du har den i mobilen när du står i butiken.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.se"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base"
          disabled={submitting}
        />
        <Button type="submit" disabled={submitting} className="bg-brand-400 text-white">
          {submitting ? 'Låser upp...' : 'Visa mina 6 viner'}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Vi delar aldrig din e-post. Avregistrera dig när som helst.
      </p>
    </form>
  )
}
