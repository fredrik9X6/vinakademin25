import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Instagram, Linkedin, Music2 } from 'lucide-react'

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
  { label: 'Om oss', href: '#' },
  { label: 'Kontakt', href: '#' },
  { label: 'Varumärke', href: '/styleguide' },
]

const resourcesLinks = [
  { label: 'Hjälp', href: '/hjalp' },
  { label: 'Användarvillkor', href: '/villkor' },
  { label: 'Integritetspolicy', href: '/integritetspolicy' },
  { label: 'Cookies', href: '/cookies' },
]

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 min-w-0 overflow-x-hidden">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Utforska Column */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Utforska</h3>
            <ul className="mt-4 space-y-3">
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
            <ul className="mt-4 space-y-3">
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
            <ul className="mt-4 space-y-3">
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
              <form className="flex gap-2 flex-col sm:flex-row min-w-0">
                <Input
                  type="email"
                  placeholder="Din e-postadress"
                  className="h-10 text-sm flex-1 min-w-0"
                />
                <Button type="submit" className="h-10" variant="secondary">
                  Prenumerera
                </Button>
              </form>
              <div className="mt-6 flex gap-4 flex-wrap">
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
