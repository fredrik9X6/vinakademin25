'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Instagram, Linkedin, Music2, CheckCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/vinakademin.se/', label: 'Instagram' },
  { icon: Music2, href: 'https://www.tiktok.com/@vinakademin', label: 'TikTok' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/vinakademin', label: 'LinkedIn' },
]

const exploreLinks = [
  { label: 'Vinprovningar', href: '/vinprovningar' },
  { label: 'Artiklar', href: '/artiklar' },
  { label: 'Nyhetsbrev', href: '/nyhetsbrev' },
]

const aboutLinks = [
  { label: 'Om oss', href: '/om-oss' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'Varumärke', href: '/styleguide' },
]

const resourcesLinks = [
  { label: 'Hjälp', href: '/hjalp' },
  { label: 'Användarvillkor', href: '/villkor' },
  { label: 'Integritetspolicy', href: '/integritetspolicy' },
  { label: 'Cookies', href: '/cookies' },
]

function FooterNewsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

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
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-stretch min-w-0">
        <Input
          type="email"
          placeholder="Din e-postadress"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full min-w-0 text-base sm:h-10 sm:flex-1 sm:text-sm"
          disabled={status === 'loading'}
        />
        <Button type="submit" className="h-12 w-full sm:h-10 sm:w-auto" variant="secondary" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Prenumerera'}
        </Button>
      </form>
      {status === 'error' && message && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 min-w-0 overflow-x-hidden">
        <div className="grid grid-cols-1 items-center gap-8 text-center sm:grid-cols-2 sm:items-start sm:text-left lg:grid-cols-5">
          {/* Utforska Column */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Utforska</h3>
            <ul className="mt-4 flex flex-col items-center space-y-3 sm:items-start">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Om Vinakademin Column */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Om Vinakademin</h3>
            <ul className="mt-4 flex flex-col items-center space-y-3 sm:items-start">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resurser Column */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Resurser</h3>
            <ul className="mt-4 flex flex-col items-center space-y-3 sm:items-start">
              {resourcesLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Social Column */}
          <div className="min-w-0 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">Följ oss & Nyhetsbrev</h3>
            <div className="mt-4">
              <FooterNewsletter />
              <div className="mt-6 flex flex-wrap justify-center gap-4 sm:justify-start">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      aria-label={social.label}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legal Section */}
        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Vinakademin. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-4">
              <Link
                href="/villkor"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Användarvillkor
              </Link>
              <Link
                href="/integritetspolicy"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Integritetspolicy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
