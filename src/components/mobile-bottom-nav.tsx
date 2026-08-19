'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Wine,
  Newspaper,
  User,
  List,
  Users,
  History,
  Star,
  Settings,
  LogIn,
  LogOut,
  UserCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  Sun,
  Moon,
  Wrench,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'

interface PrimaryTab {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  matchExact?: boolean
}

/**
 * The two products get the two product tabs. Vinlistan and Artiklar moved to
 * the drawer's Utforska list — both are secondary, and Vinprovningar was
 * previously two taps deep on mobile (drawer → Utforska) while being a primary
 * nav item on desktop. Most of the traffic that arrives looking for it is
 * mobile (Instagram/TikTok), so that asymmetry cost the most on the surface
 * where it mattered most.
 *
 * Icons: Vinkvällen takes GraduationCap and Provningar takes Wine, rather
 * than Wine + something wine-adjacent. A glass reads as "a tasting" and a cap
 * reads as "a course"; two similar wine glyphs side by side would not.
 */
const PRIMARY_TABS: PrimaryTab[] = [
  { label: 'Hem', href: '/', icon: Home, matchExact: true },
  { label: 'Vinkvällen', href: '/vinkurser', icon: GraduationCap },
  { label: 'Provningar', href: '/provningsmallar', icon: Wine },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, logoutUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    // Close the drawer on navigation
    setOpen(false)
  }, [pathname])

  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : ''
  const avatarUrl =
    user && typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined
  const fallbackInitial = userName ? userName.charAt(0).toUpperCase() : 'U'
  const profilePublic = user ? (user as any).profilePublic !== false : false

  const isMineActive = pathname === '/mina-sidor' || pathname.startsWith('/mina-sidor/')

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around px-2">
          {PRIMARY_TABS.map((tab) => {
            const isActive = tab.matchExact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(tab.href + '/')

            const Icon = tab.icon

            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 rounded-md transition-colors ${
                  isActive ? 'text-brand-400' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </Link>
            )
          })}

          {/* "Min sida" — opens the drawer with all nav + account items */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 rounded-md transition-colors ${
              open || isMineActive ? 'text-brand-400' : 'text-muted-foreground'
            }`}
            aria-label="Min sida — öppna meny"
          >
            {user ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-brand-300/15 text-[10px] font-medium text-brand-400">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-5 w-5" strokeWidth={open || isMineActive ? 2.5 : 2} />
            )}
            <span className="text-[10px] font-medium leading-none">Min sida</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* pb: env(safe-area-inset-bottom) alone resolves to 0 on any device
            without a home indicator (and in desktop emulation), which left
            "Logga ut" flush against the sheet's bottom edge. Reserve real
            padding and let the inset add to it where it applies. */}
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-h-[88vh] overflow-y-auto"
        >
          <SheetTitle className="sr-only">Min sida</SheetTitle>

          {/* Header: user identity OR login prompt */}
          {user ? (
            <Link
              href="/mina-sidor"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-brand-300/15 text-base font-medium text-brand-400">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight truncate">{userName}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">{user.email}</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Min sida
              </span>
            </Link>
          ) : (
            <Link
              href={`/logga-in?from=${encodeURIComponent(pathname)}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-300/15 text-brand-400">
                <LogIn className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Logga in</p>
                <p className="text-xs text-muted-foreground">Skapa ett konto eller logga in</p>
              </div>
            </Link>
          )}

          {/* Mitt konto — only for logged-in users */}
          {user && (
            <div className="mt-5 space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Mitt konto
              </p>
              <ul className="rounded-lg border border-border bg-card overflow-hidden">
                {user.handle && profilePublic && (
                  <DrawerLink
                    href={`/profil/${user.handle}`}
                    icon={UserCircle}
                    label="Visa min profil"
                    onClose={() => setOpen(false)}
                  />
                )}
                <DrawerLink
                  href="/mina-recensioner"
                  icon={Star}
                  label="Mina recensioner"
                  onClose={() => setOpen(false)}
                />
                <DrawerLink
                  href="/vinklubbar"
                  icon={Users}
                  label="Mina vinklubbar"
                  onClose={() => setOpen(false)}
                />
                <DrawerLink
                  href="/mina-provningar/historik"
                  icon={History}
                  label="Historik"
                  onClose={() => setOpen(false)}
                  last
                />
              </ul>
            </div>
          )}

          {/* Utforska — the full section index. Vinkurser and Vinprovningar
              are repeated from the tab bar on purpose: this list is what a
              user opens when the tabs did not have what they wanted, so a
              complete index beats a minimal one. Vinlistan and Artiklar live
              ONLY here now, so dropping either would strand a whole section
              on mobile. */}
          <div className="mt-5 space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Utforska
            </p>
            <ul className="rounded-lg border border-border bg-card overflow-hidden">
              <DrawerLink
                href="/vinkurser"
                icon={GraduationCap}
                label="Vinkvällen"
                onClose={() => setOpen(false)}
              />
              <DrawerLink
                href="/provningsverktyget"
                icon={Wrench}
                label="Provningsverktyget"
                onClose={() => setOpen(false)}
              />
              <DrawerLink
                href="/provningsmallar"
                icon={Wine}
                label="Vinprovningar"
                onClose={() => setOpen(false)}
              />
              <DrawerLink
                href="/vinlistan"
                icon={List}
                label="Vinlistan"
                onClose={() => setOpen(false)}
              />
              <DrawerLink
                href="/artiklar"
                icon={Newspaper}
                label="Artiklar"
                onClose={() => setOpen(false)}
              />
              <DrawerLink
                href="/vinhoroskop"
                icon={Sparkles}
                label="Vinhoroskop"
                onClose={() => setOpen(false)}
              />
              {/* /grunderna-i-vin is the site's single biggest acquisition
                  surface — 394 people and 584 external referrals in 90 days,
                  more than the tastings gallery and the legacy tastings URL
                  combined — and it was reachable from no navigation at all. */}
              <DrawerLink
                href="/grunderna-i-vin"
                icon={BookOpen}
                label="Gratis e-bok"
                onClose={() => setOpen(false)}
                last
              />
            </ul>
          </div>

          {/* Inställningar */}
          <div className="mt-5 space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Inställningar
            </p>
            <ul className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
              {user && (
                <DrawerLink
                  href="/profil?tab=uppgifter"
                  icon={Settings}
                  label="Konto"
                  onClose={() => setOpen(false)}
                />
              )}

              {/* Theme toggle */}
              <li className="flex items-center gap-3 px-4 py-3">
                {mounted && theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 text-sm">Mörkt tema</span>
                {mounted && (
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    aria-label="Växla tema"
                    className="data-[state=checked]:bg-brand-400"
                  />
                )}
              </li>

              {user && (
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false)
                      await logoutUser()
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">Logga ut</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function DrawerLink({
  href,
  icon: Icon,
  label,
  onClose,
  last,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClose: () => void
  last?: boolean
}) {
  return (
    <li className={last ? '' : 'border-b border-border'}>
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  )
}
