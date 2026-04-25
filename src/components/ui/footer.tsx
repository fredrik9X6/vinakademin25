'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Instagram, Linkedin, Music2, Check, Loader2, ArrowRight } from 'lucide-react'

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/vinakademin.se/', label: 'Instagram' },
  { icon: Music2, href: 'https://www.tiktok.com/@vinakademin', label: 'TikTok' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/vinakademin', label: 'LinkedIn' },
]

const exploreLinks = [
  { label: 'Vinprovningar', href: '/vinprovningar' },
  { label: 'Vinkompass', href: '/vinkompass' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
]

const aboutLinks = [
  { label: 'Om oss', href: '/om-oss' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'Designsystem', href: '/styleguide' },
]

const supportLinks = [
  { label: 'Hjälp', href: '/hjalp' },
  { label: 'Användarvillkor', href: '/villkor' },
  { label: 'Integritetspolicy', href: '/integritetspolicy' },
  { label: 'Cookies', href: '/cookies' },
]

function FooterNewsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Ange en giltig e-postadress.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage('Tack! Du prenumererar nu på vårt nyhetsbrev.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Något gick fel. Försök igen.')
      }
    } catch {
      setStatus('error')
      setMessage('Något gick fel. Försök igen.')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-[#16a34a] dark:text-[#4ade80]">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <input
          type="email"
          placeholder="din@e-post.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-brand-400/60 focus:ring-1 focus:ring-brand-400/40 disabled:opacity-50"
          disabled={status === 'loading'}
          aria-label="E-postadress"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === 'loading'}
          className="btn-brand h-10 w-full px-4 text-sm sm:w-auto sm:flex-shrink-0"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Prenumerera
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
      {status === 'error' && message && (
        <p className="mt-2 text-xs text-[#dc2626] dark:text-[#f87171]">{message}</p>
      )}
      {status !== 'error' && (
        <p className="mt-2 text-xs text-muted-foreground">Vi skickar aldrig spam.</p>
      )}
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ label: string; href: string }>
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      {/* Soft brand-tint blob — signature decorative pattern. Footer is
       * overflow-hidden so the blur halo doesn't trigger horizontal scroll
       * on narrow viewports. */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
        aria-hidden
        style={{ background: 'hsl(var(--brand-300))', opacity: 0.05 }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand column — spans 2 on lg */}
          <div className="space-y-6 lg:col-span-2">
            <Link
              href="/"
              aria-label="Vinakademin — startsida"
              className="text-brand-gradient inline-block font-heading text-3xl leading-none sm:text-4xl"
            >
              Vinakademin
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Vi gör vinkunskap enkelt &amp; opretentiöst. Guidade provningar hemma, med vänner,
              när det passar dig.
            </p>

            {/* Newsletter — sits under the brand statement */}
            <div className="max-w-md">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Nyhetsbrev
              </div>
              <FooterNewsletter />
            </div>

            {/* Social */}
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-brand-300/15 hover:text-brand-400"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Link columns — 1 col each */}
          <FooterColumn title="Utforska" links={exploreLinks} />
          <FooterColumn title="Om oss" links={aboutLinks} />
          <FooterColumn title="Support" links={supportLinks} />
        </div>

        {/* Bottom strip */}
        <div className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Vinakademin AB. Alla rättigheter förbehållna.</span>
          <span>Med kärlek från Stockholm.</span>
        </div>
      </div>
    </footer>
  )
}
