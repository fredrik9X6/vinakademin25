'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const ORANGE_400 = '#FB914C'
const ORANGE_300 = '#FDBA75'
const GRADIENT = `linear-gradient(90deg, ${ORANGE_400}, ${ORANGE_300})`

interface EbookSignupFormProps {
  /** Slug used to mark this lead magnet in subscriber tags + redirect path. */
  slug: string
  /** Where to redirect on success — defaults to `/${slug}/tack`. */
  redirectTo?: string
  /** Inverted color scheme for use on dark/colored panels. */
  variant?: 'on-paper' | 'on-dark'
  buttonLabel?: string
  placeholder?: string
  disclaimer?: string
}

export function EbookSignupForm({
  slug,
  redirectTo,
  variant = 'on-paper',
  buttonLabel = 'Skicka mig e-boken',
  placeholder = 'Din e-postadress',
  disclaimer = 'Gratis. Avsluta när du vill.',
}: EbookSignupFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isDark = variant === 'on-dark'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Ange en giltig e-postadress')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter_page',
          tags: ['lead_magnet', `ebook:${slug}`],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 409) {
        throw new Error(data?.error || 'Något gick fel. Försök igen.')
      }
      const target = redirectTo || `/${slug}/tack`
      router.push(target)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Något gick fel.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div
        className={[
          // Mobile: stacked, use a softer radius so children's pill ends fit inside.
          // sm+: single horizontal pill, rounded-full looks correct because the row
          // is wide and short.
          'flex flex-col gap-2 rounded-3xl p-1 sm:flex-row sm:items-center sm:gap-1 sm:rounded-full',
          isDark
            ? 'border border-white/10 bg-white/5 backdrop-blur'
            : 'border border-[#e9e1d3] bg-white shadow-sm',
        ].join(' ')}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          disabled={submitting}
          className={[
            'min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-[15px] outline-none placeholder:text-muted-foreground/70',
            isDark ? 'text-white placeholder:text-white/50' : 'text-[#1a1714]',
          ].join(' ')}
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={submitting}
          className="group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium text-[#1a0f06] transition-transform disabled:opacity-70"
          style={{
            background: GRADIENT,
            boxShadow: '0 10px 25px -5px rgba(251,145,76,0.35)',
          }}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {buttonLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
      {disclaimer && (
        <p
          className={[
            'mt-3 text-center text-[12px] sm:text-left',
            isDark ? 'text-white/60' : 'text-muted-foreground',
          ].join(' ')}
        >
          {disclaimer}
        </p>
      )}
    </form>
  )
}
